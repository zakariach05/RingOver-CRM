import { useState } from 'react'
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

interface DealFiltersProps {
  scope: string
  onScopeChange: (scope: string) => void
  ownerFilter: string
  onOwnerFilterChange: (ownerId: string) => void
  valueMin: string
  onValueMinChange: (v: string) => void
  valueMax: string
  onValueMaxChange: (v: string) => void
  canViewAll?: boolean
}

export default function DealFilters({
  scope, onScopeChange,
  ownerFilter, onOwnerFilterChange,
  valueMin, onValueMinChange,
  valueMax, onValueMaxChange,
  canViewAll = true,
}: DealFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="sm:hidden flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg w-full justify-center"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filtres
        {mobileOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <div className={`${mobileOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row sm:items-center gap-3 mt-3 sm:mt-0`}>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {canViewAll && (
            <button
              onClick={() => onScopeChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scope === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Toute l'équipe
            </button>
          )}
          <button
            onClick={() => onScopeChange('mine')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              scope === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mes affaires
          </button>
        </div>

        <input
          type="text"
          placeholder="Filtrer par propriétaire"
          value={ownerFilter}
          onChange={(e) => onOwnerFilterChange(e.target.value)}
          className="input-field !py-1.5 !text-xs w-full sm:w-48"
        />

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="Min €"
            value={valueMin}
            onChange={(e) => onValueMinChange(e.target.value)}
            className="input-field !py-1.5 !text-xs w-full sm:w-24"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="number"
            placeholder="Max €"
            value={valueMax}
            onChange={(e) => onValueMaxChange(e.target.value)}
            className="input-field !py-1.5 !text-xs w-full sm:w-24"
          />
        </div>
      </div>
    </div>
  )
}
