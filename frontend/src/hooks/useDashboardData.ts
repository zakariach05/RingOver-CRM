import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

export interface DashboardKPI {
  totalCalls: number
  totalCallsDelta: number | null
  totalContacts: number
  openDeals: number
  wonRevenue: number
  avgCallDuration: number
  avgCallDurationDelta: number | null
  missedCalls: number
  missedCallsDelta: number | null
}

export interface DayData { date: string; label: string; count: number }
export interface AgentData { agentId: string; agentName: string; callCount: number; totalDuration: number; avgDuration: number }
export interface StageData { stage: string; label: string; totalValue: number; count: number }

export interface DashboardData {
  kpi: DashboardKPI
  callsByDay: DayData[]
  callsByAgent: AgentData[]
  pipeline: StageData[]
}

export interface PeriodState {
  mode: 'preset' | 'custom'
  preset: string
  from: string
  to: string
}

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
