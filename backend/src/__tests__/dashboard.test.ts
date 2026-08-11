import request from 'supertest'
import app from '../server'
import { prisma, cleanDb, createTestTeam, createTestUser, generateToken } from './helpers'

beforeEach(async () => {
  await cleanDb()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Dashboard API', () => {
  let teamId: string
  let adminId: string
  let agentId: string
  let adminToken: string
  let agentToken: string
  let contactId: string

  beforeEach(async () => {
    const team = await createTestTeam()
    teamId = team.id

    const admin = await createTestUser(teamId, { email: 'admin-dash@test.com', role: 'ADMIN' })
    adminId = admin.id
    adminToken = generateToken(admin)

    const agent = await createTestUser(teamId, { email: 'agent-dash@test.com', role: 'AGENT' })
    agentId = agent.id
    agentToken = generateToken(agent)

    const contact = await prisma.contact.create({
      data: { name: 'Dash Contact', phone: '+33600000001', teamId, ownerId: adminId },
    })
    contactId = contact.id
  })

  describe('Cache invalidation', () => {
    it('should invalidate cache when a call is initiated', async () => {
      const res1 = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res1.status).toBe(200)
      expect(res1.body.kpi).toBeDefined()

      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contactId, toNumber: '+33699999999' })

      const res2 = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res2.status).toBe(200)
      expect(res2.body.kpi.totalCalls).toBeGreaterThanOrEqual(1)
    })

    it('should invalidate cache when a deal is created', async () => {
      const res1 = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res1.body.kpi.openDeals).toBe(0)

      const createRes = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Cache Test Deal', value: 1000, contactId })
      expect(createRes.status).toBe(201)

      const res2 = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res2.body.kpi.openDeals).toBe(1)
    })

    it('should invalidate cache when a deal stage is updated', async () => {
      const dealRes = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Stage Deal', value: 500, contactId })
      expect(dealRes.status).toBe(201)
      const dealId = dealRes.body.deal.id

      await request(app)
        .patch(`/deals/${dealId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'QUALIFIED' })

      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/dashboard/stats', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/stats')
      expect(res.status).toBe(401)
    })

    it('should return KPIs with zero values for empty data', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.kpi).toEqual(
        expect.objectContaining({
          totalCalls: 0,
          totalContacts: 1,
          openDeals: 0,
          wonRevenue: 0,
          avgCallDuration: 0,
          missedCalls: 0,
        })
      )
    })

    it('should compute KPIs correctly after creating calls and deals', async () => {
      await prisma.call.create({
        data: {
          teamId,
          agentId,
          contactId,
          fromNumber: '+33600000000',
          toNumber: '+33611111111',
          status: 'COMPLETED',
          direction: 'OUTBOUND',
          duration: 120,
          startedAt: new Date(),
        },
      })

      await prisma.call.create({
        data: {
          teamId,
          agentId,
          contactId,
          fromNumber: '+33600000000',
          toNumber: '+33622222222',
          status: 'MISSED',
          direction: 'OUTBOUND',
          duration: 0,
          startedAt: new Date(),
        },
      })

      await prisma.deal.create({
        data: {
          title: 'Won Deal',
          value: 5000,
          stage: 'WON',
          contactId,
          ownerId: adminId,
          teamId,
        },
      })

      const dealApiRes = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Open Deal', value: 2000, contactId })
      expect(dealApiRes.status).toBe(201)

      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.kpi.totalCalls).toBe(2)
      expect(res.body.kpi.missedCalls).toBe(1)
      expect(res.body.kpi.openDeals).toBe(1)
      expect(res.body.kpi.wonRevenue).toBe(5000)
      expect(res.body.kpi.avgCallDuration).toBe(60)
    })

    it('should exclude LOST deals from pipeline', async () => {
      await prisma.deal.create({
        data: { title: 'Lost', value: 1000, stage: 'LOST', contactId, ownerId: adminId, teamId },
      })
      await prisma.deal.create({
        data: { title: 'Won', value: 3000, stage: 'WON', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.kpi.openDeals).toBe(0)
      expect(res.body.kpi.wonRevenue).toBe(3000)
    })

    it('should support custom date range via from/to params', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 30)
      await prisma.call.create({
        data: {
          teamId,
          agentId,
          contactId,
          fromNumber: '+33600000000',
          toNumber: '+33600000099',
          status: 'COMPLETED',
          direction: 'OUTBOUND',
          duration: 60,
          startedAt: oldDate,
        },
      })

      const from = new Date()
      from.setDate(from.getDate() - 5)
      const fromStr = from.toISOString().split('T')[0]

      const res = await request(app)
        .get(`/api/dashboard/stats?from=${fromStr}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.kpi.totalCalls).toBe(0)
    })

    it('should return callsByDay array', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?period=7')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.callsByDay)).toBe(true)
      expect(res.body.callsByDay.length).toBeGreaterThan(0)
      expect(res.body.callsByDay[0]).toHaveProperty('date')
      expect(res.body.callsByDay[0]).toHaveProperty('label')
      expect(res.body.callsByDay[0]).toHaveProperty('count')
    })

    it('should return callsByAgent array', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.callsByAgent)).toBe(true)
    })

    it('should return pipeline with all stage labels', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.pipeline)).toBe(true)
      expect(res.body.pipeline.length).toBe(5)
      const labels = res.body.pipeline.map((s: any) => s.label)
      expect(labels).toContain('Lead')
      expect(labels).toContain('Gagné')
    })

    it('should return all top-level keys', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?period=14')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('kpi')
      expect(res.body).toHaveProperty('callsByDay')
      expect(res.body).toHaveProperty('callsByAgent')
      expect(res.body).toHaveProperty('pipeline')
    })
  })
})
