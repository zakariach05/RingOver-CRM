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

// ── Volume d'appels par jour (inbound + outbound) ──────────────────────────
export async function getCallVolumeByDay(
  teamId: string, role: string, userId: string,
  period?: string, from?: string, to?: string,
) {
  const { dateFrom, dateTo, days } = parsePeriod(period, from, to)

  const where: any = { teamId, startedAt: { gte: dateFrom, lte: dateTo } }
  if (role === 'AGENT') where.agentId = userId

  const calls = await prisma.call.findMany({
    where,
    select: { startedAt: true, direction: true },
  })

  const inMap = new Map<string, number>()
  const outMap = new Map<string, number>()

  calls.forEach((c) => {
    const key = c.startedAt.toISOString().split('T')[0]
    const dir = (c.direction || '').toUpperCase()
    if (dir === 'OUTBOUND') {
      outMap.set(key, (outMap.get(key) || 0) + 1)
    } else {
      inMap.set(key, (inMap.get(key) || 0) + 1)
    }
  })

  const result: { date: string; label: string; count: number; inbound: number; outbound: number }[] = []
  const dayMs = 86400000
  for (let i = 0; i <= days; i++) {
    const d = new Date(dateFrom.getTime() + i * dayMs)
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    const inbound = inMap.get(key) || 0
    const outbound = outMap.get(key) || 0
    result.push({ date: key, label, count: inbound + outbound, inbound, outbound })
  }

  return result
}

// ── Appels par agent ───────────────────────────────────────────────────────
export async function getCallsByAgent(
  teamId: string, role: string, userId: string,
  period?: string, from?: string, to?: string,
) {
  const { dateFrom, dateTo } = parsePeriod(period, from, to)

  const where: any = { teamId, startedAt: { gte: dateFrom, lte: dateTo } }
  if (role === 'AGENT') where.agentId = userId

  const rows = await prisma.call.groupBy({
    by: ['agentId'],
    where,
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

// ── Appels par heure de la journée ─────────────────────────────────────────
export async function getCallsByHour(
  teamId: string, role: string, userId: string,
  period?: string, from?: string, to?: string,
) {
  const { dateFrom, dateTo } = parsePeriod(period, from, to)

  const where: any = { teamId, startedAt: { gte: dateFrom, lte: dateTo } }
  if (role === 'AGENT') where.agentId = userId

  const calls = await prisma.call.findMany({
    where,
    select: { startedAt: true },
  })

  const hourMap = new Map<number, number>()
  calls.forEach((c) => {
    const h = c.startedAt.getHours()
    hourMap.set(h, (hourMap.get(h) || 0) + 1)
  })

  const result: { hour: number; label: string; count: number }[] = []
  for (let h = 0; h <= 23; h++) {
    result.push({
      hour: h,
      label: `${h}h`,
      count: hourMap.get(h) || 0,
    })
  }
  return result
}

// ── Pipeline par étape ─────────────────────────────────────────────────────
export async function getPipelineByStage(teamId: string, role: string, userId: string) {
  const where: any = { teamId, stage: { notIn: ['LOST'] } }
  if (role === 'AGENT') where.ownerId = userId

  const rows = await prisma.deal.groupBy({
    by: ['stage'],
    where,
    _sum: { value: true },
    _count: { id: true },
  })

  const stageOrder = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']
  const stageLabels: Record<string, string> = {
    LEAD: 'Lead',
    QUALIFIED: 'Qualifié',
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

// ── Activité récente ───────────────────────────────────────────────────────
export async function getRecentActivity(teamId: string, role: string, userId: string) {
  const callWhere: any = { teamId }
  const dealWhere: any = { teamId }
  if (role === 'AGENT') {
    callWhere.agentId = userId
    dealWhere.ownerId = userId
  }

  const [recentCalls, recentDeals] = await Promise.all([
    prisma.call.findMany({
      where: callWhere,
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        contact: { select: { name: true } },
        agent: { select: { name: true } },
      },
    }),
    prisma.deal.findMany({
      where: dealWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        owner: { select: { name: true } },
      },
    }),
  ])

  const stageLabels: Record<string, string> = {
    LEAD: 'Lead',
    QUALIFIED: 'Qualifié',
    PROPOSAL: 'Proposition',
    NEGOTIATION: 'Négociation',
    WON: 'Gagné',
    LOST: 'Perdu',
  }

  type ActivityEvent = {
    id: string
    type: 'call' | 'deal'
    title: string
    subtitle: string
    timestamp: string
    status?: string
  }

  const events: ActivityEvent[] = [
    ...recentCalls.map((c) => {
      const contactName = c.contact?.name || 'Contact inconnu'
      const durStr = c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}` : '—'
      return {
        id: `call-${c.id}`,
        type: 'call' as const,
        title: `${c.agent?.name || 'Agent'} — appel avec ${contactName}`,
        subtitle: `Durée : ${durStr}`,
        timestamp: c.startedAt.toISOString(),
        status: c.status,
      }
    }),
    ...recentDeals.map((d) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: `Deal : ${d.title}`,
      subtitle: `${stageLabels[d.stage] || d.stage} — ${(d.value || 0).toLocaleString('fr-FR')} €`,
      timestamp: d.updatedAt.toISOString(),
      status: d.stage,
    })),
  ]

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return events.slice(0, 8)
}

// ── KPIs principaux ────────────────────────────────────────────────────────
export async function getKpis(
  teamId: string, role: string, userId: string,
  period?: string, from?: string, to?: string,
) {
  const { dateFrom, dateTo, previousDateFrom, previousDateTo } = parsePeriod(period, from, to)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const callWhere: any = { teamId }
  const contactWhere: any = { teamId, deletedAt: null }
  const dealWhere: any = { teamId }
  if (role === 'AGENT') {
    callWhere.agentId = userId
    contactWhere.ownerId = userId
    dealWhere.ownerId = userId
  }

  const [
    totalCalls, prevTotalCalls,
    missedCalls, prevMissedCalls,
    answeredCalls, prevAnsweredCalls,
    totalDuration, prevTotalDuration,
    totalContacts, openDeals,
    wonRevenue, openPipelineValue,
    callsToday,
  ] = await Promise.all([
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: dateFrom, lte: dateTo } } }),
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: previousDateFrom, lte: previousDateTo } } }),
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: dateFrom, lte: dateTo }, status: { in: ['MISSED', 'NO_ANSWER'] } } }),
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: previousDateFrom, lte: previousDateTo }, status: { in: ['MISSED', 'NO_ANSWER'] } } }),
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: dateFrom, lte: dateTo }, status: 'ANSWERED' } }),
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: previousDateFrom, lte: previousDateTo }, status: 'ANSWERED' } }),
    prisma.call.aggregate({ where: { ...callWhere, startedAt: { gte: dateFrom, lte: dateTo } }, _sum: { duration: true }, _count: { id: true } }),
    prisma.call.aggregate({ where: { ...callWhere, startedAt: { gte: previousDateFrom, lte: previousDateTo } }, _sum: { duration: true }, _count: { id: true } }),
    prisma.contact.count({ where: contactWhere }),
    prisma.deal.count({ where: { ...dealWhere, stage: { notIn: ['WON', 'LOST'] } } }),
    prisma.deal.aggregate({ where: { ...dealWhere, stage: 'WON' }, _sum: { value: true } }),
    prisma.deal.aggregate({ where: { ...dealWhere, stage: { notIn: ['WON', 'LOST'] } }, _sum: { value: true } }),
    prisma.call.count({ where: { ...callWhere, startedAt: { gte: todayStart, lte: todayEnd } } }),
  ])

  const avgCallDuration = totalDuration._count.id > 0
    ? Math.round((totalDuration._sum.duration || 0) / totalDuration._count.id)
    : 0
  const prevAvgDuration = prevTotalDuration._count.id > 0
    ? Math.round((prevTotalDuration._sum.duration || 0) / prevTotalDuration._count.id)
    : 0

  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0
  const prevAnswerRate = prevTotalCalls > 0 ? Math.round((prevAnsweredCalls / prevTotalCalls) * 100) : 0

  const delta = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    totalCalls,
    totalCallsDelta: delta(totalCalls, prevTotalCalls),
    callsToday,
    totalContacts,
    openDeals,
    wonRevenue: wonRevenue._sum.value || 0,
    openPipelineValue: openPipelineValue._sum.value || 0,
    avgCallDuration,
    avgCallDurationDelta: delta(avgCallDuration, prevAvgDuration),
    answerRate,
    answerRateDelta: delta(answerRate, prevAnswerRate),
    missedCalls,
    missedCallsDelta: delta(missedCalls, prevMissedCalls),
    answeredCalls,
  }
}
