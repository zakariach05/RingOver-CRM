import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'

const router = Router()
router.use(authenticate)

// ── Ringover SMS sender ──────────────────────────────────────────────────────
async function sendViaRingover(
  toNumber: string,
  body: string
): Promise<{ success: boolean; ringoverSmsId?: string; error?: string }> {
  const apiKey = process.env.RINGOVER_API_KEY
  const fromNumber = process.env.RINGOVER_FROM_NUMBER

  // Mode simulation si clé non configurée
  if (!apiKey || apiKey === 'your_ringover_api_key_here') {
    console.log(`[SMS SIM] TO: ${toNumber} | MSG: ${body.substring(0, 50)}...`)
    return { success: true, ringoverSmsId: `sim_${Date.now()}` }
  }

  try {
    const res = await fetch('https://public-api.ringover.com/v2/sms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_number: toNumber,
        from_number: fromNumber || undefined,
        text: body,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Ringover SMS error:', res.status, errText)
      return { success: false, error: `Ringover error ${res.status}` }
    }

    const data = await res.json() as any
    return { success: true, ringoverSmsId: data?.sms_id || data?.id || String(Date.now()) }
  } catch (err: any) {
    console.error('Ringover SMS fetch error:', err.message)
    return { success: false, error: err.message }
  }
}

// ── GET /api/sms/unread-count ────────────────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    let join = ''
    let where = `sc."teamId" = ?`
    const params: any[] = [req.user!.teamId]

    if (req.user!.role === 'AGENT') {
      join = `JOIN "Contact" c ON c.id = sc."contactId"`
      where += ` AND (c."ownerId" = ? OR c."ownerId" IS NULL)`
      params.push(req.user!.id)
    }

    const result = await prisma.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COALESCE(SUM(sc."unreadCount"), 0) as total 
       FROM "SmsConversation" sc 
       ${join} 
       WHERE ${where}`,
      ...params
    )
    return res.json({ count: Number(result[0]?.total ?? 0) })
  } catch (error) {
    console.error('Unread count error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── GET /api/sms/conversations ───────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const teamId = req.user!.teamId
    const { q } = req.query

    let agentFilter = ''
    const params: any[] = [teamId]
    if (req.user!.role === 'AGENT') {
      agentFilter = `AND (c."ownerId" = ? OR c."ownerId" IS NULL)`
      params.push(req.user!.id)
    }

    if (q) {
      params.push(`%${q}%`, `%${q}%`)
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
         sc.id, sc."contactId", sc."lastMessage", sc."lastAt", sc."unreadCount",
         c.name as "contactName", c.phone as "contactPhone", c.company as "contactCompany"
       FROM "SmsConversation" sc
       JOIN "Contact" c ON c.id = sc."contactId"
       WHERE sc."teamId" = ?
         AND c."deletedAt" IS NULL
         ${agentFilter}
         ${q ? `AND (c.name LIKE ? OR c.phone LIKE ?)` : ''}
       ORDER BY COALESCE(sc."lastAt", sc."createdAt") DESC
       LIMIT 100`,
      ...params
    )

    return res.json({ conversations: rows })
  } catch (error) {
    console.error('List conversations error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── POST /api/sms/conversations ──────────────────────────────────────────────
// Démarrer une nouvelle conversation avec un contact existant
router.post('/conversations', async (req, res) => {
  try {
    const { contactId } = z.object({ contactId: z.string() }).parse(req.body)
    const teamId = req.user!.teamId

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, teamId, deletedAt: null },
    })
    if (!contact) {
      return res.status(404).json({ error: 'CONTACT_NOT_FOUND' })
    }

    // Upsert : si la conversation existe déjà, on la retourne
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "SmsConversation" WHERE "contactId" = ? AND "teamId" = ?`,
      contactId, teamId
    )

    if (existing.length > 0) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT sc.id, sc."contactId", sc."lastMessage", sc."lastAt", sc."unreadCount",
                c.name as "contactName", c.phone as "contactPhone", c.company as "contactCompany"
         FROM "SmsConversation" sc
         JOIN "Contact" c ON c.id = sc."contactId"
         WHERE sc.id = ?`,
        existing[0].id
      )
      return res.json({ conversation: rows[0], created: false })
    }

    const id = `sms_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SmsConversation" ("id","contactId","teamId","unreadCount","createdAt","updatedAt")
       VALUES (?, ?, ?, 0, ?, ?)`,
      id, contactId, teamId, now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sc.id, sc."contactId", sc."lastMessage", sc."lastAt", sc."unreadCount",
              c.name as "contactName", c.phone as "contactPhone", c.company as "contactCompany"
       FROM "SmsConversation" sc
       JOIN "Contact" c ON c.id = sc."contactId"
       WHERE sc.id = ?`,
      id
    )
    return res.status(201).json({ conversation: rows[0], created: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Create conversation error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── GET /api/sms/conversations/:id/messages ──────────────────────────────────
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const teamId = req.user!.teamId
    const convId = req.params.id

    // Vérifier appartenance à l'équipe et accès agent
    let agentJoin = ''
    let agentFilter = ''
    const params: any[] = [convId, teamId]

    if (req.user!.role === 'AGENT') {
      agentJoin = `JOIN "Contact" c ON c.id = sc."contactId"`
      agentFilter = `AND (c."ownerId" = ? OR c."ownerId" IS NULL)`
      params.push(req.user!.id)
    }

    const conv = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sc.id 
       FROM "SmsConversation" sc 
       ${agentJoin}
       WHERE sc.id = ? AND sc."teamId" = ? ${agentFilter}`,
      ...params
    )
    if (conv.length === 0) {
      return res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' })
    }

    const messages = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "conversationId", direction, body, status, "ringoverSmsId", "sentAt"
       FROM "SmsMessage"
       WHERE "conversationId" = ?
       ORDER BY "sentAt" ASC
       LIMIT 200`,
      convId
    )

    return res.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── POST /api/sms/send ───────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const { conversationId, body } = z.object({
      conversationId: z.string(),
      body: z.string().min(1).max(1600),
    }).parse(req.body)

    const teamId = req.user!.teamId

    // Charger la conversation + contact
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sc.id, sc."contactId", c.phone as "contactPhone", c.name as "contactName", c."ownerId" as "contactOwnerId"
       FROM "SmsConversation" sc
       JOIN "Contact" c ON c.id = sc."contactId"
       WHERE sc.id = ? AND sc."teamId" = ?`,
      conversationId, teamId
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' })
    }
    const conv = rows[0]

    if (req.user!.role === 'AGENT' && conv.contactOwnerId && conv.contactOwnerId !== req.user!.id) {
       return res.status(403).json({ error: 'FORBIDDEN' })
    }

    // Envoyer via Ringover
    const ringoverResult = await sendViaRingover(conv.contactPhone, body)

    // Sauvegarder le message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SmsMessage" ("id","conversationId","direction","body","status","ringoverSmsId","sentAt")
       VALUES (?, ?, 'OUTBOUND', ?, ?, ?, ?)`,
      msgId,
      conversationId,
      body,
      ringoverResult.success ? 'SENT' : 'FAILED',
      ringoverResult.ringoverSmsId || null,
      now
    )

    // Mettre à jour lastMessage et lastAt sur la conversation
    await prisma.$executeRawUnsafe(
      `UPDATE "SmsConversation" SET "lastMessage" = ?, "lastAt" = ?, "updatedAt" = ? WHERE id = ?`,
      body.length > 80 ? body.substring(0, 80) + '…' : body,
      now,
      now,
      conversationId
    )

    const message = {
      id: msgId,
      conversationId,
      direction: 'OUTBOUND',
      body,
      status: ringoverResult.success ? 'SENT' : 'FAILED',
      ringoverSmsId: ringoverResult.ringoverSmsId || null,
      sentAt: now,
    }

    return res.status(201).json({
      message,
      ringoverSuccess: ringoverResult.success,
      ...(ringoverResult.error ? { ringoverError: ringoverResult.error } : {}),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Send SMS error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── PATCH /api/sms/conversations/:id/read ────────────────────────────────────
router.patch('/conversations/:id/read', async (req, res) => {
  try {
    const teamId = req.user!.teamId
    const convId = req.params.id
    const now = new Date().toISOString()

    await prisma.$executeRawUnsafe(
      `UPDATE "SmsConversation" SET "unreadCount" = 0, "updatedAt" = ? WHERE id = ? AND "teamId" = ?`,
      now, convId, teamId
    )
    return res.json({ ok: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── GET /api/sms/contacts-without-conversation ───────────────────────────────
// Liste les contacts CRM qui n'ont pas encore de conversation SMS
router.get('/contacts-without-conversation', async (req, res) => {
  try {
    const teamId = req.user!.teamId
    const { q } = req.query

    let agentFilter = ''
    const params: any[] = [teamId]
    if (req.user!.role === 'AGENT') {
      agentFilter = `AND (c."ownerId" = ? OR c."ownerId" IS NULL)`
      params.push(req.user!.id)
    }

    if (q) {
      params.push(`%${q}%`, `%${q}%`)
    }

    const contacts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT c.id, c.name, c.phone, c.company
       FROM "Contact" c
       WHERE c."teamId" = ?
         AND c."deletedAt" IS NULL
         ${agentFilter}
         ${q ? `AND (c.name LIKE ? OR c.phone LIKE ?)` : ''}
       ORDER BY c.name ASC
       LIMIT 50`,
      ...params
    )

    return res.json({ contacts })
  } catch (error) {
    console.error('Contacts without conv error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
