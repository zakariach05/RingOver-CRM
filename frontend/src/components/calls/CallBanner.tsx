import { useState } from 'react'
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Volume2, VolumeX,
  Grid3X3, ArrowRightLeft, Circle, Minus, Maximize2, X,
} from 'lucide-react'
import { useCall } from '../../contexts/CallContext'
import { callsApi } from '../../api/calls.api'
import { playKeypadTone, playMuteToggle, playHangup, soundsEnabled } from '../../utils/audioManager'

const DTMF_KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#']

interface CallBannerProps {
  onCallEnded?: () => void
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function statusLabel(status: string, callDuration: number) {
  const timer = formatDuration(callDuration)
  switch (status) {
    case 'INITIATED': return `Connexion ${timer}`
    case 'RINGING': return `Sonnerie ${timer}`
    case 'ANSWERED': return `En ligne ${timer}`
    case 'HOLD': return `En attente ${timer}`
    default: return `${status} ${timer}`
  }
}

function ContactAvatar({ name }: { name?: string | null; toNumber: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : null
  return (
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
      {initial ? (
        <span className="text-green-400 font-bold text-base sm:text-lg">{initial}</span>
      ) : (
        <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
      )}
    </div>
  )
}

export default function CallBanner({ onCallEnded }: CallBannerProps) {
  const {
    activeCall, setActiveCall, callDuration,
    hold, speaker, toggleHold, toggleSpeaker, resetAudioState,
  } = useCall()

  const [muted, setMuted] = useState(false)
  const [hanging, setHanging] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)

  if (!activeCall || !['INITIATED', 'RINGING', 'ANSWERED'].includes(activeCall.status)) {
    return null
  }

  const handleHangup = async () => {
    setHanging(true)
    if (soundsEnabled()) playHangup()
    try {
      await callsApi.hangup(activeCall.id)
      resetAudioState()
      setActiveCall(null)
      onCallEnded?.()
    } catch {
      resetAudioState()
      setActiveCall(null)
      onCallEnded?.()
    } finally {
      setHanging(false)
    }
  }

  const handleKeypadPress = (key: string) => {
    if (soundsEnabled()) playKeypadTone(key)
  }

  const contactName = activeCall.contact?.name || null
  const displayNumber = activeCall.direction === 'outbound' ? activeCall.toNumber : activeCall.fromNumber

  // Minimized pill
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 lg:mr-64">
        <div className="bg-gray-900 border border-gray-700 rounded-full shadow-2xl flex items-center gap-2 px-3 py-2">
          <ContactAvatar name={contactName} toNumber={displayNumber} />
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-medium text-white truncate max-w-[120px]">
              {contactName || displayNumber}
            </p>
            <p className="text-[10px] text-green-400">{formatDuration(callDuration)}</p>
          </div>
          <span className="sm:hidden text-xs text-green-400 font-mono">
            {formatDuration(callDuration)}
          </span>
          <button
            onClick={() => setMinimized(false)}
            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            title="Agrandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleHangup}
            disabled={hanging}
            className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            title="Raccrocher"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:pl-64">
      {/* DTMF Keypad Overlay */}
      {showKeypad && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl p-4 w-[220px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400">Clavier DTMF</span>
              <button
                onClick={() => setShowKeypad(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {DTMF_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className="h-10 rounded-lg bg-gray-700 text-white text-sm font-semibold hover:bg-gray-600 active:bg-green-600 active:scale-95 transition-all duration-150"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="bg-gray-900 border-t border-gray-700 px-3 py-2.5 sm:px-4 sm:py-3 shadow-2xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Left: Call Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <ContactAvatar name={contactName} toNumber={displayNumber} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {contactName || displayNumber}
              </p>
              {contactName && (
                <p className="text-xs text-gray-500 truncate sm:block hidden">{displayNumber}</p>
              )}
              {activeCall.contact && (
                <p className="text-[10px] text-gray-500 truncate hidden sm:block">
                  {activeCall.contact.email || ''}
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  activeCall.status === 'INITIATED' ? 'text-yellow-400' :
                  activeCall.status === 'RINGING' ? 'text-blue-400' :
                  hold ? 'text-orange-400' : 'text-green-400'
                }`}>
                  {hold ? 'En attente' : statusLabel(activeCall.status, callDuration)}
                </span>
                {activeCall.status === 'INITIATED' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                )}
                {activeCall.status === 'RINGING' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                )}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {activeCall.status === 'ANSWERED' && (
              <>
                {/* Mute */}
                <button
                  onClick={() => { const next = !muted; setMuted(next); if (soundsEnabled()) playMuteToggle(next) }}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${
                    muted ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={muted ? 'Réactiver le micro' : 'Couper le micro'}
                >
                  {muted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                  <span className="hidden lg:inline text-[10px] ml-1">{muted ? 'Micro' : 'Micro'}</span>
                </button>

                {/* Hold */}
                <button
                  onClick={toggleHold}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${
                    hold ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={hold ? 'Reprendre' : 'Mettre en attente'}
                >
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline text-[10px] ml-1">Attente</span>
                </button>

                {/* Speaker */}
                <button
                  onClick={toggleSpeaker}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${
                    speaker ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={speaker ? 'Couper le haut-parleur' : 'Activer le haut-parleur'}
                >
                  {speaker ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                  <span className="hidden lg:inline text-[10px] ml-1">Haut-parleur</span>
                </button>

                {/* Keypad */}
                <button
                  onClick={() => setShowKeypad(!showKeypad)}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${
                    showKeypad ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  title="Clavier DTMF"
                >
                  <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline text-[10px] ml-1">Clavier</span>
                </button>

                {/* Transfer (placeholder) */}
                <button
                  className="p-2 sm:p-2.5 rounded-lg text-gray-500 cursor-not-allowed hidden sm:flex"
                  title="Transfert (bientôt disponible)"
                  disabled
                >
                  <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline text-[10px] ml-1">Transfert</span>
                </button>

                {/* Record (placeholder) */}
                <button
                  className="p-2 sm:p-2.5 rounded-lg text-gray-500 cursor-not-allowed hidden sm:flex"
                  title="Enregistrement (bientôt disponible)"
                  disabled
                >
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline text-[10px] ml-1">Enregistrer</span>
                </button>
              </>
            )}

            {/* Minimize */}
            <button
              onClick={() => { setMinimized(true); setShowKeypad(false) }}
              className="p-2 sm:p-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              title="Réduire"
            >
              <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Hangup */}
            <button
              onClick={handleHangup}
              disabled={hanging}
              className="p-2 sm:p-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              title="Raccrocher"
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
