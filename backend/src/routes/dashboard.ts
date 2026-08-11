import { Router, Request, Response } from 'express'
import { authenticate } from '../types'
import {
  getCallVolumeByDay,
  getCallsByAgent,
  getCallsByHour,
  getPipelineByStage,
  getKpis,
  getRecentActivity,
} from '../services/dashboardService'
import { getCached, setCache } from '../services/dashboardCache'

const router = Router()

// ── Stats principales ──────────────────────────────────────────────────────
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  const start = Date.now()
  try {
    const teamId = req.user!.teamId
    const userId = req.user!.id
    const userRole = req.user!.role
    const { period, from, to } = req.query as Record<string, string>
    const cacheKey = `stats:${period || '14'}:${from || ''}:${to || ''}:${userRole === 'AGENT' ? userId : 'TEAM'}`

    const cached = getCached(teamId, cacheKey)
    if (cached) return res.json(cached)

    const [callsByDay, callsByAgent, callsByHour, pipeline, kpi] = await Promise.all([
      getCallVolumeByDay(teamId, userRole, userId, period, from, to),
      getCallsByAgent(teamId, userRole, userId, period, from, to),
      getCallsByHour(teamId, userRole, userId, period, from, to),
      getPipelineByStage(teamId, userRole, userId),
      getKpis(teamId, userRole, userId, period, from, to),
    ])

    const result = { kpi, callsByDay, callsByAgent, callsByHour, pipeline }
    setCache(teamId, cacheKey, result)

    console.log(`[Dashboard] ${teamId} - ${Date.now() - start}ms`)
    return res.json(result)
  } catch (error) {
    console.error('[Dashboard] Error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── Activité récente (polling) ─────────────────────────────────────────────
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const teamId = req.user!.teamId
    const userId = req.user!.id
    const userRole = req.user!.role
    const events = await getRecentActivity(teamId, userRole, userId)
    return res.json(events)
  } catch (error) {
    console.error('[Dashboard/Activity] Error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
