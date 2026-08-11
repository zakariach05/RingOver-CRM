import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'
import { invalidateTeam } from '../services/dashboardCache'

const router = Router()

const MOCK_TWILIO = process.env.TWILIO_ENABLED !== 'true'
const CALL_TIMEOUT_MS = 8000

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, direction, dateFrom, dateTo, q, page = '1', pageSize = '20', scope } = req.query as Record<string, string>
    const p = Math.max(1, parseInt(page))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)))
    const where: any = { teamId: req.user!.teamId }

    if (status) {
      where.status = status
    }

    if (direction) {
      where.direction = direction
    }

    if (dateFrom || dateTo) {
      where.startedAt = {}
      if (dateFrom) where.startedAt.gte = new Date(dateFrom)
      if (dateTo) where.startedAt.lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    if (q && q.length >= 2) {
      where.OR = [
        { toNumber: { contains: q } },
        { fromNumber: { contains: q } },
        { contact: { name: { contains: q } } },
      ]
    }

    if (scope === 'team' && ['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      // show all team calls
    } else if (req.user!.role === 'AGENT') {
      where.agentId = req.user!.id
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phone: true, email: true } },
          agent: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      prisma.call.count({ where }),
    ])

    return res.json({ calls, total, page: p, pageSize: ps })
  } catch (error) {
    console.error('List calls error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const call = await prisma.call.findUnique({
      where: { id: req.params.id },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    if (!call || call.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && call.agentId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    return res.json(call)
  } catch (error) {
    console.error('Get call error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { toNumber, contactId } = req.body as { toNumber?: string; contactId?: string }
    if (!toNumber) {
      return res.status(400).json({ error: 'TO_NUMBER_REQUIRED' })
    }

    // Clean up any stuck calls to prevent blocking the agent
    await prisma.call.updateMany({
      where: {
        agentId: req.user!.id,
        status: { in: ['INITIATED', 'RINGING', 'ANSWERED'] },
      },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    })

    let resolvedContactId = contactId || null
    if (contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } })
      if (!contact || contact.teamId !== req.user!.teamId) {
        return res.status(400).json({ error: 'INVALID_CONTACT' })
      }
      resolvedContactId = contact.id
    }

    const fromNumber = `ext-${req.user!.id.slice(-4)}`
    const call = await prisma.call.create({
      data: {
        fromNumber,
        toNumber,
        direction: 'OUTBOUND',
        status: 'INITIATED',
        agentId: req.user!.id,
        contactId: resolvedContactId,
        teamId: req.user!.teamId,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    if (MOCK_TWILIO) {
      setTimeout(async () => {
        try {
          await prisma.call.update({ where: { id: call.id }, data: { status: 'RINGING' } })
          invalidateTeam(req.user!.teamId)
        } catch {}
      }, 1000)
      setTimeout(async () => {
        try {
          await prisma.call.update({ where: { id: call.id }, data: { status: 'ANSWERED' } })
          invalidateTeam(req.user!.teamId)
        } catch {}
      }, 3000)
    }

    invalidateTeam(req.user!.teamId)
    return res.status(201).json({ call })
  } catch (error) {
    console.error('Initiate call error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/:id/hangup', authenticate, async (req, res) => {
  try {
    const call = await prisma.call.findUnique({ where: { id: req.params.id } })
    if (!call || call.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && call.agentId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    const now = new Date()
    const duration = call.startedAt
      ? Math.floor((now.getTime() - call.startedAt.getTime()) / 1000)
      : 0

    const updated = await prisma.call.update({
      where: { id: req.params.id },
      data: { status: 'ENDED', endedAt: now, duration },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    return res.json(updated)
  } catch (error) {
    console.error('Hangup call error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { note, contactId } = req.body as { note?: string; contactId?: string }

    const call = await prisma.call.findUnique({ where: { id: req.params.id } })
    if (!call || call.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && call.agentId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    const updateData: any = {}
    if (note !== undefined) updateData.note = note
    if (contactId !== undefined) {
      if (contactId) {
        const contact = await prisma.contact.findUnique({ where: { id: contactId } })
        if (!contact || contact.teamId !== req.user!.teamId) {
          return res.status(400).json({ error: 'INVALID_CONTACT' })
        }
      }
      updateData.contactId = contactId || null
    }

    const updated = await prisma.call.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    return res.json(updated)
  } catch (error) {
    console.error('Update call error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
