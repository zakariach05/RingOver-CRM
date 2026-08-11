import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import { OnlineUser, PresenceResponse, PresenceStatus } from '../../types/presence'
import {
  Users,
  Search,
  RefreshCw,
  LogOut,
  X,
  Clock,
  AlertCircle,
  Wifi,
} from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30_000 // rafraîchissement de la liste
const NOW_REFRESH_MS = 15_000 // re-rendu des timestamps relatifs
const ONLINE_WINDOW_MIN = 10 // tolérance serveur avant passage hors-ligne

type SortKey = 'connected' | 'name' | 'role' | 'activity'
type RoleFilter = 'ALL' | 'ADMIN' | 'MANAGER' | 'AGENT'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  AGENT: 'Agent',
}
const ROLE_BADGES: Record<string, string> = {
  ADMIN: 'bg-danger-50 text-danger-600 ring-1 ring-danger-200',
  MANAGER: 'bg-warning-50 text-warning-600 ring-1 ring-warning-200',
  AGENT: 'bg-primary-50 text-primary-600 ring-1 ring-primary-200',
}
const STATUS_META: Record<PresenceStatus, { label: string; dotClass: string; pillClass: string }> = {
  active: { label: 'Actif', dotClass: 'bg-success-500', pillClass: 'bg-success-50 text-success-700' },
  idle: { label: 'Idle', dotClass: 'bg-warning-500', pillClass: 'bg-warning-50 text-warning-700' },
}
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
]

// ── Petites fonctions utilitaires ──────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function timeAgo(iso: string, nowTs: number): string {
  const diffMin = Math.floor((nowTs - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Compte à rebours isolé (re-rendu toutes les 1 s sans toucher la table)
function Countdown({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - since) / 1000))
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - since) / 1000))
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000)
    return () => clearInterval(id)
  }, [since])
  const remaining = Math.max(Math.round(POLL_INTERVAL_MS / 1000) - elapsed, 0)
  return <>{remaining} s</>
}

function UserCell({ user }: { user: OnlineUser }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(user.name)}`}
      >
        {initials(user.name)}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{user.name}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: PresenceStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.pillClass}`}>
      <span className={`relative flex h-2 w-2`}>
        {status === 'active' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dotClass}`} />
      </span>
      {meta.label}
    </span>
  )
}

// ── Widget principal ────────────────────────────────────────────────────────
export default function UsersOnlineWidget() {
  const { user: me } = useAuth()
  const [data, setData] = useState<PresenceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('connected')
  const [selected, setSelected] = useState<OnlineUser | null>(null)
  const [newIds, setNewIds] = useState<string[]>([])
  const [nowTs, setNowTs] = useState(() => Date.now())
  const lastPollAtRef = useRef(Date.now())
  const prevIdsRef = useRef<string[]>([])

  const users = data?.users_online ?? []
  const total = data?.total ?? 0

  // ── Polling toutes les 30 s ──────────────────────────────────────────────
  const fetchOnline = useCallback(async () => {
    try {
      const res = await api.get('/api/presence/online')
      setData(res.data)
      lastPollAtRef.current = Date.now()
      setError(null)
    } catch {
      setError('Impossible de récupérer la liste des utilisateurs en ligne')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOnline()
    const id = setInterval(fetchOnline, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchOnline])

  // ── Timestamps relatifs dynamiques ───────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), NOW_REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  // ── Animation d'arrivée (nouvel utilisateur détecté) ─────────────────────
  useEffect(() => {
    const ids = (data?.users_online ?? []).map((u) => u.id)
    const arrived = ids.filter((id) => !prevIdsRef.current.includes(id))
    if (arrived.length > 0) setNewIds(arrived)
    prevIdsRef.current = ids
    const t = setTimeout(() => setNewIds([]), 1000)
    return () => clearTimeout(t)
  }, [data])

  // ── Recherche + filtre rôle + tri ────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = users.filter(
      (u) =>
        (roleFilter === 'ALL' || u.role === roleFilter) &&
        (term === '' || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    )
    switch (sortBy) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        break
      case 'role':
        list.sort((a, b) => a.role.localeCompare(b.role))
        break
      case 'activity':
        list.sort((a, b) => +new Date(b.last_activity) - +new Date(a.last_activity))
        break
      default: // 'connected'
        list.sort((a, b) => +new Date(a.connected_at) - +new Date(b.connected_at))
    }
    return list
  }, [users, roleFilter, search, sortBy])

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true)
    fetchOnline()
  }

  const handleDisconnect = async (u: OnlineUser) => {
    if (!window.confirm(`Forcer la déconnexion de « ${u.name} » ?\nIl devra se reconnecter.`)) return
    try {
      await api.post(`/api/presence/${u.id}/disconnect`)
      setData((prev) => {
        if (!prev) return prev
        const next = prev.users_online.filter((x) => x.id !== u.id)
        return { ...prev, users_online: next, total: next.length }
      })
      setSelected((s) => (s && s.id === u.id ? null : s))
    } catch {
      setError("Échec de la déconnexion de l'utilisateur")
    }
  }

  const isSelf = (u: OnlineUser) => u.id === me?.id

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="card p-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-gray-900">Utilisateurs en ligne</h3>
              <span
                key={total}
                className="badge bg-success-50 text-success-700 animate-counter-pulse"
              >
                {total} en ligne
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Membres de l'équipe connectés en ce moment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
            <Wifi className="h-3.5 w-3.5 text-success-500" />
            Temps réel
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Erreur réseau (la liste précédente reste affichée) */}
      {error && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-600">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </span>
          <button onClick={handleRefresh} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {/* Barre d'outils : recherche / rôle / tri */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="input-field pl-9 py-2"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="input-field py-2 cursor-pointer sm:w-44"
          title="Filtrer par rôle"
        >
          <option value="ALL">Tous les rôles</option>
          <option value="ADMIN">Administrateurs</option>
          <option value="MANAGER">Managers</option>
          <option value="AGENT">Agents</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="input-field py-2 cursor-pointer sm:w-56"
          title="Trier"
        >
          <option value="connected">Tri : date de connexion</option>
          <option value="activity">Tri : dernière activité</option>
          <option value="name">Tri : nom</option>
          <option value="role">Tri : rôle</option>
        </select>
      </div>

      {/* Corps */}
      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-gray-200 rounded" />
                <div className="h-2.5 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 flex h-32 flex-col items-center justify-center gap-2 text-center">
          <Users className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            {users.length === 0
              ? "Aucun utilisateur en ligne actuellement"
              : 'Aucun résultat pour ces filtres'}
          </p>
        </div>
      ) : (
        <>
          {/* Table desktop */}
          <div className="mt-4 -mx-5 overflow-x-auto px-5">
            <table className="hidden sm:table min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Connecté</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dernière activité</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Page actuelle</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className={`cursor-pointer hover:bg-primary-50/40 transition-colors ${newIds.includes(u.id) ? 'animate-user-in' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <UserCell user={u} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_BADGES[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {timeAgo(u.connected_at, nowTs)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {timeAgo(u.last_activity, nowTs)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600 font-mono">
                        <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                        <span className="truncate" title={u.current_page}>
                          {u.current_page || '—'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isSelf(u) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDisconnect(u)
                            }}
                            className="rounded-lg p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                            title={`Forcer la déconnexion de ${u.name}`}
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cartes mobile */}
            <div className="sm:hidden space-y-2.5">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={`cursor-pointer rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:border-primary-200 transition-colors ${newIds.includes(u.id) ? 'animate-user-in' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <UserCell user={u} />
                    {!isSelf(u) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDisconnect(u)
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                        title={`Forcer la déconnexion de ${u.name}`}
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className={`badge ${ROLE_BADGES[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    <StatusPill status={u.status} />
                    <span className="ml-auto text-[11px] text-gray-400">
                      {timeAgo(u.last_activity, nowTs)}
                    </span>
                  </div>
                  {u.current_page && (
                    <p className="mt-2 truncate text-[11px] text-gray-500 font-mono">
                      {u.current_page}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Pied de carte : mise à jour + légende */}
      <div className="mt-4 flex flex-col gap-1.5 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          Auto-refresh dans <Countdown since={lastPollAtRef.current} />
          {data && data.updated_at && (
            <> · mise à jour {timeAgo(data.updated_at, nowTs)}</>
          )}
        </span>
        <span className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" /> Actif ({"<"}2 min)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning-500" /> Idle
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> Hors-ligne ({ONLINE_WINDOW_MIN} min)
          </span>
        </span>
      </div>

      {/* Modale profil */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Profil utilisateur</h3>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ${avatarColor(selected.name)}`}
              >
                {initials(selected.name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{selected.name}</p>
                <p className="text-sm text-gray-500 truncate">{selected.email}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`badge ${ROLE_BADGES[selected.role]}`}>
                    {ROLE_LABELS[selected.role]}
                  </span>
                  <StatusPill status={selected.status} />
                  {isSelf(selected) && (
                    <span className="badge bg-gray-100 text-gray-500">Vous</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Connecté le
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {formatClock(selected.connected_at)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Dernière activité
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {timeAgo(selected.last_activity, nowTs)}
                </p>
              </div>
              <div className="col-span-2 rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Page consultée
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800 font-mono break-all">
                  {selected.current_page || '—'}
                </p>
              </div>
            </div>

            {!isSelf(selected) && (
              <button
                onClick={() => handleDisconnect(selected)}
                className="btn-danger mt-5 w-full"
              >
                <LogOut className="h-4 w-4" />
                Forcer la déconnexion
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
