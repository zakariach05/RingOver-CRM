import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { DashboardKPI } from '../../hooks/useDashboardData'

interface Props {
  kpi: DashboardKPI
  loading?: boolean
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444']

export default function CallDistributionChart({ kpi, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Répartition des appels</h3>
        <p className="text-xs text-gray-400 mb-4">Par type — cette semaine</p>
        <div className="h-[260px] animate-pulse bg-gray-100 rounded-xl" />
      </div>
    )
  }

  const outboundAnswered = Math.max(0, kpi.totalCalls - kpi.answeredCalls - kpi.missedCalls)
  const data = [
    { name: 'Décroché', value: kpi.answeredCalls },
    { name: 'Sortants réussis', value: outboundAnswered },
    { name: 'Manqués', value: kpi.missedCalls },
  ].filter((d) => d.value > 0)

  const total = kpi.totalCalls

  const isEmpty = total === 0

  const renderLabel = ({ cx, cy }: any) => (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 28, fontWeight: 700 }}>
        {total}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280' }}>
        APPELS
      </text>
    </>
  )

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">Répartition des appels</h3>
      <p className="text-xs text-gray-400 mb-4">Par type — cette période</p>

      {isEmpty ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
          Aucun appel sur cette période
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="w-[160px] h-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderLabel}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Légende */}
          <div className="flex flex-col gap-3 flex-1">
            {data.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-600">{entry.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{entry.value.toLocaleString('fr-FR')}</span>
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
