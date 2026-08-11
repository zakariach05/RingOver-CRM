import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { DayData } from '../../hooks/useDashboardData'

interface Props {
  data: DayData[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function CallVolumeChart({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Volume d'appels</h3>
        <p className="text-xs text-gray-400 mb-4">Entrants vs sortants — 7 derniers jours</p>
        <div className="h-[260px] animate-pulse bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Volume d'appels</h3>
        <div className="h-[260px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <p>{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-primary-600 hover:underline">Réessayer</button>
          )}
        </div>
      </div>
    )
  }

  const allZero = data.every((d) => d.inbound === 0 && d.outbound === 0)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-900">Volume d'appels</h3>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <span className="inline-block w-3 h-0.5 rounded bg-blue-500" /> Entrants
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <span className="inline-block w-3 h-0.5 rounded bg-violet-500" /> Sortants
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">Entrants vs sortants — période sélectionnée</p>

      {allZero ? (
        <div className="relative h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Line type="monotone" dataKey="inbound" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400 bg-white/80 px-3 py-1 rounded-lg">Aucun appel sur cette période</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              labelFormatter={(label) => {
                const item = data.find((d) => d.label === label)
                return item
                  ? new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                  : label
              }}
              formatter={(value: number, name: string) => [
                `${value} appel${value > 1 ? 's' : ''}`,
                name === 'inbound' ? 'Entrants' : 'Sortants',
              ]}
            />
            <Legend wrapperStyle={{ display: 'none' }} />
            <Line
              type="monotone" dataKey="inbound"
              stroke="#3b82f6" strokeWidth={2.5}
              dot={false} activeDot={{ r: 5, fill: '#3b82f6' }}
              name="inbound"
            />
            <Line
              type="monotone" dataKey="outbound"
              stroke="#8b5cf6" strokeWidth={2.5}
              dot={false} activeDot={{ r: 5, fill: '#8b5cf6' }}
              name="outbound"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
