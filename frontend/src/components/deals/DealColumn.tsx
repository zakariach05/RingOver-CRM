import { useDroppable } from '@dnd-kit/core'
import { Deal } from '../../api/deals.api'
import DealCard from './DealCard'

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualifié',
  PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
}

const STAGE_COLORS: Record<string, string> = {
  LEAD: 'bg-gray-500',
  QUALIFIED: 'bg-blue-500',
  PROPOSAL: 'bg-amber-500',
  NEGOTIATION: 'bg-purple-500',
  WON: 'bg-green-500',
  LOST: 'bg-red-500',
}

interface DealColumnProps {
  stage: string
  deals: Deal[]
  totalCount: number
  totalValue: number
}

export default function DealColumn({ stage, deals, totalCount, totalValue }: DealColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const isLocked = ['WON', 'LOST'].includes(stage)

  return (
    <div
      className="flex flex-col min-w-[260px] w-[260px] md:min-w-[280px] lg:min-w-[300px] md:flex-1 md:w-auto max-h-full snap-start shrink-0"
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[stage]}`} />
        <h3 className="text-sm font-bold text-gray-900">{STAGE_LABELS[stage]}</h3>
        <span className="text-xs text-gray-400 font-medium ml-auto">{totalCount}</span>
        {totalValue > 0 && (
          <span className="text-xs font-semibold text-gray-500">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue)}
          </span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-2.5 p-2 rounded-xl transition-colors min-h-[100px] ${
          isOver ? 'bg-primary-50 border-2 border-dashed border-primary-300' : 'bg-gray-50/50 border-2 border-transparent'
        }`}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} disabled={isLocked} />
        ))}
        {deals.length === 0 && (
          <div className="text-center py-6 text-xs text-gray-400">Aucune affaire</div>
        )}
      </div>
    </div>
  )
}
