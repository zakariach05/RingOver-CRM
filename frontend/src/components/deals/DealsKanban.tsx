import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDeals } from '../../hooks/useDeals'
import DealColumn from './DealColumn'
import DealCard from './DealCard'
import DealForm from './DealForm'
import DealFilters from './DealFilters'
import { Deal, DealFormData } from '../../api/deals.api'
import { Plus } from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'

const STAGE_ORDER = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

export default function DealsKanban() {
  const { user } = useAuth()
  const {
    deals, loading, error, scope, setScope,
    ownerFilter, setOwnerFilter, valueMin, setValueMin, valueMax, setValueMax,
    moveDeal, createDeal, getDealsByStage, getStageStats,
  } = useDeals('all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d: Deal) => d.id === event.active.id)
    if (deal) setActiveDeal(deal)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const newStage = over.id as string
    const deal = deals.find((d: Deal) => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    try {
      await moveDeal(dealId, newStage)
    } catch {
      console.error('Impossible de déplacer cette affaire (verrouillée).')
    }
  }

  const handleCreateDeal = async (data: DealFormData) => {
    setCreating(true)
    try {
      await createDeal(data)
      setShowCreateModal(false)
    } catch {
      console.error('Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" rounded="lg" />
          <Skeleton className="h-5 w-32" rounded="md" />
        </div>
        <div className="flex-1 overflow-x-auto px-6 pb-6">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col min-w-[260px] w-[260px] md:min-w-[280px] lg:min-w-[300px] md:flex-1 md:w-auto shrink-0 gap-3">
                <Skeleton className="h-5 w-24" rounded="md" />
                <Skeleton className="h-24 w-full" rounded="xl" />
                <Skeleton className="h-24 w-full" rounded="xl" />
                <Skeleton className="h-24 w-full" rounded="xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 pb-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pipeline commercial</h1>
          <p className="text-sm text-gray-500 mt-0.5">{deals.length} affaire{deals.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <DealFilters
            scope={scope}
            onScopeChange={setScope}
            ownerFilter={ownerFilter}
            onOwnerFilterChange={setOwnerFilter}
            valueMin={valueMin}
            onValueMinChange={setValueMin}
            valueMax={valueMax}
            onValueMaxChange={setValueMax}
            canViewAll={['MANAGER', 'ADMIN'].includes(user?.role || '')}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary py-2.5 whitespace-nowrap flex items-center gap-2 justify-center"
          >
            <Plus className="w-4 h-4" />
            Nouvelle affaire
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 p-3 bg-danger-50 text-danger-700 border border-danger-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-h-[calc(100vh-220px)] snap-x snap-mandatory md:snap-none">
            {STAGE_ORDER.map((stage) => {
              const stats = getStageStats(stage)
              return (
                <DealColumn
                  key={stage}
                  stage={stage}
                  deals={getDealsByStage(stage)}
                  totalCount={stats.count}
                  totalValue={stats.total}
                />
              )
            })}
          </div>
          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle affaire</h2>
            </div>
            <div className="p-5 sm:p-6">
              <DealForm
                onSubmit={handleCreateDeal}
                onCancel={() => setShowCreateModal(false)}
                isLoading={creating}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
