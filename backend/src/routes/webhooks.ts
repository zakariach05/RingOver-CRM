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

export default router
