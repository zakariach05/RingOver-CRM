import { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'

interface PeriodSelectorProps {
  value: { mode: 'preset' | 'custom'; preset: string; from: string; to: string }
  onChange: (v: { mode: 'preset' | 'custom'; preset: string; from: string; to: string }) => void
}

const PRESETS = [
  { label: '7j', value: '7' },
  { label: '14j', value: '14' },
  { label: '30j', value: '30' },
  { label: '90j', value: '90' },
]

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [localFrom, setLocalFrom] = useState(value.from)
  const [localTo, setLocalTo] = useState(value.to)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (value.mode === 'custom') {
      setLocalFrom(value.from)
      setLocalTo(value.to)
    }
  }, [value])

  const handlePreset = (preset: string) => {
    onChange({ mode: 'preset', preset, from: '', to: '' })
    setShowCustom(false)
  }

  const handleCustomToggle = () => {
    if (showCustom) {
      handlePreset(value.preset || '14')
    } else {
      const today = new Date().toISOString().split('T')[0]
      const from = new Date()
      from.setDate(from.getDate() - 14)
      setShowCustom(true)
      onChange({ mode: 'custom', preset: '', from: from.toISOString().split('T')[0], to: today })
    }
  }

  const handleDateChange = (field: 'from' | 'to', val: string) => {
    const next = { ...value, [field]: val }
    if (field === 'from') setLocalFrom(val)
    else setLocalTo(val)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (next.from && next.to) {
        onChange({ mode: 'custom', preset: '', from: next.from, to: next.to })
      }
    }, 400)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value.mode === 'preset' && value.preset === p.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={handleCustomToggle}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value.mode === 'custom'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Custom
        </button>
      </div>

      {value.mode === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="input-field !text-xs !py-1.5"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="input-field !text-xs !py-1.5"
          />
        </div>
      )}
    </div>
  )
}
