import { useEffect, useRef } from 'react'
import { useCall } from '../contexts/CallContext'
import {
  soundsEnabled,
  playRinging,
  playConnected,
  playDisconnected,
  playError,
} from '../utils/audioManager'

export function useCallSounds() {
  const { activeCall } = useCall()
  const prevStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeCall || !soundsEnabled()) {
      prevStatusRef.current = activeCall?.status ?? null
      return
    }

    const prev = prevStatusRef.current
    const curr = activeCall.status

    if (prev !== curr) {
      if (curr === 'RINGING') playRinging()
      else if (curr === 'ANSWERED') playConnected()
      else if (curr === 'ENDED') playDisconnected()
      else if (curr === 'FAILED') playError()
    }

    prevStatusRef.current = curr
  }, [activeCall?.status])
}
