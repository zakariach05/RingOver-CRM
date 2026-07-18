import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../utils/api'

interface Conversation {
  contactId: string | null
  contactName: string | null
  contactPhone: string | null
  phoneNumber: string
  lastMessage: string
  lastAt: string
  unread: number
  messageCount: number
  agents: string[]
}

interface SmsMessage {
  id: string
  toNumber: string
  fromNumber: string
  body: string
  status: string
  createdAt: string
  contact: { id: string; name: string; phone: string } | null
  agent: { id: string; name: string }
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeConv) {
      loadConversation(activeConv.contactId || activeConv.phoneNumber)
    }
  }, [activeConv?.contactId, activeConv?.phoneNumber])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    try {
      const res = await api.get('/api/sms/conversations')
      setConversations(res.data.conversations)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const loadConversation = async (key: string) => {
    setLoadingMessages(true)
    try {
      const res = await api.get(`/api/sms/conversation/${encodeURIComponent(key)}`)
      setMessages(res.data.messages)
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSend = async () => {
    if (!replyBody.trim() || !activeConv) return
    setSending(true)
    try {
      await api.post('/api/sms/send', {
        toNumber: activeConv.phoneNumber,
        body: replyBody.trim(),
        contactId: activeConv.contactId || undefined,
      })
      setReplyBody('')
      await loadConversation(activeConv.contactId || activeConv.phoneNumber)
      await loadConversations()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const displayName = (c: Conversation) => c.contactName || c.phoneNumber
  const displayAvatar = (c: Conversation) => (c.contactName || '?')[0].toUpperCase()

  if (activeConv) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen bg-gray-50">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => { setActiveConv(null); setMessages([]) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
            {displayAvatar(activeConv)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{displayName(activeConv)}</p>
            <p className="text-xs text-gray-400">{activeConv.phoneNumber}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Chargement...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Aucun message</div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.status === 'SENT' || msg.status === 'SENDING'
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {msg.status === 'SENDING' && ' · Envoi...'}
                      {msg.status === 'FAILED' && ' · Échec'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              placeholder="Votre message..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            />
            <button
              onClick={handleSend}
              disabled={!replyBody.trim() || sending}
              className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Conversations SMS</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Aucune conversation</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-gray-500">
            Les conversations SMS apparaîtront ici lorsque vous enverrez ou recevrez des messages.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv, i) => (
            <button
              key={conv.contactId || conv.phoneNumber + i}
              onClick={() => setActiveConv(conv)}
              className="card w-full p-4 flex items-center gap-3 hover:border-primary-300 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
                {displayAvatar(conv)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{displayName(conv)}</p>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(conv.lastAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{conv.messageCount} message{conv.messageCount > 1 ? 's' : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
