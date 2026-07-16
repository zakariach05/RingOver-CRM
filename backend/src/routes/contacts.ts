import { Router } from 'express'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const internationalPhone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .refine((value) => /^\+[1-9]\d{6,14}$/.test(value), {
    message: 'Le téléphone doit être au format international (ex. +33612345678).',
  })

const contactSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: internationalPhone,
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

router.post('/', async (req, res) => {
  try {
    const data = contactSchema.parse(req.body)
    const teamId = req.user!.teamId

    const duplicate = await prisma.contact.findFirst({
      where: { teamId, phone: data.phone, deletedAt: null },
    })

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        company: data.company || null,
        phone: data.phone,
        email: data.email || null,
        tags: JSON.stringify(data.tags || []),
        notes: data.notes || null,
        ownerId: req.user!.id,
        teamId,
      },
    })

    return res.status(201).json({
      contact,
      ...(duplicate ? { warning: 'DUPLICATE_PHONE', duplicateName: duplicate.name } : {}),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Create contact error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/', async (req, res) => {
  try {
    const teamId = req.user!.teamId
    const { q, tags, ownerId, page = '1', pageSize = '25' } = req.query
    const pageNum = Math.max(1, parseInt(page as string))
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string)))
    const skip = (pageNum - 1) * size

    const where: any = { teamId, deletedAt: null }

    if (q && (q as string).length >= 2) {
      const search = q as string
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (ownerId) {
      where.ownerId = ownerId as string
    }

    if (tags) {
      const tagList = (tags as string).split(',')
      where.tags = { contains: tagList[0] }
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { owner: { select: { id: true, name: true } } },
        skip,
        take: size,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ])

    return res.json({ contacts, total, page: pageNum, pageSize: size })
  } catch (error) {
    console.error('Get contacts error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, teamId: req.user!.teamId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    })
    if (!contact) {
      return res.status(404).json({ error: 'CONTACT_NOT_FOUND' })
    }
    return res.json(contact)
  } catch (error) {
    console.error('Get contact error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const data = contactSchema.partial().parse(req.body)
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, teamId: req.user!.teamId, deletedAt: null },
    })
    if (!contact) {
      return res.status(404).json({ error: 'CONTACT_NOT_FOUND' })
    }

    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.company !== undefined && { company: data.company || null }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    })
    return res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Update contact error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, teamId: req.user!.teamId, deletedAt: null },
    })
    if (!contact) {
      return res.status(404).json({ error: 'CONTACT_NOT_FOUND' })
    }

    await prisma.contact.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    })
    return res.json({ action: 'deleted' })
  } catch (error) {
    console.error('Delete contact error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/:id/owner', async (req, res) => {
  try {
    const { ownerId } = req.body
    if (ownerId) {
      const ownerExists = await prisma.user.findFirst({
        where: { id: ownerId, teamId: req.user!.teamId },
      })
      if (!ownerExists) {
        return res.status(400).json({ error: 'INVALID_OWNER' })
      }
    }

    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: { ownerId: ownerId || null },
    })
    return res.json(updated)
  } catch (error) {
    console.error('Update owner error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
