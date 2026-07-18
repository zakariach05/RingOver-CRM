import { useNavigate } from 'react-router-dom'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  deltaPercent: number | null
  icon: LucideIcon
  iconColor: string
  href?: string
  sub?: string
}

export default function KpiCard({ label, value, deltaPercent, icon: Icon, iconColor, href, sub }: KpiCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className={`stat-card group ${href ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
      onClick={href ? () => navigate(href) : undefined}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl duration-150 group-hover:scale-105 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
        {deltaPercent !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold shrink-0 ${
            deltaPercent >= 0 ? 'text-green-600' : 'text-red-500'
          }`}>
            {deltaPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{deltaPercent >= 0 ? '+' : ''}{deltaPercent}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
