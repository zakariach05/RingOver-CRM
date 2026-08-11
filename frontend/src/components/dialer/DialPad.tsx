import { useState, useCallback, useEffect } from 'react'
import { Phone, Delete, Clock, Send } from 'lucide-react'
import { playKeypadTone, soundsEnabled } from '../../utils/audioManager'

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['*', ''], ['0', '+'], ['#', ''],
]

const RECENT_KEY = 'ringover_recent_calls'
const MAX_RECENT = 3

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecent(number: string) {
  const existing = getRecent().filter((n) => n !== number)
  const updated = [number, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}

interface DialPadProps {
  onCall: (number: string) => void
}

export default function DialPad({ onCall }: DialPadProps) {
  const [number, setNumber] = useState('')
  const [recentCalls, setRecentCalls] = useState<string[]>(getRecent)

  const handleKeyPress = useCallback((key: string) => {
    if (soundsEnabled()) playKeypadTone(key)
    setNumber((prev) => prev + key)
  }, [])

  const handleBackspace = useCallback(() => {
    setNumber((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    setNumber('')
  }, [])

  const handleCall = useCallback(() => {
    if (number.length >= 3) {
      saveRecent(number)
      setRecentCalls(getRecent())
      onCall(number)
    }
  }, [number, onCall])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKeyPress(e.key)
      else if (e.key === '*' || e.key === '#' || e.key === '+') handleKeyPress(e.key)
      else if (e.key === 'Backspace') handleBackspace()
      else if (e.key === 'Escape') handleClear()
      else if (e.key === 'Enter' && number.length >= 3) handleCall()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyPress, handleBackspace, handleClear, handleCall, number])

  const isValid = number.length >= 3

  return (
    <div className="flex flex-col items-center max-w-xs mx-auto">
      <div className="w-full mb-6">
        <input
          type="text"
          readOnly
          value={number}
          className="w-full text-center text-2xl font-mono font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl py-4 px-4 tracking-widest"
          placeholder="Entrez un numéro"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 w-full mb-4">
        {KEYS.map(([key, letters]) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className="flex flex-col items-center justify-center h-16 sm:h-14 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 active:scale-95 transition-all duration-200"
          >
            <span className="text-lg font-semibold text-gray-900">{key}</span>
            {letters && <span className="text-[9px] text-gray-400 tracking-wider leading-none">{letters}</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={handleClear}
          className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all duration-200"
        >
          Effacer tout
        </button>
        <button
          onClick={handleBackspace}
          disabled={!number}
          className="h-12 px-4 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 disabled:opacity-30"
        >
          <Delete className="w-5 h-5" />
        </button>
        <button
          onClick={handleCall}
          disabled={!isValid}
          className={`flex-1 h-12 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-30 flex items-center justify-center gap-2 ${
            isValid
              ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400/50'
              : 'bg-green-600'
          }`}
        >
          <Phone className="w-4 h-4" />
          Appeler
        </button>
      </div>

      {isValid && (
        <div className="flex gap-3 w-full mt-3">
          <button
            onClick={() => {
              const digits = number.replace(/\D/g, '')
              window.open(`https://wa.me/${digits}`, '_blank')
            }}
            className="flex-1 h-10 rounded-xl bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-all duration-200 flex items-center justify-center gap-1.5 border border-green-200"
          >
            <Send className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </div>
      )}

      {/* Recent calls */}
      {recentCalls.length > 0 && (
        <div className="w-full mt-6">
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Récemment composés
          </p>
          <div className="flex flex-wrap gap-2">
            {recentCalls.map((num) => (
              <button
                key={num}
                onClick={() => setNumber(num)}
                className="px-3 py-1.5 text-xs font-mono text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 border border-gray-200"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
