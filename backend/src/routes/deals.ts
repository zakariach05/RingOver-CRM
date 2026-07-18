import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, requireRole } from '../types'
import { invalidateTeam } from '../services/dashboardCache'

const router = Router()

const VALID_STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const CLOSED_STAGES = ['WON', 'LOST']

const createDealSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0),
  stage: z.string().optional(),
  contactId: z.string().min(1, 'Le contact est obligatoire'),
})

const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  stage: z.string().optional(),
  contactId: z.string().min(1).optional(),
})

router.get('/', authenticate, async (req, res) => {
  try {
    const { scope, stage, page = '1', pageSize = '50' } = req.query as Record<string, string>
    const p = Math.max(1, parseInt(page))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)))
    const where: any = { teamId: req.user!.teamId }

    if (stage) {
      where.stage = stage
    } else if (scope === 'open') {
      where.stage = { notIn: CLOSED_STAGES }
    } else if (scope === 'closed') {
      where.stage = { in: CLOSED_STAGES }
    }

    if (req.user!.role === 'AGENT') {
      where.ownerId = req.user!.id
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phone: true, email: true, company: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      prisma.deal.count({ where }),
    ])

    return res.json({ deals, total, page: p, pageSize: ps })
  } catch (error) {
    console.error('List deals error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    if (!deal || deal.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && deal.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    return res.json(deal)
  } catch (error) {
    console.error('Get deal error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const data = createDealSchema.parse(req.body)

    if (!VALID_STAGES.includes(data.stage || 'LEAD')) {
      return res.status(400).json({ error: 'INVALID_STAGE' })
    }

    let resolvedContactId: string | null = null
    if (data.contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: data.contactId } })
      if (!contact || contact.teamId !== req.user!.teamId) {
        return res.status(400).json({ error: 'INVALID_CONTACT' })
      }
      resolvedContactId = contact.id
    }

    // contactId is required for creation
    if (!resolvedContactId) {
      return res.status(400).json({ error: 'CONTACT_REQUIRED' })
    }

    if (req.user!.role === 'AGENT' && data.stage && CLOSED_STAGES.includes(data.stage)) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    const deal = await prisma.deal.create({
      data: {
        title: data.title,
        value: data.value,
        stage: data.stage || 'LEAD',
        contactId: resolvedContactId,
        ownerId: req.user!.id,
        teamId: req.user!.teamId,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    invalidateTeam(req.user!.teamId)
    return res.status(201).json({ deal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Create deal error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.put('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && existing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    const data = updateDealSchema.parse(req.body)

    if (data.stage && !VALID_STAGES.includes(data.stage)) {
      return res.status(400).json({ error: 'INVALID_STAGE' })
    }

    if (req.user!.role === 'AGENT') {
      if (data.stage && CLOSED_STAGES.includes(data.stage)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      if (!data.stage && CLOSED_STAGES.includes(existing.stage)) {
        return res.status(403).json({ error: 'CANNOT_EDIT_CLOSED_DEAL' })
      }
    }

    const updateData: any = { ...data }
    if (data.stage && CLOSED_STAGES.includes(data.stage) && !existing.closedAt) {
      updateData.closedAt = new Date()
    }

    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    invalidateTeam(req.user!.teamId)
    return res.json(deal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Update deal error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/:id/stage', authenticate, async (req, res) => {
  try {
    const { stage } = req.body
    if (!stage || !VALID_STAGES.includes(stage)) {
      return res.status(400).json({ error: 'INVALID_STAGE' })
    }

    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && existing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    const isClosed = CLOSED_STAGES.includes(existing.stage)
    const isTargetClosed = CLOSED_STAGES.includes(stage)
    const isReopening = isClosed && !isTargetClosed

    if (req.user!.role === 'AGENT') {
      if (isClosed && !isReopening) {
        return res.status(403).json({ error: 'CANNOT_MODIFY_CLOSED_DEAL' })
      }
      if (!isClosed && isTargetClosed) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
    }

    const updateData: any = { stage }
    if (isTargetClosed && !existing.closedAt) {
      updateData.closedAt = new Date()
    } else if (isReopening) {
      updateData.closedAt = null
    }

    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    invalidateTeam(req.user!.teamId)
    return res.json(deal)
  } catch (error) {
    console.error('Update deal stage error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/:id/owner', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { ownerId } = req.body
    if (!ownerId) {
      return res.status(400).json({ error: 'OWNER_ID_REQUIRED' })
    }

    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: { ownerId },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    invalidateTeam(req.user!.teamId)
    return res.json(deal)
  } catch (error) {
    console.error('Reassign deal error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT') {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    await prisma.deal.delete({ where: { id: req.params.id } })
    invalidateTeam(req.user!.teamId)
    return res.status(204).send()
  } catch (error) {
    console.error('Delete deal error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
