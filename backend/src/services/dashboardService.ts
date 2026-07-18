import { prisma } from '../utils/prisma'

interface PeriodResult {
  dateFrom: Date
  dateTo: Date
  previousDateFrom: Date
  previousDateTo: Date
  days: number
}

function parsePeriod(period?: string, from?: string, to?: string): PeriodResult {
  const dateTo = to ? new Date(to + 'T23:59:59.999Z') : new Date()
  let dateFrom: Date

  if (from) {
    dateFrom = new Date(from)
  } else {
    const days = Math.max(1, parseInt(period || '14') || 14)
    dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)
  }
  dateFrom.setHours(0, 0, 0, 0)

  const durationMs = dateTo.getTime() - dateFrom.getTime()
  const previousDateTo = new Date(dateFrom.getTime() - 1)
  previousDateTo.setHours(23, 59, 59, 999)
  const previousDateFrom = new Date(previousDateTo.getTime() - durationMs)

  return { dateFrom, dateTo, previousDateFrom, previousDateTo, days: Math.ceil(durationMs / 86400000) }
}

export async function getCallVolumeByDay(teamId: string, period?: string, from?: string, to?: string) {
  const { dateFrom, dateTo, days } = parsePeriod(period, from, to)

  const calls = await prisma.call.groupBy({
    by: ['startedAt'],
    where: { teamId, startedAt: { gte: dateFrom, lte: dateTo } },
    _count: { id: true },
  })

  const countMap = new Map<string, number>()
  calls.forEach((c) => {
    const key = c.startedAt.toISOString().split('T')[0]
    countMap.set(key, (countMap.get(key) || 0) + c._count.id)
  })

  const result: { date: string; label: string; count: number }[] = []
  const dayMs = 86400000
  for (let i = 0; i <= days; i++) {
    const d = new Date(dateFrom.getTime() + i * dayMs)
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    result.push({ date: key, label, count: countMap.get(key) || 0 })
  }

  return result
}

export async function getCallsByAgent(teamId: string, period?: string, from?: string, to?: string) {
  const { dateFrom, dateTo } = parsePeriod(period, from, to)

  const rows = await prisma.call.groupBy({
    by: ['agentId'],
    where: { teamId, startedAt: { gte: dateFrom, lte: dateTo } },
    _count: { id: true },
    _sum: { duration: true },
    _avg: { duration: true },
    orderBy: { _count: { id: 'desc' } },
  })

  const agentIds = rows.map((r) => r.agentId)
  const agents = agentIds.length
    ? await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
    : []
  const nameMap = new Map(agents.map((a) => [a.id, a.name]))

  return rows.map((r) => ({
    agentId: r.agentId,
    agentName: nameMap.get(r.agentId) || 'Inconnu',
    callCount: r._count.id,
    totalDuration: r._sum.duration || 0,
    avgDuration: Math.round(r._avg.duration || 0),
  }))
}

export async function getPipelineByStage(teamId: string) {
  const rows = await prisma.deal.groupBy({
    by: ['stage'],
    where: { teamId, stage: { notIn: ['LOST'] } },
    _sum: { value: true },
    _count: { id: true },
  })

  const stageOrder = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']
  const stageLabels: Record<string, string> = {
    LEAD: 'Prospect',
    QUALIFIED: 'Qualification',
    PROPOSAL: 'Proposition',
    NEGOTIATION: 'Négociation',
    WON: 'Gagné',
  }

  return stageOrder.map((stage) => {
    const found = rows.find((r) => r.stage === stage)
    return {
      stage,
      label: stageLabels[stage] || stage,
      totalValue: found?._sum.value || 0,
      count: found?._count.id || 0,
    }
  })
}

export async function getKpis(teamId: string, period?: string, from?: string, to?: string) {
  const { dateFrom, dateTo, previousDateFrom, previousDateTo } = parsePeriod(period, from, to)

  const [
    totalCalls, prevTotalCalls,
    missedCalls, prevMissedCalls,
    totalDuration, prevTotalDuration,
    totalContacts, openDeals,
    wonRevenue,
  ] = await Promise.all([
    prisma.call.count({ where: { teamId, startedAt: { gte: dateFrom, lte: dateTo } } }),
    prisma.call.count({ where: { teamId, startedAt: { gte: previousDateFrom, lte: previousDateTo } } }),
    prisma.call.count({ where: { teamId, startedAt: { gte: dateFrom, lte: dateTo }, status: { in: ['MISSED', 'NO_ANSWER'] } } }),
    prisma.call.count({ where: { teamId, startedAt: { gte: previousDateFrom, lte: previousDateTo }, status: { in: ['MISSED', 'NO_ANSWER'] } } }),
    prisma.call.aggregate({ where: { teamId, startedAt: { gte: dateFrom, lte: dateTo } }, _sum: { duration: true }, _count: { id: true } }),
    prisma.call.aggregate({ where: { teamId, startedAt: { gte: previousDateFrom, lte: previousDateTo } }, _sum: { duration: true }, _count: { id: true } }),
    prisma.contact.count({ where: { teamId, deletedAt: null } }),
    prisma.deal.count({ where: { teamId, stage: { notIn: ['WON', 'LOST'] } } }),
    prisma.deal.aggregate({ where: { teamId, stage: 'WON' }, _sum: { value: true } }),
  ])

  const avgCallDuration = totalDuration._count.id > 0
    ? Math.round((totalDuration._sum.duration || 0) / totalDuration._count.id)
    : 0
  const prevAvgDuration = prevTotalDuration._count.id > 0
    ? Math.round((prevTotalDuration._sum.duration || 0) / prevTotalDuration._count.id)
    : 0

  const delta = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    totalCalls,
    totalCallsDelta: delta(totalCalls, prevTotalCalls),
    totalContacts,
    openDeals,
    wonRevenue: wonRevenue._sum.value || 0,
    avgCallDuration,
    avgCallDurationDelta: delta(avgCallDuration, prevAvgDuration),
    missedCalls,
    missedCallsDelta: delta(missedCalls, prevMissedCalls),
  }
}
