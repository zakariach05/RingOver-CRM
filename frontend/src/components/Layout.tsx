import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Users, LayoutDashboard, LogOut, Contact as ContactIcon, Menu, X, Phone } from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const navItems = [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/contacts', label: 'Contacts', icon: ContactIcon },
    { to: '/team', label: 'Équipe', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  ]

  const visibleNav = navItems.filter((item) => !item.roles || item.roles.includes(user?.role || ''))

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 shadow-lg shadow-primary-500/30">
          <Phone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">RingOver</h1>
          <p className="text-[11px] text-primary-300 font-semibold">CRM & Téléphonie d'entreprise</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium duration-150 ${
                active
                  ? 'bg-primary-600/20 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-md duration-150 ${
                active
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                  : 'bg-white/5 text-gray-400 group-hover:bg-white/15 group-hover:text-white'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              {item.label}
            </Link>
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
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 duration-150 hover:bg-red-500/15 hover:text-red-400 mt-1"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-black">
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
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-black shadow-2xl animate-slide-in">
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
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-200 bg-white/80 backdrop-blur-xl px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 duration-150"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-500 shadow-sm shadow-primary-500/20">
              <Phone className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">RingOver</span>
          </div>
        </div>

        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
