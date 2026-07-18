import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'

const router = Router()
router.use(authenticate)

const smsSchema = z.object({
  toNumber: z.string().min(1),
  body: z.string().min(1).max(1600),
  contactId: z.string().optional(),
})

router.post('/send', async (req, res) => {
  try {
    const data = smsSchema.parse(req.body)
    const fromNumber = `ext-${req.user!.id.slice(-4)}`

    let resolvedContactId = data.contactId || null
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, teamId: req.user!.teamId, deletedAt: null },
      })
      if (!contact) {
        return res.status(400).json({ error: 'INVALID_CONTACT' })
      }
      resolvedContactId = contact.id
    }

    const sms = await prisma.sms.create({
      data: {
        toNumber: data.toNumber,
        fromNumber,
        body: data.body,
        status: 'SENDING',
        agentId: req.user!.id,
        contactId: resolvedContactId,
        teamId: req.user!.teamId,
      },
    })

    // Simulate sending delay (200-800ms), then mark as SENT
    const delay = 200 + Math.random() * 600
    const shouldFail = Math.random() < 0.05 // 5% failure rate

    setTimeout(async () => {
      try {
        await prisma.sms.update({
          where: { id: sms.id },
          data: { status: shouldFail ? 'FAILED' : 'SENT' },
        })

        // Create notification on success
        if (!shouldFail) {
          await prisma.notification.create({
            data: {
              userId: req.user!.id,
              type: 'SMS_SENT',
              title: 'SMS envoyé',
              body: `SMS envoyé à ${data.toNumber}`,
              link: resolvedContactId ? `/contacts/${resolvedContactId}` : undefined,
              teamId: req.user!.teamId,
            },
          })
        }
      } catch {}
    }, delay)

    return res.status(201).json({ sms: { ...sms, status: 'SENDING' } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Send SMS error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.post('/draft', async (req, res) => {
  try {
    const data = smsSchema.parse(req.body)
    const fromNumber = `ext-${req.user!.id.slice(-4)}`

    let resolvedContactId = data.contactId || null
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, teamId: req.user!.teamId, deletedAt: null },
      })
      if (!contact) {
        return res.status(400).json({ error: 'INVALID_CONTACT' })
      }
      resolvedContactId = contact.id
    }

    const sms = await prisma.sms.create({
      data: {
        toNumber: data.toNumber,
        fromNumber,
        body: data.body,
        status: 'DRAFT',
        agentId: req.user!.id,
        contactId: resolvedContactId,
        teamId: req.user!.teamId,
      },
    })

    return res.status(201).json({ sms })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Draft SMS error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/', async (req, res) => {
  try {
    const { status, contactId, page = '1', pageSize = '20' } = req.query as Record<string, string>
    const p = Math.max(1, parseInt(page))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)))

    const where: any = { teamId: req.user!.teamId }

    if (status) {
      where.status = status
    }

    if (contactId) {
      where.contactId = contactId
    }

    // Agents only see their own SMS
    if (req.user!.role === 'AGENT') {
      where.agentId = req.user!.id
    }

    const [smsList, total] = await Promise.all([
      prisma.sms.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      prisma.sms.count({ where }),
    ])

    return res.json({ sms: smsList, total, page: p, pageSize: ps })
  } catch (error) {
    console.error('List SMS error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/conversations', async (req, res) => {
  try {
    const where: any = { teamId: req.user!.teamId, status: { notIn: ['DRAFT'] } }

    if (req.user!.role === 'AGENT') {
      where.agentId = req.user!.id
    }

    const allSms = await prisma.sms.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const convMap = new Map<string, {
      contactId: string | null
      contactName: string | null
      contactPhone: string | null
      phoneNumber: string
      lastMessage: string
      lastAt: Date
      unread: number
      messageCount: number
      agents: string[]
    }>()

    for (const sms of allSms) {
      const key = sms.contactId || sms.toNumber
      const existing = convMap.get(key)
      const agentLabel = sms.agent?.name || 'Inconnu'

      if (!existing) {
        convMap.set(key, {
          contactId: sms.contactId,
          contactName: sms.contact?.name || null,
          contactPhone: sms.contact?.phone || null,
          phoneNumber: sms.toNumber,
          lastMessage: sms.body,
          lastAt: sms.createdAt,
          unread: 0,
          messageCount: 1,
          agents: [agentLabel],
        })
      } else {
        existing.messageCount++
        if (!existing.agents.includes(agentLabel)) {
          existing.agents.push(agentLabel)
        }
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())

    return res.json({ conversations })
  } catch (error) {
    console.error('List conversations error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/conversation/:contactIdOrPhone', async (req, res) => {
  try {
    const { contactIdOrPhone } = req.params
    const { page = '1', pageSize = '50' } = req.query as Record<string, string>
    const p = Math.max(1, parseInt(page))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)))

    const where: any = { teamId: req.user!.teamId, status: { notIn: ['DRAFT'] } }

    if (contactIdOrPhone.startsWith('cnt_') || contactIdOrPhone.length > 10) {
      where.contactId = contactIdOrPhone
    } else {
      where.OR = [
        { toNumber: contactIdOrPhone },
        { fromNumber: contactIdOrPhone },
      ]
    }

    if (req.user!.role === 'AGENT') {
      where.agentId = req.user!.id
    }

    const [messages, total] = await Promise.all([
      prisma.sms.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      prisma.sms.count({ where }),
    ])

    return res.json({ messages, total, page: p, pageSize: ps })
  } catch (error) {
    console.error('Get conversation error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const sms = await prisma.sms.findUnique({
      where: { id: req.params.id },
      include: {
        contact: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    if (!sms || sms.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && sms.agentId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    return res.json(sms)
  } catch (error) {
    console.error('Get SMS error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const sms = await prisma.sms.findUnique({ where: { id: req.params.id } })

    if (!sms || sms.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    if (req.user!.role === 'AGENT' && sms.agentId !== req.user!.id) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    await prisma.sms.delete({ where: { id: req.params.id } })
    return res.json({ action: 'deleted' })
  } catch (error) {
    console.error('Delete SMS error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
