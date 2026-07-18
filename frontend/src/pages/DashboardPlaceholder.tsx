import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardData, PeriodState } from '../hooks/useDashboardData'
import { Phone, Contact as ContactIcon, Handshake, TrendingUp } from 'lucide-react'
import KpiCard from '../components/dashboard/KpiCard'
import PeriodSelector from '../components/dashboard/PeriodSelector'
import CallVolumeChart from '../components/dashboard/CallVolumeChart'
import CallsByAgentChart from '../components/dashboard/CallsByAgentChart'
import PipelineByStageChart from '../components/dashboard/PipelineByStageChart'

const defaultPeriod: PeriodState = { mode: 'preset', preset: '14', from: '', to: '' }

function formatCurrency(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toLocaleString('fr-FR')
}

export default function DashboardPlaceholder() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod)
  const { data, loading, error, retry } = useDashboardData(period)

  const isEmpty = data && data.kpi.totalCalls === 0 && data.kpi.totalContacts === 0 && data.kpi.openDeals === 0

  if (loading && !data) {
    return (
      <div className="page-container animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">
              Bonjour, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="page-subtitle">Chargement du tableau de bord...</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-7 w-16 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-72 animate-pulse"><div className="h-full bg-gray-100 rounded-xl" /></div>
          <div className="card h-72 animate-pulse"><div className="h-full bg-gray-100 rounded-xl" /></div>
        </div>
        <div className="mt-6">
          <div className="card h-80 animate-pulse"><div className="h-full bg-gray-100 rounded-xl" /></div>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="page-container animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">
              Bienvenue, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="page-subtitle">Voici un aperçu de votre activité</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
            <TrendingUp className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Bienvenue dans votre CRM !</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-gray-500">
            Votre espace est vide. Commencez par ajouter des contacts, créer des deals ou passer des appels pour voir vos statistiques.
          </p>
          <a href="/contacts" className="mt-4 inline-flex items-center gap-2 btn-primary text-sm">
            <ContactIcon className="w-4 h-4" />
            Ajouter des contacts
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">
            Bonjour, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="page-subtitle">Voici un aperçu de votre activité</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={`Appels (${period.mode === 'preset' ? period.preset + 'j' : 'période'})`}
          value={data!.kpi.totalCalls.toLocaleString('fr-FR')}
          deltaPercent={data!.kpi.totalCallsDelta}
          icon={Phone}
          iconColor="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Contacts"
          value={data!.kpi.totalContacts.toLocaleString('fr-FR')}
          deltaPercent={null}
          icon={ContactIcon}
          iconColor="bg-purple-50 text-purple-600"
          href="/contacts"
          sub="dans le CRM"
        />
        <KpiCard
          label="Deals en cours"
          value={data!.kpi.openDeals.toLocaleString('fr-FR')}
          deltaPercent={null}
          icon={Handshake}
          iconColor="bg-amber-50 text-amber-600"
          href="/deals"
          sub="pipeline actif"
        />
        <KpiCard
          label="Valeur gagnée"
          value={`${formatCurrency(data!.kpi.wonRevenue)} €`}
          deltaPercent={null}
          icon={TrendingUp}
          iconColor="bg-green-50 text-green-600"
          href="/deals"
          sub={`${data!.kpi.missedCalls} manqués · ${data!.kpi.avgCallDuration}s moy.`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CallVolumeChart
          data={data!.callsByDay}
          loading={loading}
          error={error}
          onRetry={retry}
        />
        <CallsByAgentChart
          data={data!.callsByAgent}
          loading={loading}
          error={error}
          onRetry={retry}
        />
      </div>

      <PipelineByStageChart
        data={data!.pipeline}
        loading={loading}
        error={error}
        onRetry={retry}
      />
    </div>
  )
}
