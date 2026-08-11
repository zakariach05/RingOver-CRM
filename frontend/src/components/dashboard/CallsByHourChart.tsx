import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { HourData } from '../../hooks/useDashboardData'

interface Props {
  data: HourData[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function CallsByHourChart({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Activité par heure</h3>
        <p className="text-xs text-gray-400 mb-4">Nombre d'appels par créneau — pic de journée</p>
        <div className="h-[200px] animate-pulse bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Activité par heure</h3>
        <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <p>{error}</p>
          {onRetry && <button onClick={onRetry} className="text-xs text-primary-600 hover:underline">Réessayer</button>}
        </div>
      </div>
    )
  }

  // Filtrage des heures significatives (8h–20h) pour affichage
  const displayData = data.filter((d) => d.hour >= 7 && d.hour <= 20)
  const maxCount = Math.max(...displayData.map((d) => d.count), 1)
  const peakHour = displayData.reduce((best, d) => (d.count > best.count ? d : best), displayData[0])

  const allZero = displayData.every((d) => d.count === 0)

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Activité par heure</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {allZero
              ? 'Aucun appel sur cette période'
              : `Pic à ${peakHour?.label} — ${peakHour?.count} appel${peakHour?.count > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={displayData} barSize={18} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
            formatter={(value: number) => [`${value} appel${value > 1 ? 's' : ''}`, 'Volume']}
            labelFormatter={(label) => `Créneau ${label}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {displayData.map((entry) => (
              <Cell
                key={entry.hour}
                fill={
                  !allZero && entry.count === maxCount && entry.count > 0
                    ? '#3b82f6'
                    : '#c7d2fe'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
