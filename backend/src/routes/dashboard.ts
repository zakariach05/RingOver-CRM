import { Router, Request, Response } from 'express'
import { authenticate } from '../types'
import { getCallVolumeByDay, getCallsByAgent, getPipelineByStage, getKpis } from '../services/dashboardService'
import { getCached, setCache } from '../services/dashboardCache'

const router = Router()

router.get('/stats', authenticate, async (req: Request, res: Response) => {
  const start = Date.now()
  try {
    const teamId = req.user!.teamId
    const { period, from, to } = req.query as Record<string, string>
    const cacheKey = `stats:${period || '14'}:${from || ''}:${to || ''}`

    const cached = getCached(teamId, cacheKey)
    if (cached) {
      return res.json(cached)
    }

    const [callsByDay, callsByAgent, pipeline, kpi] = await Promise.all([
      getCallVolumeByDay(teamId, period, from, to),
      getCallsByAgent(teamId, period, from, to),
      getPipelineByStage(teamId),
      getKpis(teamId, period, from, to),
    ])

    const result = { kpi, callsByDay, callsByAgent, pipeline }
    setCache(teamId, cacheKey, result)

    console.log(`[Dashboard] ${teamId} - ${Date.now() - start}ms`)
    return res.json(result)
  } catch (error) {
    console.error('[Dashboard] Error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
