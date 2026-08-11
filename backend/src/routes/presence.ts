import { Router, Request } from 'express'
import jwt from 'jsonwebtoken'
import { authenticate, requireRole } from '../types'
import {
  heartbeat,
  listOnline,
  removeSession,
  disconnectUser,
  isRevoked,
} from '../services/presenceService'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

/* ─── Extraction du token (header OU body) ──────────────────────────────────
   Le navigateur ne permet pas d'ajouter des headers sur navigator.sendBeacon
   (beacon de départ). On accepte donc aussi `token` dans le corps de la
   requête pour le heartbeat, ce qui permet un départ immédiat (sinon TTL). */

interface TokenPayload {
  id: string
  role: string
  teamId: string
}

function extractTokenPayload(req: Request): TokenPayload | null {
  let token: string | undefined
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (typeof req.body?.token === 'string') {
    token = req.body.token
  }
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// ── Heartbeat : l'utilisateur signale qu'il est actif ──────────────────────
// POST /api/presence/heartbeat  { page?, sessionId?, leave? }
router.post('/heartbeat', async (req, res) => {
  const payload = extractTokenPayload(req)
  if (!payload) return res.status(401).json({ error: 'NO_TOKEN' })
  if (isRevoked(payload.id)) return res.status(401).json({ error: 'TOKEN_REVOKED' })

  const { page, sessionId, leave } = (req.body || {}) as {
    page?: unknown
    sessionId?: unknown
    leave?: unknown
  }

  // Beacon de départ (onglet fermé) — suppression immédiate de la session
  if (leave === true) {
    if (typeof sessionId === 'string') removeSession(sessionId, payload.id)
    return res.json({ ok: true })
  }

  try {
    const sid = await heartbeat({
      sessionId: typeof sessionId === 'string' ? sessionId : undefined,
      userId: payload.id,
      teamId: payload.teamId,
      role: payload.role,
      page: typeof page === 'string' ? page : '',
    })
    return res.json({ session_id: sid, server_time: new Date().toISOString() })
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ error: 'USER_NOT_FOUND' })
    }
    console.error('[Presence] Heartbeat error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── Liste des utilisateurs en ligne (admin uniquement) ─────────────────────
// GET /api/presence/online
router.get('/online', authenticate, requireRole('ADMIN'), (_req, res) => {
  try {
    return res.json(listOnline(_req.user!.teamId))
  } catch (error) {
    console.error('[Presence] Online list error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── Déconnexion forcée (admin uniquement) ──────────────────────────────────
// POST /api/presence/:userId/disconnect
router.post('/:userId/disconnect', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    disconnectUser(req.params.userId)
    return res.json({ action: 'disconnected' })
  } catch (error) {
    console.error('[Presence] Disconnect error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
