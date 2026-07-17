import { useState, useEffect } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing, ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react'
import { callsApi, Call } from '../api/calls.api'
import { useAuth } from '../contexts/AuthContext'
import PostCallModal from '../components/calls/PostCallModal'

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  MISSED: 'bg-red-100 text-red-700',
  NO_ANSWER: 'bg-red-100 text-red-700',
  FAILED: 'bg-gray-100 text-gray-600',
  ANSWERED: 'bg-blue-100 text-blue-700',
  RINGING: 'bg-amber-100 text-amber-700',
  INITIATED: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Terminé', MISSED: 'Manqué', NO_ANSWER: 'Sans réponse',
  FAILED: 'Échoué', ANSWERED: 'En cours', RINGING: 'Sonnerie', INITIATED: 'Initié',
}

const TAB_FILTERS: Record<string, string[]> = {
  all: [],
  missed: ['MISSED', 'NO_ANSWER'],
  completed: ['COMPLETED'],
}

export default function CallHistoryPage() {
  const { user } = useAuth()
  const [calls, setCalls] = useState<Call[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [directionFilter, setDirectionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 15

  const canViewTeam = ['ADMIN', 'MANAGER'].includes(user?.role || '')

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
        scope,
      }
      const statusFilter = TAB_FILTERS[activeTab]
      if (statusFilter?.length) params.status = statusFilter.join(',')
      if (directionFilter) params.direction = directionFilter
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (searchQuery && searchQuery.length >= 2) params.q = searchQuery
      const res = await callsApi.list(params)
      setCalls(res.data.calls)
      setTotal(res.data.total)
    } catch {
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCalls() }, [page, activeTab, scope, directionFilter, dateFrom, dateTo, searchQuery])

  const totalPages = Math.ceil(total / pageSize)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Historique des appels</h1>
        {canViewTeam && (
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setScope('mine'); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scope === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mes appels
            </button>
            <button
              onClick={() => { setScope('team'); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scope === 'team' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Toute l'équipe
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'missed', label: 'Manqués' },
            { key: 'completed', label: 'Terminés' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            showFilters || directionFilter || dateFrom || dateTo || searchQuery
              ? 'bg-primary-50 text-primary-700 border-primary-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un numéro ou contact..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="input-field pl-9 !text-xs bg-white"
            />
          </div>
          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1) }}
            className="input-field !text-xs bg-white"
          >
            <option value="">Tous les sens</option>
            <option value="INBOUND">Entrant</option>
            <option value="OUTBOUND">Sortant</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="input-field !text-xs bg-white"
            title="Date début"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="input-field !text-xs bg-white"
            title="Date fin"
          />
          {(directionFilter || dateFrom || dateTo || searchQuery) && (
            <button
              onClick={() => { setDirectionFilter(''); setDateFrom(''); setDateTo(''); setSearchQuery(''); setPage(1) }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" /> Effacer
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="card animate-pulse space-y-4 p-6">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
        </div>
      ) : calls.length === 0 ? (
        <div className="card p-12 text-center">
          <Phone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun appel trouvé</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sens</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durée</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{call.contact?.name || call.toNumber}</p>
                            {!call.contact && <p className="text-xs text-gray-400">{call.toNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {call.direction === 'INBOUND'
                          ? <PhoneIncoming className="w-4 h-4 text-green-500" />
                          : <PhoneOutgoing className="w-4 h-4 text-blue-500" />
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{call.agent?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{formatDuration(call.duration)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600" title={new Date(call.startedAt).toLocaleString('fr-FR')}>
                        {new Date(call.startedAt).toLocaleDateString('fr-FR')} {new Date(call.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[call.status] || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[call.status] || call.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">{total} résultat{total !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 font-medium">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedCall && (
        <PostCallModal call={selectedCall} onClose={() => { setSelectedCall(null); fetchCalls() }} />
      )}
    </div>
  )
}
