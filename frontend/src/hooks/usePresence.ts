import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

// ── Heartbeat de présence ──────────────────────────────────────────────────
// Envoie un signal au serveur pour marquer l'utilisateur comme « en ligne »
// et indiquer la page qu'il consulte actuellement.
//
// Stratégie (performance) :
//  - heartbeat toutes les 60 s (le serveur tolère 10 min d'inactivité)
//  - heartbeat immédiat à chaque changement de page (pathname)
//  - heartbeat immédiat quand l'onglet redevient visible
//  - aucune requête quand l'onglet est caché (visibilityState === 'hidden')
//  - beacon (sendBeacon) au départ de la page pour un « offline » immédiat
//
// Le session_id est généré par le serveur au premier heartbeat puis stocké
// en localStorage (par utilisateur) pour survivre aux rechargements.

const HEARTBEAT_INTERVAL_MS = 60_000

const storageKey = (userId: string) => `presence_session_${userId}`

export function usePresence() {
  const { token, user } = useAuth()
  const location = useLocation()
  const sessionIdRef = useRef<string | null>(null)

  const sendHeartbeat = useCallback(
    async (page: string, opts?: { leave?: boolean }) => {
      if (!token || !user) return

      const sessionId =
        sessionIdRef.current || localStorage.getItem(storageKey(user.id)) || undefined

      // Départ : navigator.sendBeacon ne permet pas d'ajouter des headers
      // Authorization → le token est passé dans le corps (géré côté serveur).
      if (opts?.leave && navigator.sendBeacon && sessionId) {
        const body = JSON.stringify({ page, sessionId, leave: true, token })
        const base = api.defaults.baseURL || 'http://localhost:3001'
        navigator.sendBeacon(
          `${base}/api/presence/heartbeat`,
          new Blob([body], { type: 'application/json' })
        )
        return
      }

      try {
        const res = await api.post('/api/presence/heartbeat', {
          page,
          sessionId: sessionId || undefined,
        })
        const newSessionId: unknown = res.data?.session_id
        if (typeof newSessionId === 'string') {
          sessionIdRef.current = newSessionId
          localStorage.setItem(storageKey(user.id), newSessionId)
        }
      } catch {
        // Silencieux : la présence ne doit jamais casser l'expérience.
        // Un 401 ici déclenche néanmoins le redirect /login du intercepteur
        // (cas d'une déconnexion forcée par un admin).
      }
    },
    [token, user]
  )

  // Restaure le session_id persisté pour cet utilisateur
  useEffect(() => {
    if (!user) return
    const stored = localStorage.getItem(storageKey(user.id))
    if (stored) sessionIdRef.current = stored
  }, [user])

  // Heartbeat : au montage, à chaque changement de page, puis toutes les 60 s
  useEffect(() => {
    if (!token || !user) return

    sendHeartbeat(location.pathname)

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(location.pathname)
      }
    }, HEARTBEAT_INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(location.pathname)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [token, user, location.pathname, sendHeartbeat])

  // Beacon de départ (fermeture d'onglet / navigation / rechargement)
  useEffect(() => {
    if (!token || !user) return
    const onLeave = () => sendHeartbeat(location.pathname, { leave: true })
    window.addEventListener('pagehide', onLeave)
    return () => window.removeEventListener('pagehide', onLeave)
  }, [token, user, location.pathname, sendHeartbeat])

  return null
}
