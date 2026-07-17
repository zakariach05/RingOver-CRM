import { useDraggable } from '@dnd-kit/core'
import { Deal } from '../../api/deals.api'
import { Lock, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DealCardProps {
  deal: Deal
  disabled?: boolean
}

export default function DealCard({ deal, disabled }: DealCardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled,
    data: { deal },
  })

  const isLocked = ['WON', 'LOST'].includes(deal.stage)
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && navigate(`/deals/${deal.id}`)}
      className={`bg-white border border-gray-200 rounded-xl p-3.5 cursor-grab active:cursor-grabbing
        transition-shadow hover:shadow-md min-h-[44px]
        ${isDragging ? 'opacity-50 shadow-xl z-50' : ''}
        ${disabled ? 'cursor-default opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
          {deal.title}
        </h4>
        {isLocked && (
          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
        )}
      </div>

      <p className="text-sm font-bold text-primary-600 mb-2">
        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(deal.value)}
      </p>

      {deal.owner && (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-3 h-3 text-primary-600" />
          </div>
          <span className="text-xs text-gray-500 truncate">{deal.owner.name}</span>
        </div>
      )}
    </div>
  )
}
