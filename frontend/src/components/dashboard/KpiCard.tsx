import { useNavigate } from 'react-router-dom'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { SparklineData } from '../../types/dashboard'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KpiCardProps {
  label: string
  value: string
  deltaPercent: number | null
  icon: LucideIcon
  iconColor: string
  href?: string
  sub?: string
  sparkline?: SparklineData[]
  deltaPositiveIsGood?: boolean
}

export default function KpiCard({
  label, value, deltaPercent, icon: Icon, iconColor, href, sub, sparkline, deltaPositiveIsGood = true,
}: KpiCardProps) {
  const navigate = useNavigate()
  const isGood = deltaPositiveIsGood ? (deltaPercent ?? 0) >= 0 : (deltaPercent ?? 0) <= 0

  return (
    <div
      className={`stat-card group ${href ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
      onClick={href ? () => navigate(href) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 duration-150 group-hover:scale-105 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
          </div>
        </div>

        {/* Sparkline mini */}
        {sparkline && sparkline.length > 1 && (
          <div className="w-20 h-10 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={isGood ? '#22c55e' : '#ef4444'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Delta badge */}
      {deltaPercent !== null && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
          {isGood ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{deltaPercent >= 0 ? '+' : ''}{deltaPercent}%</span>
          <span className="font-normal text-gray-400 ml-0.5">vs période préc.</span>
        </div>
      )}
    </div>
  )
}
