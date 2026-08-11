import crypto from 'crypto'
import { prisma } from '../utils/prisma'

/* ═══════════════════════════════════════════════════════════════════════════
   PRESENCE SERVICE — suivi temps réel des utilisateurs connectés
   ---------------------------------------------------------------------------
   Implémentation « in-memory » (Map) adaptée à une instance unique.

   Pourquoi pas de table en base ?
   - La présence est une donnée éphémère (heartbeat toutes les 60s côté client).
   - Une table SQL serait écrite à chaque heartbeat → I/O inutiles.
   - En multi-instance / scale-out, il faudrait remplacer ce Map par Redis
     (même interface : heartbeat / listOnline / disconnect), ce qui est trivial.

   Seuils (ms) :
   - ONLINE_TTL_MS      : au-delà de cette inactivité, la session est purgée
                          (utilisateur considéré « hors ligne », 🔴).
   - ACTIVE_THRESHOLD_MS : en-dessous → 🟢 Actif ; entre les deux → 🟡 Idle.
   ═══════════════════════════════════════════════════════════════════════════ */

const ONLINE_TTL_MS = 10 * 60 * 1000 // 10 min sans heartbeat → hors ligne
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000 // 2 min → bascule vert/jaune
const CLEANUP_INTERVAL_MS = 30 * 1000 // nettoyage des sessions expirées
const REVOCATION_TTL_MS = 8 * 24 * 60 * 60 * 1000 // 8 j (tokens JWT = 7 j)

export type PresenceStatus = 'active' | 'idle'

interface PresenceEntry {
  sessionId: string
  userId: string
  teamId: string
  role: string
  name: string
  email: string
  connectedAt: number
  lastActivity: number
  currentPage: string
}

// sessionId → entrée de présence (une entrée par onglet/fenêtre ouverte)
const sessions = new Map<string, PresenceEntry>()
// userId → timestamp de révocation (déconnexion forcée par un admin)
const revokedUsers = new Map<string, number>()

const now = () => Date.now()

function cleanExpiredSessions() {
  const cutoff = now() - ONLINE_TTL_MS
  for (const [sessionId, entry] of sessions) {
    if (entry.lastActivity < cutoff) sessions.delete(sessionId)
  }
  const revCutoff = now() - REVOCATION_TTL_MS
  for (const [userId, revokedAt] of revokedUsers) {
    if (revokedAt < revCutoff) revokedUsers.delete(userId)
  }
}

let cleanupTimer: NodeJS.Timeout | null = null
function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(cleanExpiredSessions, CLEANUP_INTERVAL_MS)
  // unref() pour ne pas maintenir le process Node en vie (tests, déploiement)
  cleanupTimer.unref?.()
}

/* ─── Heartbeat : enregistre / rafraîchit une session ─────────────────────── */

export async function heartbeat(input: {
  sessionId?: string
  userId: string
  teamId: string
  role: string
  page?: string
}): Promise<string> {
  ensureCleanup()
  const page = (input.page || '').slice(0, 200)
  const timestamp = now()

  const current = input.sessionId ? sessions.get(input.sessionId) : undefined

  // Même session déjà suivie pour ce même utilisateur → simple rafraîchissement
  if (current && current.userId === input.userId) {
    current.lastActivity = timestamp
    current.currentPage = page
    current.role = input.role
    return current.sessionId
  }

  // La session proposée appartient à un autre compte (changement d'utilisateur)
  if (current) sessions.delete(current.sessionId)

  // Nouvelle session : récupérer nom / email (une seule requête DB, puis cache)
  let name = current?.name ?? ''
  let email = current?.email ?? ''
  if (!name || !email) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true },
    })
    if (!user) throw new Error('USER_NOT_FOUND')
    name = user.name
    email = user.email
  }

  const sessionId = input.sessionId || crypto.randomUUID()
  sessions.set(sessionId, {
    sessionId,
    userId: input.userId,
    teamId: input.teamId,
    role: input.role,
    name,
    email,
    connectedAt: timestamp,
    lastActivity: timestamp,
    currentPage: page,
  })
  return sessionId
}

/* ─── Départ (beacon navigateur) ──────────────────────────────────────────── */

export function removeSession(sessionId: string, userId?: string): void {
  const entry = sessions.get(sessionId)
  if (!entry) return
  // Sécurité : on ne peut supprimer que sa propre session
  if (userId && entry.userId !== userId) return
  sessions.delete(sessionId)
}

/* ─── Déconnexion forcée (admin) + révocation de token ───────────────────── */

export function disconnectUser(userId: string): void {
  revokedUsers.set(userId, now())
  for (const [sessionId, entry] of sessions) {
    if (entry.userId === userId) sessions.delete(sessionId)
  }
}

export function isRevoked(userId: string): boolean {
  const revokedAt = revokedUsers.get(userId)
  return revokedAt !== undefined && now() - revokedAt < REVOCATION_TTL_MS
}

// Ré-autorise un utilisateur précédemment déconnecté de force (appelé au login)
export function unrevoke(userId: string): void {
  revokedUsers.delete(userId)
}

/* ─── Liste des utilisateurs en ligne ─────────────────────────────────────── */

export interface OnlineUserDTO {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string | null
  connected_at: string
  last_activity: string
  current_page: string
  status: PresenceStatus
  session_id: string
}

export function listOnline(
  teamId: string
): { users_online: OnlineUserDTO[]; total: number; updated_at: string } {
  cleanExpiredSessions()
  const cutoff = now() - ONLINE_TTL_MS

  // Regroupement par utilisateur (un user avec 2 onglets = 1 ligne)
  const byUser = new Map<string, PresenceEntry[]>()
  for (const entry of sessions.values()) {
    if (entry.teamId !== teamId || entry.lastActivity < cutoff) continue
    const bucket = byUser.get(entry.userId)
    if (bucket) bucket.push(entry)
    else byUser.set(entry.userId, [entry])
  }

  const users: OnlineUserDTO[] = []
  for (const [userId, entries] of byUser) {
    const sorted = [...entries].sort((a, b) => b.lastActivity - a.lastActivity)
    const mostRecent = sorted[0]
    const firstConnected = sorted.reduce(
      (min, e) => (e.connectedAt < min.connectedAt ? e : min),
      mostRecent
    )
    const status: PresenceStatus =
      now() - mostRecent.lastActivity <= ACTIVE_THRESHOLD_MS ? 'active' : 'idle'

    users.push({
      id: userId,
      name: mostRecent.name,
      email: mostRecent.email,
      role: mostRecent.role,
      avatar_url: null,
      connected_at: new Date(firstConnected.connectedAt).toISOString(),
      last_activity: new Date(mostRecent.lastActivity).toISOString(),
      current_page: mostRecent.currentPage,
      status,
      session_id: mostRecent.sessionId,
    })
  }

  // Tri par défaut : connexion la plus ancienne en premier
  users.sort(
    (a, b) => new Date(a.connected_at).getTime() - new Date(b.connected_at).getTime()
  )

  return { users_online: users, total: users.length, updated_at: new Date().toISOString() }
}

export function getOnlineCount(teamId: string): number {
  return listOnline(teamId).total
}

/* ─── Réinitialisation (tests) ────────────────────────────────────────────── */

export function resetPresence(): void {
  sessions.clear()
  revokedUsers.clear()
}
