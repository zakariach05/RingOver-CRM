import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, Clock, AlertCircle, X } from 'lucide-react'
import DialPad from '../components/dialer/DialPad'
import { callsApi, Call } from '../api/calls.api'
import { useCall } from '../contexts/CallContext'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "à l'instant"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function formatDurationShort(seconds: number | null): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-2.5 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="h-2.5 bg-gray-200 rounded w-12" />
        </div>
      ))}
    </div>
  )
}

export default function DialerPage() {
  const { setActiveCall } = useCall()
  const [recentCalls, setRecentCalls] = useState<Call[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    callsApi.list({ pageSize: '5' })
      .then((res) => setRecentCalls(res.data.calls || []))
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
  }, [])

  const handleCall = async (number: string) => {
    setError(null)
    try {
      const res = await callsApi.initiate(number)
      setActiveCall(res.data.call)
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Vous êtes déjà en appel. Raccrochez d\'abord l\'appel en cours.')
      } else {
        setError("Erreur lors de l'initiation de l'appel")
      }
    }
  }

  const handleRecentClick = (call: Call) => {
    const number = call.direction === 'outbound' ? call.toNumber : call.fromNumber
    const input = document.querySelector<HTMLInputElement>('.card input[type="text"]')
    if (input) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, number)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  }

  return (
    <div className="page-container">
      <div className="max-w-sm mx-auto mt-8">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight text-center mb-8">
          Composeur
        </h1>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="card p-6 sm:p-8">
          <DialPad onCall={handleCall} />
        </div>

        {/* Recent calls */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Appels récents
          </h2>

          {loadingRecent ? (
            <LoadingSkeleton />
          ) : recentCalls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun appel récent</p>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call) => {
                const isOutbound = call.direction === 'outbound'
                const number = isOutbound ? call.toNumber : call.fromNumber
                return (
                  <button
                    key={call.id}
                    onClick={() => handleRecentClick(call)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-200 text-left"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isOutbound ? 'bg-blue-50' : 'bg-green-50'
                    }`}>
                      {isOutbound ? (
                        <ArrowUpRight className="w-4 h-4 text-blue-500" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {call.contact?.name || number}
                      </p>
                      {call.contact && (
                        <p className="text-xs text-gray-400 truncate">{number}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{formatDurationShort(call.duration)}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(call.startedAt)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
