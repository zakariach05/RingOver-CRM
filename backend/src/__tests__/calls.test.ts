import request from 'supertest'
import app from '../server'
import { prisma, cleanDb, createTestTeam, createTestUser, generateToken } from './helpers'

beforeEach(async () => {
  await cleanDb()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Calls API', () => {
  let teamId: string
  let adminId: string
  let agentId: string
  let agent2Id: string
  let adminToken: string
  let agentToken: string
  let agent2Token: string
  let contactId: string

  beforeEach(async () => {
    const team = await createTestTeam()
    teamId = team.id

    const admin = await createTestUser(teamId, { email: 'admin-call@test.com', role: 'ADMIN' })
    adminId = admin.id
    adminToken = generateToken(admin)

    const agent = await createTestUser(teamId, { email: 'agent-call@test.com', role: 'AGENT' })
    agentId = agent.id
    agentToken = generateToken(agent)

    const agent2 = await createTestUser(teamId, { email: 'agent2-call@test.com', role: 'AGENT' })
    agent2Id = agent2.id
    agent2Token = generateToken(agent2)

    const contact = await prisma.contact.create({
      data: { name: 'Call Contact', phone: '+33612345678', teamId, ownerId: adminId },
    })
    contactId = contact.id
  })

  describe('POST /api/calls/initiate', () => {
    it('should initiate a call', async () => {
      const res = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432', contactId })

      expect(res.status).toBe(201)
      expect(res.body.call.status).toBe('INITIATED')
      expect(res.body.call.direction).toBe('OUTBOUND')
      expect(res.body.call.toNumber).toBe('+33698765432')
      expect(res.body.call.agentId).toBe(agentId)
      expect(res.body.call.contactId).toBe(contactId)
    })

    it('should initiate call without contact', async () => {
      const res = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      expect(res.status).toBe(201)
      expect(res.body.call.contactId).toBeNull()
    })

    it('should reject call without number', async () => {
      const res = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('TO_NUMBER_REQUIRED')
    })

    it('should block simultaneous calls (409)', async () => {
      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const res = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33611111111' })

      expect(res.status).toBe(409)
      expect(res.body.error).toBe('ALREADY_ON_CALL')
    })

    it('should reject invalid contact', async () => {
      const res = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432', contactId: 'nonexistent' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('INVALID_CONTACT')
    })

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/calls/initiate')
        .send({ toNumber: '+33698765432' })

      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/calls/:id/hangup', () => {
    it('should hangup a call', async () => {
      const initRes = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const callId = initRes.body.call.id

      const res = await request(app)
        .patch(`/api/calls/${callId}/hangup`)
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ENDED')
      expect(res.body.endedAt).toBeDefined()
      expect(res.body.duration).toBeGreaterThanOrEqual(0)
    })

    it('agent cannot hangup other agent call', async () => {
      const initRes = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const callId = initRes.body.call.id

      const res = await request(app)
        .patch(`/api/calls/${callId}/hangup`)
        .set('Authorization', `Bearer ${agent2Token}`)

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /api/calls/:id', () => {
    it('should update call note and contact', async () => {
      const initRes = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const callId = initRes.body.call.id

      const res = await request(app)
        .patch(`/api/calls/${callId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ note: 'Good call', contactId })

      expect(res.status).toBe(200)
      expect(res.body.note).toBe('Good call')
      expect(res.body.contactId).toBe(contactId)
    })

    it('agent cannot update other agent call', async () => {
      const initRes = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const callId = initRes.body.call.id

      const res = await request(app)
        .patch(`/api/calls/${callId}`)
        .set('Authorization', `Bearer ${agent2Token}`)
        .send({ note: 'Hijack' })

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/calls', () => {
    it('agent sees only own calls', async () => {
      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agent2Token}`)
        .send({ toNumber: '+33611111111' })

      const res = await request(app)
        .get('/api/calls')
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.calls.length).toBe(1)
      expect(res.body.calls[0].agentId).toBe(agentId)
    })

    it('admin sees all team calls', async () => {
      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agent2Token}`)
        .send({ toNumber: '+33611111111' })

      const res = await request(app)
        .get('/api/calls')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.calls.length).toBe(2)
    })

    it('should filter by direction', async () => {
      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const res = await request(app)
        .get('/api/calls?direction=OUTBOUND')
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.calls.length).toBe(1)
    })

    it('should filter by search query', async () => {
      await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432', contactId })

      const res = await request(app)
        .get('/api/calls?q=Call+Contact')
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.calls.length).toBe(1)
    })
  })

  describe('GET /api/calls/:id', () => {
    it('should get call by id', async () => {
      const initRes = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const callId = initRes.body.call.id

      const res = await request(app)
        .get(`/api/calls/${callId}`)
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.id).toBe(callId)
    })

    it('agent cannot view other agent call', async () => {
      const initRes = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ toNumber: '+33698765432' })

      const callId = initRes.body.call.id

      const res = await request(app)
        .get(`/api/calls/${callId}`)
        .set('Authorization', `Bearer ${agent2Token}`)

      expect(res.status).toBe(403)
    })
  })
})
