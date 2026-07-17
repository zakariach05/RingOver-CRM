import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { soundsEnabled, setSoundsEnabled } from '../../utils/audioManager'

export default function SoundPreferenceToggle() {
  const [enabled, setEnabled] = useState(soundsEnabled)

  useEffect(() => {
    setSoundsEnabled(enabled)
  }, [enabled])

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
      title={enabled ? 'Désactiver les sons' : 'Activer les sons'}
    >
      {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
    </button>
  )
}
