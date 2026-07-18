import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Handshake } from 'lucide-react'
import { StageData } from '../../hooks/useDashboardData'

interface Props {
  data: StageData[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const STAGE_COLORS: Record<string, string> = {
  LEAD: '#818cf8',
  QUALIFIED: '#fbbf24',
  PROPOSAL: '#60a5fa',
  NEGOTIATION: '#fb923c',
  WON: '#4ade80',
}

function formatCurrency(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toLocaleString('fr-FR')
}

export default function PipelineByStageChart({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline par étape</h3>
        <div className="h-[280px] animate-pulse bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline par étape</h3>
        <div className="h-[280px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <p>{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-primary-600 hover:underline">Réessayer</button>
          )}
        </div>
      </div>
    )
  }

  const hasData = data.some((s) => s.totalValue > 0)
  const avgValue = data.length > 0 ? data.reduce((a, b) => a + b.totalValue, 0) / data.length : 0
  const chartData = data.map((d) => ({ ...d, avg: Math.round(avgValue) }))

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Pipeline par étape</h3>
        <div className="flex items-center gap-3">
          {data.map((d) => (
            <div key={d.stage} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STAGE_COLORS[d.stage] }} />
              <span className="text-[10px] text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              formatter={(value: number, name: string) => {
                if (name === 'avg') return [`${formatCurrency(value)} €`, 'Moyenne']
                return [`${formatCurrency(value)} €`, 'Valeur']
              }}
            />
            <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="avg" />
            <Bar dataKey="totalValue" radius={[6, 6, 0, 0]} barSize={48}>
              {chartData.map((entry) => (
                <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || '#94a3b8'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          <Handshake className="w-5 h-5 mr-2 opacity-40" />
          Aucun deal dans le pipeline
        </div>
      )}
    </div>
  )
}
