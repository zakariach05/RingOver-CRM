import { useState, useEffect, useRef } from 'react'
import {
  Search, Download, Plus, Phone, Paperclip, Send, Check,
  X, MessageSquare, AlertCircle, Loader2, ChevronRight
} from 'lucide-react'
import { useSms } from '../hooks/useSms'
import { smsApi, CrmContact } from '../api/sms.api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500',  'bg-rose-500',   'bg-teal-500', 'bg-pink-500',
]

function avatarColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// ── Modal Nouvelle Conversation ───────────────────────────────────────────────

function NewConversationModal({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (contactId: string) => void
}) {
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await smsApi.getContactsForNewConv(q || undefined)
        setContacts(res)
      } catch {
        setContacts([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [q])

  // Chargement initial
  useEffect(() => { setQ('') }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nouvelle conversation SMS</h2>
            <p className="text-xs text-gray-500 mt-0.5">Choisissez un contact de votre CRM</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un contact..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="max-h-72 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Aucun contact trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Ajoutez d'abord des contacts dans votre CRM</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={async () => {
                    setStarting(contact.id)
                    await onSelect(contact.id)
                  }}
                  disabled={starting === contact.id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 transition-colors group disabled:opacity-60"
                >
                  <div className={`w-9 h-9 flex-none flex items-center justify-center rounded-full text-white text-xs font-bold ${avatarColor(contact.name)}`}>
                    {getInitials(contact.name)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{contact.phone}</p>
                    {contact.company && (
                      <p className="text-xs text-gray-400 truncate">{contact.company}</p>
                    )}
                  </div>
                  {starting === contact.id
                    ? <Loader2 className="h-4 w-4 animate-spin text-primary-500 flex-none" />
                    : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 flex-none transition-colors" />
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick replies ─────────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  { id: 1, label: 'Envoyer devis',      icon: Paperclip },
  { id: 2, label: 'Proposer RDV',       icon: Phone },
  { id: 3, label: 'Confirmer réception', icon: Check },
]

// ── Skeleton loader ───────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex-none" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-48" />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SmsPage() {
  const {
    conversations, messages, activeConvId, activeConversation,
    loadingConvs, loadingMsgs, sending, error,
    searchQ, setSearchQ,
    selectConversation, sendMessage, startConversation,
  } = useSms()

  const [inputText, setInputText] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || sending) return
    setInputText('')
    await sendMessage(text)
  }

  const handleNewConv = async (contactId: string) => {
    setShowNewModal(false)
    await startConversation(contactId)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen bg-white">

      {/* ── Topbar ── */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="mb-4 sm:mb-0">
          <p className="text-[10px] font-mono text-primary-500 uppercase tracking-widest font-semibold mb-1">
            Conversations en temps réel
          </p>
          <h1 className="text-xl font-display font-bold text-gray-900">Messagerie SMS</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Rechercher..."
              className="w-48 lg:w-64 pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg shadow-sm hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Nouvelle action
          </button>
        </div>
      </div>

      {/* ── Split Pane ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Colonne Gauche : Conversations ── */}
        <div className="w-full sm:w-[290px] flex-none flex flex-col border-r border-gray-100 bg-white">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
            {loadingConvs ? (
              Array.from({ length: 5 }).map((_, i) => <ConvSkeleton key={i} />)
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500">Aucune conversation</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  {searchQ ? 'Aucun résultat pour cette recherche' : 'Cliquez sur "+ Nouvelle action" pour commencer'}
                </p>
                {!searchQ && (
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nouveau SMS
                  </button>
                )}
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
                    activeConvId === conv.id
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className={`flex-none w-10 h-10 flex items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(conv.contactName)}`}>
                    {getInitials(conv.contactName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {conv.contactName}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 flex-none ml-2">
                        {formatTime(conv.lastAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-gray-500 truncate flex-1">
                        {conv.lastMessage || <span className="italic text-gray-300">Aucun message</span>}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex-none w-4 h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-[9px] font-bold">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Colonne Droite : Fil de discussion ── */}
        <div className="flex-1 flex flex-col bg-[#F4F6FA] min-w-0">

          {/* Header de discussion */}
          {activeConversation ? (
            <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(activeConversation.contactName)}`}>
                  {getInitials(activeConversation.contactName)}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{activeConversation.contactName}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{activeConversation.contactPhone}</p>
                </div>
              </div>
              <button
                title={`Appeler ${activeConversation.contactName}`}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Phone className="h-5 w-5" />
              </button>
            </div>
          ) : (
            !loadingConvs && (
              <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
                <p className="text-sm text-gray-400">Sélectionnez une conversation</p>
              </div>
            )
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {loadingMsgs ? (
              <div className="flex justify-center pt-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
              </div>
            ) : !activeConvId ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7 text-primary-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Messagerie SMS</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Sélectionnez une conversation ou démarrez une nouvelle discussion avec un contact de votre CRM.
                </p>
              </div>
            ) : messages.length === 0 && !loadingMsgs ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-gray-400">Aucun message. Envoyez le premier SMS !</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.direction === 'OUTBOUND'
                const isSending = msg.status === 'SENDING'
                const isFailed = msg.status === 'FAILED'
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-3 text-sm shadow-sm transition-opacity ${
                        isSending ? 'opacity-60' : 'opacity-100'
                      } ${
                        isMe
                          ? `rounded-2xl rounded-tr-sm ${isFailed ? 'bg-red-500' : 'bg-primary-500'} text-white`
                          : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'
                      }`}
                    >
                      {msg.body}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatTime(msg.sentAt)}
                      </span>
                      {isMe && isSending && (
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-gray-400" />
                      )}
                      {isMe && isFailed && (
                        <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                          <AlertCircle className="h-2.5 w-2.5" /> Échec
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Zone de saisie ── */}
          {activeConvId && (
            <div className="flex-none p-4 bg-white border-t border-gray-100">
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 flex-none" />
                  {error}
                </div>
              )}

              {/* Quick Replies */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                {QUICK_REPLIES.map(reply => {
                  const Icon = reply.icon
                  return (
                    <button
                      key={reply.id}
                      className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-600 transition-colors"
                      onClick={() => setInputText(reply.label)}
                    >
                      <Icon className="h-3 w-3" />
                      {reply.label}
                    </button>
                  )
                })}
              </div>

              {/* Input */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="flex items-center justify-center h-11 px-6 bg-primary-500 text-white rounded-xl shadow-sm hover:bg-primary-600 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : (
                      <>
                        <span className="text-sm font-semibold mr-2">Envoyer</span>
                        <Send className="h-4 w-4" />
                      </>
                    )
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Nouvelle Conversation ── */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onSelect={handleNewConv}
        />
      )}
    </div>
  )
}
