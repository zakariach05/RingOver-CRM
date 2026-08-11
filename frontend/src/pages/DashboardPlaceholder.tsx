import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  useDashboardData,
  useRecentActivity,
  PeriodState,
} from '../hooks/useDashboardData'
import {
  Phone, Contact as ContactIcon, Handshake, TrendingUp,
  CheckCircle, Clock, Download,
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

import KpiCard from '../components/dashboard/KpiCard'
import PeriodSelector from '../components/dashboard/PeriodSelector'
import CallVolumeChart from '../components/dashboard/CallVolumeChart'
import CallDistributionChart from '../components/dashboard/CallDistributionChart'
import CallsByHourChart from '../components/dashboard/CallsByHourChart'
import TeamLeaderboard from '../components/dashboard/TeamLeaderboard'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import PipelineByStageChart from '../components/dashboard/PipelineByStageChart'
import UsersOnlineWidget from '../components/dashboard/UsersOnlineWidget'

const defaultPeriod: PeriodState = { mode: 'preset', preset: '14', from: '', to: '' }

function formatCurrency(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M€`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K€`
  return `${v.toLocaleString('fr-FR')}€`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Skeleton loader global ─────────────────────────────────────────────────
function DashboardSkeleton({ user, period, setPeriod }: any) {
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card h-72 animate-pulse"><div className="h-full bg-gray-100 rounded-xl" /></div>
        <div className="card h-72 animate-pulse"><div className="h-full bg-gray-100 rounded-xl" /></div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function DashboardEmpty({ user, period, setPeriod }: any) {
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

// ── Dashboard principal ────────────────────────────────────────────────────
export default function DashboardPlaceholder() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod)
  const { data, loading, error, retry } = useDashboardData(period)
  const { events: activityEvents, loading: activityLoading } = useRecentActivity()

  const isAdmin = user?.role === 'ADMIN'

  const isEmpty =
    data &&
    data.kpi.totalCalls === 0 &&
    data.kpi.totalContacts === 0 &&
    data.kpi.openDeals === 0

  if (loading && !data) {
    return <DashboardSkeleton user={user} period={period} setPeriod={setPeriod} />
  }

  if (isEmpty) {
    return <DashboardEmpty user={user} period={period} setPeriod={setPeriod} />
  }

  const kpi = data!.kpi

  const handleExport = async () => {
    if (!data) return
    
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'RingOver CRM'
    workbook.created = new Date()

    // Helper to style header row
    const styleHeader = (worksheet: ExcelJS.Worksheet) => {
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00BF8F' } // Vert RingOver
      }
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
    }

    // --- Feuille 1: KPIs ---
    const wsKpi = workbook.addWorksheet('KPIs')
    wsKpi.columns = [
      { header: 'Indicateur', key: 'indicator', width: 30 },
      { header: 'Valeur', key: 'value', width: 25 },
    ]
    styleHeader(wsKpi)
    wsKpi.addRows([
      { indicator: "Appels aujourd'hui", value: kpi.callsToday },
      { indicator: "Total Appels (période)", value: kpi.totalCalls },
      { indicator: "Appels Entrants", value: kpi.answeredCalls + kpi.missedCalls },
      { indicator: "Appels Manqués", value: kpi.missedCalls },
      { indicator: "Taux de décrochage (%)", value: kpi.answerRate },
      { indicator: "Durée moyenne d'appel (s)", value: kpi.avgCallDuration },
      { indicator: "Contacts Total", value: kpi.totalContacts },
      { indicator: "Deals Actifs", value: kpi.openDeals },
      { indicator: "Valeur Pipeline Ouvert (€)", value: kpi.openPipelineValue },
      { indicator: "Revenus Gagnés (€)", value: kpi.wonRevenue },
    ])

    // --- Feuille 2: Appels par Jour ---
    const wsVolume = workbook.addWorksheet('Volume Appels')
    wsVolume.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Appels', key: 'total', width: 20 },
      { header: 'Appels Entrants', key: 'inbound', width: 20 },
      { header: 'Appels Sortants', key: 'outbound', width: 20 },
    ]
    styleHeader(wsVolume)
    wsVolume.addRows(data.callsByDay.map(d => ({
      date: d.date,
      total: d.count,
      inbound: d.inbound,
      outbound: d.outbound
    })))

    // --- Feuille 3: Classement Équipe ---
    const wsAgents = workbook.addWorksheet('Classement Équipe')
    wsAgents.columns = [
      { header: 'Agent', key: 'agent', width: 25 },
      { header: "Nombre d'appels", key: 'count', width: 20 },
      { header: 'Durée totale (s)', key: 'totalDuration', width: 20 },
      { header: 'Durée moyenne (s)', key: 'avgDuration', width: 20 },
    ]
    styleHeader(wsAgents)
    wsAgents.addRows(data.callsByAgent.map(a => ({
      agent: a.agentName,
      count: a.callCount,
      totalDuration: a.totalDuration,
      avgDuration: a.avgDuration
    })))

    // --- Feuille 4: Pipeline ---
    const wsPipeline = workbook.addWorksheet('Pipeline')
    wsPipeline.columns = [
      { header: 'Étape', key: 'stage', width: 25 },
      { header: 'Nombre de deals', key: 'count', width: 20 },
      { header: 'Valeur Totale (€)', key: 'value', width: 25 },
    ]
    styleHeader(wsPipeline)
    wsPipeline.addRows(data.pipeline.map(p => ({
      stage: p.label,
      count: p.count,
      value: p.totalValue
    })))

    // --- Formatage général (Bordures & Alignement) ---
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          }
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' }
          }
        })
      })
    })

    // Générer et télécharger
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `Rapport_RingOver_${period.preset || 'custom'}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Sparklines depuis callsByDay (derniers points)
  const sparkIn = data!.callsByDay.slice(-10).map((d) => ({ v: d.inbound }))
  const sparkOut = data!.callsByDay.slice(-10).map((d) => ({ v: d.outbound }))

  return (
    <div className="page-container animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">
            Bonjour, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="page-subtitle">Voici un aperçu de votre activité</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Exporter le rapport"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={retry} className="text-xs font-medium underline">Réessayer</button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Appels aujourd'hui"
          value={kpi.callsToday.toLocaleString('fr-FR')}
          deltaPercent={kpi.totalCallsDelta}
          icon={Phone}
          iconColor="bg-blue-50 text-blue-600"
          sparkline={sparkIn}
          sub={`Total période : ${kpi.totalCalls.toLocaleString('fr-FR')}`}
        />
        <KpiCard
          label="Taux de décrochage"
          value={`${kpi.answerRate}%`}
          deltaPercent={kpi.answerRateDelta}
          icon={CheckCircle}
          iconColor="bg-green-50 text-green-600"
          sparkline={sparkOut}
          sub={`${kpi.missedCalls} manqués`}
        />
        <KpiCard
          label="Durée moy. d'appel"
          value={formatDuration(kpi.avgCallDuration)}
          deltaPercent={kpi.avgCallDurationDelta}
          icon={Clock}
          iconColor="bg-amber-50 text-amber-600"
          sub="mm:ss par appel"
        />
        <KpiCard
          label="Pipeline ouvert"
          value={formatCurrency(kpi.openPipelineValue)}
          deltaPercent={null}
          icon={Handshake}
          iconColor="bg-violet-50 text-violet-600"
          href="/deals"
          sub={`${kpi.openDeals} deal${kpi.openDeals !== 1 ? 's' : ''} actifs`}
        />
      </div>

      {/* ── Ligne 2 : Volume + Répartition ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CallVolumeChart
          data={data!.callsByDay}
          loading={loading}
          error={error}
          onRetry={retry}
        />
        <CallDistributionChart
          kpi={kpi}
          loading={loading}
        />
      </div>

      {/* ── Ligne 3 : Activité par heure + Classement équipe ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CallsByHourChart
          data={data!.callsByHour}
          loading={loading}
          error={error}
          onRetry={retry}
        />
        <TeamLeaderboard
          data={data!.callsByAgent}
          loading={loading}
        />
      </div>

      {/* ── Ligne 3.5 : Utilisateurs en ligne (admin uniquement) ── */}
      {isAdmin && (
        <div className="mb-6">
          <UsersOnlineWidget />
        </div>
      )}

      {/* ── Ligne 4 : Activité en direct + Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed
          events={activityEvents}
          loading={activityLoading}
        />
        <PipelineByStageChart
          data={data!.pipeline}
          loading={loading}
          error={error}
          onRetry={retry}
        />
      </div>
    </div>
  )
}
