import { useState, useEffect, useCallback, useRef } from 'react'
import { smsApi, SmsConversation, SmsMessage } from '../api/sms.api'

const POLL_INTERVAL_MS = 3000 // rafraîchir les messages toutes les 3s

export function useSms() {
  const [conversations, setConversations] = useState<SmsConversation[]>([])
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeConvIdRef = useRef<string | null>(null)

  // ── Charger les conversations ────────────────────────────────────────────
  const loadConversations = useCallback(async (q?: string) => {
    try {
      const convs = await smsApi.getConversations(q)
      setConversations(convs)
      // Auto-sélectionner la première si rien n'est actif
      setActiveConvId(prev => {
        if (!prev && convs.length > 0) {
          activeConvIdRef.current = convs[0].id
          return convs[0].id
        }
        return prev
      })
    } catch (e: any) {
      console.error('loadConversations error:', e)
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // ── Charger les messages d'une conversation ──────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    try {
      const msgs = await smsApi.getMessages(convId)
      setMessages(msgs)
      // Marquer comme lus automatiquement
      await smsApi.markAsRead(convId)
      // Mettre à jour le badge unread dans la liste
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
      )
    } catch (e: any) {
      console.error('loadMessages error:', e)
      setError('Impossible de charger les messages')
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── Sélectionner une conversation ────────────────────────────────────────
  const selectConversation = useCallback((convId: string) => {
    setActiveConvId(convId)
    activeConvIdRef.current = convId
    loadMessages(convId)
  }, [loadMessages])

  // ── Envoyer un SMS ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (body: string): Promise<boolean> => {
    if (!activeConvId || !body.trim()) return false
    setSending(true)
    setError(null)

    // Optimistic update
    const tempMsg: SmsMessage = {
      id: `temp_${Date.now()}`,
      conversationId: activeConvId,
      direction: 'OUTBOUND',
      body,
      status: 'SENDING',
      sentAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? { ...c, lastMessage: body.length > 80 ? body.substring(0, 80) + '…' : body, lastAt: new Date().toISOString() }
          : c
      )
    )

    try {
      const saved = await smsApi.sendSms(activeConvId, body)
      // Remplacer le message temp par le vrai
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? saved : m))
      return true
    } catch (e: any) {
      // Retirer le message optimiste en cas d'erreur
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setError('Échec de l\'envoi. Vérifiez votre connexion.')
      return false
    } finally {
      setSending(false)
    }
  }, [activeConvId])

  // ── Démarrer une nouvelle conversation ──────────────────────────────────
  const startConversation = useCallback(async (contactId: string): Promise<SmsConversation | null> => {
    try {
      const conv = await smsApi.startConversation(contactId)
      // Recharger la liste pour inclure la nouvelle conv
      await loadConversations(searchQ)
      selectConversation(conv.id)
      return conv
    } catch (e: any) {
      setError('Impossible de démarrer la conversation')
      return null
    }
  }, [loadConversations, selectConversation, searchQ])

  // ── Polling des messages (toutes les 3s) ────────────────────────────────
  useEffect(() => {
    if (!activeConvId) return

    // Poll immédiat dès qu'on change de conversation
    const poll = async () => {
      if (!activeConvIdRef.current) return
      try {
        const msgs = await smsApi.getMessages(activeConvIdRef.current)
        setMessages(prev => {
          // Ne remplacer que si différent (évite re-render inutile)
          if (msgs.length !== prev.filter(m => !m.id.startsWith('temp_')).length) return msgs
          return prev
        })
      } catch {
        // Silencieux pour ne pas spammer les erreurs
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeConvId])

  // ── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // ── Recherche de conversations ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      loadConversations(searchQ || undefined)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQ, loadConversations])

  const activeConversation = conversations.find(c => c.id === activeConvId) ?? null

  return {
    conversations,
    messages,
    activeConvId,
    activeConversation,
    loadingConvs,
    loadingMsgs,
    sending,
    error,
    searchQ,
    setSearchQ,
    selectConversation,
    sendMessage,
    startConversation,
    reload: () => loadConversations(searchQ || undefined),
  }
}

// ── Hook séparé pour le badge unread dans le Layout ─────────────────────────
export function useSmsUnreadCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      try {
        const n = await smsApi.getUnreadCount()
        setCount(n)
      } catch { /* silencieux */ }
    }

    fetch()
    const interval = setInterval(fetch, 30_000) // rafraîchir toutes les 30s
    return () => clearInterval(interval)
  }, [])

  return count
}
