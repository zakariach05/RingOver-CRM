import request from 'supertest'
import app from '../server'
import { prisma, cleanDb, createTestTeam, createTestUser, generateToken } from './helpers'
import { resetPresence } from '../services/presenceService'

beforeEach(async () => {
  await cleanDb()
  resetPresence()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Presence API', () => {
  let teamId: string
  let adminId: string
  let agentId: string
  let adminToken: string
  let agentToken: string

  beforeEach(async () => {
    const team = await createTestTeam()
    teamId = team.id

    const admin = await createTestUser(teamId, { email: 'admin-presence@test.com', role: 'ADMIN' })
    adminId = admin.id
    adminToken = generateToken(admin)

    const agent = await createTestUser(teamId, { email: 'agent-presence@test.com', role: 'AGENT' })
    agentId = agent.id
    agentToken = generateToken(agent)
  })

  const heartbeat = (token: string, page = '/dashboard', extra: Record<string, unknown> = {}) =>
    request(app).post('/api/presence/heartbeat').set('Authorization', `Bearer ${token}`).send({ page, ...extra })

  const listOnline = (token: string) =>
    request(app).get('/api/presence/online').set('Authorization', `Bearer ${token}`)

  describe('POST /api/presence/heartbeat', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/presence/heartbeat').send({ page: '/dashboard' })
      expect(res.status).toBe(401)
    })

    it('registers a session and returns a session_id', async () => {
      const res = await heartbeat(agentToken, '/contacts')
      expect(res.status).toBe(200)
      expect(typeof res.body.session_id).toBe('string')
      expect(res.body.session_id.length).toBeGreaterThan(0)
    })

    it('keeps the same session_id across heartbeats', async () => {
      const first = await heartbeat(agentToken, '/contacts')
      const second = await heartbeat(agentToken, '/deals', { sessionId: first.body.session_id })
      expect(second.body.session_id).toBe(first.body.session_id)
    })

    it('accepts the token in the body (navigator.sendBeacon case)', async () => {
      const res = await request(app)
        .post('/api/presence/heartbeat')
        .send({ page: '/dashboard', token: agentToken })
      expect(res.status).toBe(200)
      expect(res.body.session_id).toBeDefined()
    })

    it('removes the session when leave=true', async () => {
      const hb = await heartbeat(agentToken, '/dashboard')
      const res = await request(app)
        .post('/api/presence/heartbeat')
        .send({ page: '/dashboard', sessionId: hb.body.session_id, leave: true, token: agentToken })
      expect(res.status).toBe(200)

      const list = await listOnline(adminToken)
      expect(list.body.total).toBe(0)
    })
  })

  describe('GET /api/presence/online', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/presence/online')
      expect(res.status).toBe(401)
    })

    it('is forbidden for non-admin roles', async () => {
      const res = await listOnline(agentToken)
      expect(res.status).toBe(403)
    })

    it('returns an empty list when nobody is connected', async () => {
      const res = await listOnline(adminToken)
      expect(res.status).toBe(200)
      expect(res.body.total).toBe(0)
      expect(res.body.users_online).toEqual([])
    })

    it('returns the online users with expected shape', async () => {
      await heartbeat(agentToken, '/contacts')
      const res = await listOnline(adminToken)
      expect(res.status).toBe(200)
      expect(res.body.total).toBe(1)
      expect(res.body.updated_at).toBeDefined()
      expect(res.body.users_online[0]).toMatchObject({
        id: agentId,
        name: expect.any(String),
        email: 'agent-presence@test.com',
        role: 'AGENT',
        avatar_url: null,
        status: 'active',
        current_page: '/contacts',
      })
      expect(res.body.users_online[0].connected_at).toBeDefined()
      expect(res.body.users_online[0].last_activity).toBeDefined()
      expect(res.body.users_online[0].session_id).toBeDefined()
    })

    it('groups multiple sessions of the same user into one row', async () => {
      const first = await heartbeat(agentToken, '/contacts')
      await heartbeat(agentToken, '/dashboard', { sessionId: first.body.session_id })
      const res = await listOnline(adminToken)
      expect(res.body.total).toBe(1)
      expect(res.body.users_online[0].current_page).toBe('/dashboard')
    })

    it('only exposes users from the same team', async () => {
      const otherTeam = await createTestTeam()
      const otherUser = await createTestUser(otherTeam.id, { email: 'other-team@test.com', role: 'AGENT' })
      const otherToken = generateToken(otherUser)
      await heartbeat(otherToken, '/dashboard')

      const res = await listOnline(adminToken)
      expect(res.body.total).toBe(0)
    })
  })

  describe('POST /api/presence/:userId/disconnect', () => {
    it('allows an admin to force-disconnect a user', async () => {
      await heartbeat(agentToken, '/dashboard')
      const res = await request(app)
        .post(`/api/presence/${agentId}/disconnect`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)

      const list = await listOnline(adminToken)
      expect(list.body.total).toBe(0)
    })

    it('is forbidden for non-admin roles', async () => {
      const res = await request(app)
        .post(`/api/presence/${adminId}/disconnect`)
        .set('Authorization', `Bearer ${agentToken}`)
      expect(res.status).toBe(403)
    })

    it('revokes the token: subsequent authenticated requests return 401', async () => {
      await heartbeat(agentToken, '/dashboard')
      await request(app)
        .post(`/api/presence/${agentId}/disconnect`)
        .set('Authorization', `Bearer ${adminToken}`)

      const after = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${agentToken}`)
      expect(after.status).toBe(401)
      expect(after.body.error).toBe('TOKEN_REVOKED')
    })
  })
})
