import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DashboardKPI {
  totalCalls: number
  totalCallsDelta: number | null
  callsToday: number
  totalContacts: number
  openDeals: number
  wonRevenue: number
  openPipelineValue: number
  avgCallDuration: number
  avgCallDurationDelta: number | null
  answerRate: number
  answerRateDelta: number | null
  missedCalls: number
  missedCallsDelta: number | null
  answeredCalls: number
}

export interface DayData {
  date: string
  label: string
  count: number
  inbound: number
  outbound: number
}

export interface AgentData {
  agentId: string
  agentName: string
  callCount: number
  totalDuration: number
  avgDuration: number
}

export interface StageData {
  stage: string
  label: string
  totalValue: number
  count: number
}

export interface HourData {
  hour: number
  label: string
  count: number
}

export interface ActivityEvent {
  id: string
  type: 'call' | 'deal'
  title: string
  subtitle: string
  timestamp: string
  status?: string
}

export interface DashboardData {
  kpi: DashboardKPI
  callsByDay: DayData[]
  callsByAgent: AgentData[]
  callsByHour: HourData[]
  pipeline: StageData[]
}

export interface PeriodState {
  mode: 'preset' | 'custom'
  preset: string
  from: string
  to: string
}

// ── Hook principal ─────────────────────────────────────────────────────────

export function useDashboardData(period: PeriodState) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (period.mode === 'preset') {
        params.period = period.preset
      } else {
        if (period.from) params.from = period.from
        if (period.to) params.to = period.to
      }
      const res = await api.get('/api/dashboard/stats', { params })
      setData(res.data)
    } catch {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, retry: fetchData }
}

// ── Hook activité récente (polling 30s) ────────────────────────────────────

export function useRecentActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard/activity')
      setEvents(res.data)
    } catch {
      // silencieux — pas de toast sur le polling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
    intervalRef.current = setInterval(fetchActivity, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchActivity])

  return { events, loading }
}
