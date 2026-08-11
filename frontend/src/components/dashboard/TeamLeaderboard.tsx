import { AgentData } from '../../hooks/useDashboardData'
import { Users } from 'lucide-react'

interface Props {
  data: AgentData[]
  loading?: boolean
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
]

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function TeamLeaderboard({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Classement de l'équipe</h3>
        <p className="text-xs text-gray-400 mb-4">Appels traités — cette période</p>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const top = data.slice(0, 5)
  const maxCalls = top[0]?.callCount || 1

  if (top.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Classement de l'équipe</h3>
        <p className="text-xs text-gray-400 mb-4">Appels traités — cette période</p>
        <div className="h-[160px] flex items-center justify-center text-sm text-gray-400 gap-2">
          <Users className="w-4 h-4 opacity-40" />
          Aucun agent actif sur cette période
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">Classement de l'équipe</h3>
      <p className="text-xs text-gray-400 mb-4">Appels traités — cette période</p>

      <div className="space-y-4">
        {top.map((agent, i) => (
          <div key={agent.agentId} className="flex items-center gap-3">
            {/* Rang */}
            <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>

            {/* Avatar */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
            >
              {initials(agent.agentName)}
            </div>

            {/* Nom + barre */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-800 truncate">{agent.agentName}</span>
                <span className="text-xs text-gray-500 shrink-0 ml-2">{agent.callCount} appels</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round((agent.callCount / maxCalls) * 100)}%`,
                    backgroundColor: i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : '#a3a3a3',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
