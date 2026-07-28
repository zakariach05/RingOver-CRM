import { useAuth } from '../contexts/AuthContext'
import { Users, Contact as ContactIcon, Phone, BarChart3 } from 'lucide-react'

export default function DashboardPlaceholder() {
  const { user } = useAuth()

  const stats = [
    { label: 'Contacts', value: '—', icon: ContactIcon, color: 'bg-primary-50 text-primary-600' },
    { label: 'Appels aujourd\'hui', value: '—', icon: Phone, color: 'bg-success-50 text-success-600' },
    { label: 'Équipe', value: '—', icon: Users, color: 'bg-warning-50 text-warning-600' },
    { label: 'Deals ouverts', value: '—', icon: BarChart3, color: 'bg-danger-50 text-danger-600' },
  ]

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Bienvenue, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="page-subtitle">Voici un aperçu de votre activité</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card group cursor-default">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl duration-150 group-hover:scale-105 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
          <BarChart3 className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Tableau de bord complet</h3>
        <p className="mt-2 max-w-md mx-auto text-sm text-gray-500">
          Les graphiques et statistiques détaillés seront disponibles dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  )
}
