import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

interface BootstrapState {
  ready: boolean
  error: boolean
}

const MIN_DISPLAY_MS = 800
const SAFETY_TIMEOUT_MS = 8000

export function useAppBootstrap(): BootstrapState {
  const { token, loading: authLoading, logout } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const startTimeRef = useRef(Date.now())
  const readyRef = useRef(false)

  const finalizeWhenReady = useCallback(() => {
    if (readyRef.current) return
    readyRef.current = true
    const elapsed = Date.now() - startTimeRef.current
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)
    setTimeout(() => setReady(true), remaining)
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!token) {
      finalizeWhenReady()
      return
    }

    const controller = new AbortController()

    api.get('/auth/me', { signal: controller.signal as any })
      .then(() => finalizeWhenReady())
      .catch(() => {
        logout()
        setError(true)
        finalizeWhenReady()
      })

    return () => controller.abort()
  }, [authLoading, token, logout, finalizeWhenReady])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        readyRef.current = true
        setReady(true)
      }
    }, SAFETY_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [])

  return { ready, error }
}
