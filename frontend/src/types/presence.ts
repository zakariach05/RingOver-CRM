// ── Types du module « Utilisateurs en ligne » ──────────────────────────────
// L'API de présence utilise snake_case (format imposé par le cahier des
// charges). Le reste du projet est en camelCase — ces types isolent la
// conversion au sein du widget. 

export type PresenceStatus = 'active' | 'idle'

export interface OnlineUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'AGENT'
  avatar_url: string | null
  connected_at: string
  last_activity: string
  current_page: string
  status: PresenceStatus
  session_id: string
}

export interface PresenceResponse {
  users_online: OnlineUser[]
  total: number
  updated_at: string
}
