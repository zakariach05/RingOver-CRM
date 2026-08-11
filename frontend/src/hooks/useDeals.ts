import { useState, useEffect, useCallback } from 'react'
import { dealsApi, Deal } from '../api/deals.api'

const STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const

export function useDeals(initialScope = 'all') {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState(initialScope)
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [valueMin, setValueMin] = useState<string>('')
  const [valueMax, setValueMax] = useState<string>('')

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { scope }
      if (ownerFilter) params.ownerId = ownerFilter
      if (valueMin) params.valueMin = valueMin
      if (valueMax) params.valueMax = valueMax
      const res = await dealsApi.list(params)
      setDeals(res.data.deals)
    } catch {
      setError('Erreur lors du chargement des affaires')
    } finally {
      setLoading(false)
    }
  }, [scope, ownerFilter, valueMin, valueMax])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  const moveDeal = useCallback(async (dealId: string, newStage: string) => {
    const previousDeals = deals

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    )

    try {
      await dealsApi.updateStage(dealId, newStage)
    } catch {
      setDeals(previousDeals)
      throw new Error('DEAL_LOCKED')
    }
  }, [deals])

  const createDeal = useCallback(async (data: { title: string; value: number; contactId?: string; stage?: string }) => {
    const res = await dealsApi.create(data)
    setDeals((prev) => [res.data.deal, ...prev])
    return res.data.deal
  }, [])

  const deleteDeal = useCallback(async (id: string) => {
    await dealsApi.delete(id)
    setDeals((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const getDealsByStage = useCallback((stage: string) => {
    return deals.filter((d) => d.stage === stage)
  }, [deals])

  const getStageStats = useCallback((stage: string) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    const total = stageDeals.reduce((sum, d) => sum + d.value, 0)
    return { count: stageDeals.length, total }
  }, [deals])

  return {
    deals, loading, error, scope, setScope,
    ownerFilter, setOwnerFilter, valueMin, setValueMin, valueMax, setValueMax,
    fetchDeals, moveDeal, createDeal, deleteDeal, getDealsByStage, getStageStats,
    STAGES,
  }
}

export function useOpenDealsCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    dealsApi.list({ scope: 'open', pageSize: '1' })
      .then((res) => setCount(res.data.total))
      .catch(() => {})
  }, [])

  return count
}

