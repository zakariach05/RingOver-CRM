import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { playNotification } from '../../utils/audioManager'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

const POLL_INTERVAL = 15000

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0, top: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/api/notifications/unread-count')
      const newCount = res.data.count
      if (newCount > lastCountRef.current) {
        playNotification()
      }
      lastCountRef.current = newCount
      setUnreadCount(newCount)
    } catch {}
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/notifications', { params: { pageSize: '15' } })
      setNotifications(res.data.notifications)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  const calcPosition = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const panelH = 420
    const gap = 8
    if (rect.top > panelH + gap) {
      setPanelPos({ top: rect.top - panelH - gap, left: rect.left })
    } else {
      setPanelPos({ bottom: window.innerHeight - rect.top + gap, left: rect.left })
    }
  }, [])

  useEffect(() => {
    if (open) calcPosition()
  }, [open, calcPosition])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      lastCountRef.current = Math.max(0, lastCountRef.current - 1)
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      lastCountRef.current = 0
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      const deleted = notifications.find((n) => n.id === id)
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
        lastCountRef.current = Math.max(0, lastCountRef.current - 1)
      }
    } catch {}
  }

  const handleClick = (notif: Notification) => {
    if (!notif.read) handleMarkRead(notif.id)
    if (notif.link) {
      setOpen(false)
      navigate(notif.link)
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `Il y a ${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Il y a ${hours}h`
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  const typeIcon: Record<string, string> = {
    SMS_SENT: '💬',
    SMS_RECEIVED: '📩',
    DEAL_CREATED: '🤝',
    CONTACT_CREATED: '👤',
    CALL_ENDED: '📞',
    CALL_MISSED: '📞',
    SYSTEM: '🔔',
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden animate-slide-up"
          style={panelPos}
        >
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    !notif.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span className="text-base mt-0.5">{typeIcon[notif.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{notif.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(notif.id) }}
                    className="p-1 text-gray-300 hover:text-red-500 rounded shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
