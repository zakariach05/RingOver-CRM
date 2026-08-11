import { ActivityEvent } from '../../hooks/useDashboardData'
import { Phone, Handshake, Loader2 } from 'lucide-react'

interface Props {
  events: ActivityEvent[]
  loading?: boolean
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'à l\'instant'
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const STATUS_COLORS: Record<string, string> = {
  ANSWERED: 'bg-green-400',
  MISSED: 'bg-red-400',
  NO_ANSWER: 'bg-red-400',
  BUSY: 'bg-amber-400',
  WON: 'bg-green-400',
  LOST: 'bg-red-400',
  LEAD: 'bg-blue-400',
  QUALIFIED: 'bg-violet-400',
  PROPOSAL: 'bg-amber-400',
  NEGOTIATION: 'bg-orange-400',
}

export default function ActivityFeed({ events, loading }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-900">Activité en direct</h3>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
      </div>
      <p className="text-xs text-gray-400 mb-4">Flux temps réel de l'équipe</p>

      {events.length === 0 && !loading ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
          Aucune activité récente
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3">
              {/* Dot status */}
              <div className="mt-1 relative flex shrink-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[ev.status || ''] || 'bg-gray-300'}`}
                />
              </div>

              {/* Icon type */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                {ev.type === 'call'
                  ? <Phone className="w-3.5 h-3.5 text-blue-500" />
                  : <Handshake className="w-3.5 h-3.5 text-amber-500" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 leading-snug truncate">{ev.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{ev.subtitle}</p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">
                {timeAgo(ev.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
