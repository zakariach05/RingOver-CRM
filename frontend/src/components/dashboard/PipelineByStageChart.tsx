import { Handshake } from 'lucide-react'
import { StageData } from '../../hooks/useDashboardData'

interface Props {
  data: StageData[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function formatCurrency(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M€`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K€`
  return `${v.toLocaleString('fr-FR')}€`
}

const STAGE_COLORS: Record<string, string> = {
  LEAD: '#8b5cf6',
  QUALIFIED: '#f59e0b',
  PROPOSAL: '#ef4444',
  NEGOTIATION: '#3b82f6',
  WON: '#22c55e',
}

export default function PipelineByStageChart({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline par étape</h3>
        <div className="h-[200px] animate-pulse bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline par étape</h3>
        <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <p>{error}</p>
          {onRetry && <button onClick={onRetry} className="text-xs text-primary-600 hover:underline">Réessayer</button>}
        </div>
      </div>
    )
  }

  const hasData = data.some((s) => s.totalValue > 0 || s.count > 0)
  const maxValue = Math.max(...data.map((d) => d.totalValue), 1)

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline par étape</h3>

      {!hasData ? (
        <div className="h-[160px] flex items-center justify-center text-sm text-gray-400 gap-2">
          <Handshake className="w-5 h-5 opacity-40" />
          Aucun deal dans le pipeline
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((stage) => (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">{stage.count} deal{stage.count !== 1 ? 's' : ''}</span>
                  <span className="text-xs font-bold text-gray-800 tabular-nums w-14 text-right">
                    {formatCurrency(stage.totalValue)}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${maxValue > 0 ? Math.max(2, Math.round((stage.totalValue / maxValue) * 100)) : 0}%`,
                    backgroundColor: STAGE_COLORS[stage.stage] || '#94a3b8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
