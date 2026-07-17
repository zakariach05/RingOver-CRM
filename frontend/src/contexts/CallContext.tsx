import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { Call } from '../api/calls.api'

interface CallContextType {
  activeCall: Call | null
  setActiveCall: (call: Call | null) => void
  updateCall: (data: Partial<Call>) => void
  callDuration: number
  endedCall: Call | null
  dismissEndedCall: () => void
  hold: boolean
  speaker: boolean
  toggleHold: () => void
  toggleSpeaker: () => void
  resetAudioState: () => void
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCallState] = useState<Call | null>(null)
  const [endedCall, setEndedCall] = useState<Call | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [hold, setHold] = useState(false)
  const [speaker, setSpeaker] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const setActiveCall = useCallback((call: Call | null) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (call && ['INITIATED', 'RINGING', 'ANSWERED'].includes(call.status)) {
      startTimeRef.current = call.startedAt
        ? new Date(call.startedAt).getTime()
        : Date.now()
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
    } else if (!call) {
      startTimeRef.current = null
      setCallDuration(0)
    } else {
      startTimeRef.current = null
      setCallDuration(0)
      setEndedCall(call)
    }

    setActiveCallState(call)
  }, [])

  const dismissEndedCall = useCallback(() => setEndedCall(null), [])

  const updateCall = useCallback((data: Partial<Call>) => {
    setActiveCallState((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      if (data.status && !['INITIATED', 'RINGING', 'ANSWERED'].includes(data.status)) {
        setEndedCall(updated)
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        startTimeRef.current = null
        setCallDuration(0)
        setHold(false)
        setSpeaker(false)
        return null
      }
      return updated
    })
  }, [])

  const toggleHold = useCallback(() => setHold((p) => !p), [])

  const toggleSpeaker = useCallback(() => setSpeaker((p) => !p), [])

  const resetAudioState = useCallback(() => {
    setHold(false)
    setSpeaker(false)
  }, [])

  return (
    <CallContext.Provider value={{
      activeCall, setActiveCall, updateCall, callDuration, endedCall, dismissEndedCall,
      hold, speaker, toggleHold, toggleSpeaker, resetAudioState,
    }}>
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within CallProvider')
  return ctx
}
