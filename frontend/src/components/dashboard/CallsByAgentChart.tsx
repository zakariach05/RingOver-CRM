import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users } from 'lucide-react'
import { AgentData } from '../../hooks/useDashboardData'

interface Props {
  data: AgentData[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function CallsByAgentChart({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Appels par agent</h3>
        <div className="h-[260px] animate-pulse bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Appels par agent</h3>
        <div className="h-[260px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <p>{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-primary-600 hover:underline">Réessayer</button>
          )}
        </div>
      </div>
    )
  }

  const isScrollable = data.length > 10
  const chartHeight = isScrollable ? Math.max(260, data.length * 32) : 260

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Appels par agent</h3>
      {data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
          <Users className="w-5 h-5 mr-2 opacity-40" />
          Aucun appel sur cette période
        </div>
      ) : (
        <div className={isScrollable ? 'h-[260px] overflow-y-auto' : ''}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="agentName" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  if (name === 'callCount') return [`${value} appel${value > 1 ? 's' : ''}`, 'Appels']
                  return [formatDuration(value), 'Durée totale']
                }}
                labelFormatter={(label) => `Agent: ${label}`}
              />
              <Bar dataKey="callCount" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} name="callCount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
