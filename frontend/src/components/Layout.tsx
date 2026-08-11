import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Users, LayoutDashboard, LogOut, Contact as ContactIcon, Menu, X, Handshake, Phone, History, MessageSquare } from 'lucide-react'
import CallBanner from './calls/CallBanner'
import PostCallModal from './calls/PostCallModal'
import SoundPreferenceToggle from './calls/SoundPreferenceToggle'
import { useCallSounds } from '../hooks/useCallSounds'
import { useCall } from '../contexts/CallContext'
import { useSmsUnreadCount } from '../hooks/useSms'
import { useOpenDealsCount } from '../hooks/useDeals'
import { usePresence } from '../hooks/usePresence'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { endedCall, dismissEndedCall } = useCall()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useCallSounds()
  usePresence() // heartbeat de présence (utilisateurs en ligne)
  const smsUnreadCount = useSmsUnreadCount()
  const openDealsCount = useOpenDealsCount()

  type NavItem = {
    to: string
    label: string
    icon: any
    badge?: number
    roles?: string[]
  }

  type NavGroup = {
    title: string
    items: NavItem[]
  }

  const navGroups: NavGroup[] = [
    {
      title: "VUE D'ENSEMBLE",
      items: [
        { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      ]
    },
    {
      title: 'CRM',
      items: [
        { to: '/contacts', label: 'Contacts', icon: ContactIcon },
        { to: '/deals', label: 'Pipeline', icon: Handshake, badge: openDealsCount > 0 ? openDealsCount : undefined },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { to: '/dialer', label: 'Téléphone', icon: Phone },
        { to: '/calls', label: 'Historique', icon: History },
        { to: '/sms', label: 'SMS', icon: MessageSquare, badge: smsUnreadCount > 0 ? smsUnreadCount : undefined },
      ]
    },
    {
      title: 'ORGANISATION',
      items: [
        { to: '/team', label: 'Équipe', icon: Users, roles: ['ADMIN', 'MANAGER'] },
      ]
    }
  ]

  const sidebarContent = (
    <>
      <div className="flex flex-col items-center px-5 py-5">
        <img src="/logo.png" alt="RingOver" className="w-40 rounded-lg" />
        <p className="mt-2 text-[10px] text-white/70 font-medium text-center leading-tight">CRM & Téléphonie d'entreprise</p>
      </div>

      <nav className="mt-2 flex-1 space-y-6 px-3 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(user?.role || ''))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title}>
              <h3 className="mb-2 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-mono">
                {group.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname.startsWith(item.to)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium duration-150 ${
                        active
                          ? 'bg-primary-500/20 text-white'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md duration-150 ${
                          active
                            ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/15 group-hover:text-white'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {item.label}
                      </div>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.badge > 10 ? 'bg-red-500 text-white' : 'bg-primary-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/10 mx-3" />

      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white shadow-inner">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <SoundPreferenceToggle />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={logout}
            className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 duration-150 hover:bg-red-500/15 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-[#0B1220]">
        <div className="flex flex-1 flex-col">
          {sidebarContent}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0B1220] shadow-2xl animate-slide-in">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="mr-4 rounded-lg p-2 text-gray-400 hover:bg-white/15 hover:text-white duration-150 lg:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="-mt-10 flex flex-1 flex-col">
                {sidebarContent}
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/80 backdrop-blur-xl px-4 py-2.5 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 duration-150"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5 flex-1">
            <img src="/logo.png" alt="RingOver" className="h-8 w-auto rounded-md" />
          </div>
        </div>

        <main className="min-h-screen">
          {children}
        </main>
      </div>

      <CallBanner />
      {endedCall && <PostCallModal call={endedCall} onClose={dismissEndedCall} />}
    </div>
  )
}
