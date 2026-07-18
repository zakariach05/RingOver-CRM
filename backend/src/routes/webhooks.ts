import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

router.post('/call-status', async (req, res) => {
  try {
    if (WEBHOOK_SECRET) {
      const secret = req.headers['x-webhook-secret']
      if (secret !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'INVALID_WEBHOOK_SECRET' })
      }
    }

    const { CallSid, CallStatus, CallDuration } = req.body as {
      CallSid?: string
      CallStatus?: string
      CallDuration?: string
    }

    if (!CallSid) {
      return res.status(400).json({ error: 'MISSING_CALL_SID' })
    }

    const call = await prisma.call.findFirst({ where: { twilioCallSid: CallSid } })
    if (!call) {
      return res.status(404).json({ error: 'CALL_NOT_FOUND' })
    }

    const statusMap: Record<string, string> = {
      queued: 'INITIATED',
      ringing: 'RINGING',
      'in-progress': 'ANSWERED',
      completed: 'ENDED',
      failed: 'FAILED',
      busy: 'FAILED',
      'no-answer': 'NO_ANSWER',
      canceled: 'FAILED',
    }

    const mappedStatus = statusMap[CallStatus || ''] || 'ENDED'
    const updateData: any = { status: mappedStatus }

    if (mappedStatus === 'ENDED' || mappedStatus === 'FAILED' || mappedStatus === 'NO_ANSWER') {
      updateData.endedAt = new Date()
      if (CallDuration) {
        updateData.duration = parseInt(CallDuration)
      }
    }

    const updated = await prisma.call.update({
      where: { id: call.id },
      data: updateData,
    })

    return res.json({ ok: true, callId: updated.id })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.post('/sms-incoming', async (req, res) => {
  try {
    if (WEBHOOK_SECRET) {
      const secret = req.headers['x-webhook-secret']
      if (secret !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'INVALID_WEBHOOK_SECRET' })
      }
    }

    const { From, To, Body, MessageSid } = req.body as {
      From?: string
      To?: string
      Body?: string
      MessageSid?: string
    }

    if (!From || !Body) {
      return res.status(400).json({ error: 'MISSING_PARAMS' })
    }

    const contact = await prisma.contact.findFirst({
      where: { phone: From, deletedAt: null },
      include: { team: true },
    })

    const teamId = contact?.teamId
    if (!teamId) {
      return res.status(200).json({ ok: true, queued: false })
    }

    const teamMember = await prisma.user.findFirst({ where: { teamId, role: 'ADMIN' } })

    const sms = await prisma.sms.create({
      data: {
        toNumber: To || '',
        fromNumber: From,
        body: Body,
        status: 'SENT',
        agentId: teamMember?.id || 'system',
        contactId: contact?.id || null,
        teamId,
      },
    })

    if (teamMember) {
      await prisma.notification.create({
        data: {
          userId: teamMember.id,
          type: 'SMS_RECEIVED',
          title: 'SMS reçu',
          body: `De ${From}: ${Body.slice(0, 80)}`,
          link: contact ? `/contacts/${contact.id}` : undefined,
          teamId,
        },
      })
    }

    return res.json({ ok: true, smsId: sms.id })
  } catch (error) {
    console.error('SMS incoming webhook error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
