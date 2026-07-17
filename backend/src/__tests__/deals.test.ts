import request from 'supertest'
import app from '../server'
import { prisma, cleanDb, createTestTeam, createTestUser, generateToken } from './helpers'

beforeEach(async () => {
  await cleanDb()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Deals API', () => {
  let teamId: string
  let adminId: string
  let managerId: string
  let agentId: string
  let agent2Id: string
  let adminToken: string
  let managerToken: string
  let agentToken: string
  let agent2Token: string
  let contactId: string

  beforeEach(async () => {
    const team = await createTestTeam()
    teamId = team.id

    const admin = await createTestUser(teamId, { email: 'admin-deal@test.com', role: 'ADMIN' })
    adminId = admin.id
    adminToken = generateToken(admin)

    const manager = await createTestUser(teamId, { email: 'manager-deal@test.com', role: 'MANAGER' })
    managerId = manager.id
    managerToken = generateToken(manager)

    const agent = await createTestUser(teamId, { email: 'agent-deal@test.com', role: 'AGENT' })
    agentId = agent.id
    agentToken = generateToken(agent)

    const agent2 = await createTestUser(teamId, { email: 'agent2-deal@test.com', role: 'AGENT' })
    agent2Id = agent2.id
    agent2Token = generateToken(agent2)

    const contact = await prisma.contact.create({
      data: { name: 'Test Contact', phone: '+33612345678', teamId, ownerId: adminId },
    })
    contactId = contact.id
  })

  describe('POST /deals', () => {
    it('should create a deal with required contact', async () => {
      const res = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Deal Test', value: 5000, contactId })

      expect(res.status).toBe(201)
      expect(res.body.deal.title).toBe('Deal Test')
      expect(res.body.deal.value).toBe(5000)
      expect(res.body.deal.stage).toBe('LEAD')
      expect(res.body.deal.contactId).toBe(contactId)
    })

    it('should reject deal without contact', async () => {
      const res = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Contact', value: 1000 })

      expect(res.status).toBe(400)
    })

    it('should reject deal with invalid contact', async () => {
      const res = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad Contact', value: 1000, contactId: 'nonexistent' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('INVALID_CONTACT')
    })

    it('should reject invalid stage', async () => {
      const res = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad Stage', value: 1000, contactId, stage: 'INVALID' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('INVALID_STAGE')
    })

    it('agent cannot create deal in closed stage', async () => {
      const res = await request(app)
        .post('/deals')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ title: 'Agent Won', value: 1000, contactId, stage: 'WON' })

      expect(res.status).toBe(403)
    })
  })

  describe('GET /deals', () => {
    it('should list deals', async () => {
      await prisma.deal.create({
        data: { title: 'Listed Deal', value: 3000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .get('/deals')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.deals.length).toBe(1)
    })

    it('agent sees only own deals', async () => {
      await prisma.deal.create({
        data: { title: 'Admin Deal', value: 3000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })
      await prisma.deal.create({
        data: { title: 'Agent Deal', value: 2000, stage: 'LEAD', contactId, ownerId: agentId, teamId },
      })

      const res = await request(app)
        .get('/deals')
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.deals.length).toBe(1)
      expect(res.body.deals[0].title).toBe('Agent Deal')
    })
  })

  describe('GET /deals/:id', () => {
    it('should get deal by id', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Get Deal', value: 5000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .get(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Get Deal')
    })

    it('agent cannot view other agent deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Admin Deal', value: 5000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .get(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(403)
    })
  })

  describe('PUT /deals/:id', () => {
    it('should update deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Old Title', value: 5000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .put(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New Title' })

      expect(res.status).toBe(200)
      expect(res.body.title).toBe('New Title')
    })

    it('agent cannot close a deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Agent Deal', value: 5000, stage: 'LEAD', contactId, ownerId: agentId, teamId },
      })

      const res = await request(app)
        .put(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ stage: 'WON' })

      expect(res.status).toBe(403)
    })

    it('agent cannot edit closed deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Closed Deal', value: 5000, stage: 'WON', contactId, ownerId: agentId, teamId, closedAt: new Date() },
      })

      const res = await request(app)
        .put(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ title: 'Modified' })

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('CANNOT_EDIT_CLOSED_DEAL')
    })
  })

  describe('PATCH /deals/:id/stage', () => {
    it('should update stage and set closedAt', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Stage Deal', value: 5000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'WON' })

      expect(res.status).toBe(200)
      expect(res.body.stage).toBe('WON')
      expect(res.body.closedAt).toBeDefined()
    })

    it('should clear closedAt when reopening', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Closed', value: 5000, stage: 'WON', contactId, ownerId: adminId, teamId, closedAt: new Date() },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/stage`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ stage: 'QUALIFIED' })

      expect(res.status).toBe(200)
      expect(res.body.stage).toBe('QUALIFIED')
      expect(res.body.closedAt).toBeNull()
    })

    it('agent cannot close deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Agent', value: 5000, stage: 'LEAD', contactId, ownerId: agentId, teamId },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/stage`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ stage: 'WON' })

      expect(res.status).toBe(403)
    })

    it('agent cannot modify closed deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Closed', value: 5000, stage: 'WON', contactId, ownerId: agentId, teamId, closedAt: new Date() },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/stage`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ stage: 'LOST' })

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('CANNOT_MODIFY_CLOSED_DEAL')
    })
  })

  describe('PATCH /deals/:id/owner', () => {
    it('manager can reassign deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Reassign', value: 5000, stage: 'LEAD', contactId, ownerId: agentId, teamId },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/owner`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: agent2Id })

      expect(res.status).toBe(200)
      expect(res.body.ownerId).toBe(agent2Id)
    })

    it('agent cannot reassign deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'No Reassign', value: 5000, stage: 'LEAD', contactId, ownerId: agentId, teamId },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/owner`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ownerId: agent2Id })

      expect(res.status).toBe(403)
    })

    it('should reject missing ownerId', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'No Owner', value: 5000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .patch(`/deals/${deal.id}/owner`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('OWNER_ID_REQUIRED')
    })
  })

  describe('DELETE /deals/:id', () => {
    it('admin can delete deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'Delete Me', value: 5000, stage: 'LEAD', contactId, ownerId: adminId, teamId },
      })

      const res = await request(app)
        .delete(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(204)
    })

    it('agent cannot delete deal', async () => {
      const deal = await prisma.deal.create({
        data: { title: 'No Delete', value: 5000, stage: 'LEAD', contactId, ownerId: agentId, teamId },
      })

      const res = await request(app)
        .delete(`/deals/${deal.id}`)
        .set('Authorization', `Bearer ${agentToken}`)

      expect(res.status).toBe(403)
    })
  })
})

describe('Contact-Deal integration', () => {
  it('should block deleting contact with open deals', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'admin-int@test.com', role: 'ADMIN' })
    const token = generateToken(admin)

    const contact = await prisma.contact.create({
      data: { name: 'Protected', phone: '+33699999999', teamId: team.id, ownerId: admin.id },
    })

    await prisma.deal.create({
      data: { title: 'Open Deal', value: 5000, stage: 'LEAD', contactId: contact.id, ownerId: admin.id, teamId: team.id },
    })

    const res = await request(app)
      .delete(`/contacts/${contact.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('CONTACT_HAS_OPEN_DEALS')
    expect(res.body.deals.length).toBe(1)
  })

  it('should allow deleting contact with only closed deals', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'admin-closed@test.com', role: 'ADMIN' })
    const token = generateToken(admin)

    const contact = await prisma.contact.create({
      data: { name: 'Closed Only', phone: '+33688888888', teamId: team.id, ownerId: admin.id },
    })

    await prisma.deal.create({
      data: { title: 'Closed Deal', value: 5000, stage: 'WON', contactId: contact.id, ownerId: admin.id, teamId: team.id, closedAt: new Date() },
    })

    const res = await request(app)
      .delete(`/contacts/${contact.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.action).toBe('deleted')
  })

  it('should anonymize contact data on deletion', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'admin-anon@test.com', role: 'ADMIN' })
    const token = generateToken(admin)

    const contact = await prisma.contact.create({
      data: { name: 'To Anonymize', phone: '+33677777777', email: 'anon@test.com', teamId: team.id, ownerId: admin.id },
    })

    await request(app)
      .delete(`/contact/${contact.id}`)
      .set('Authorization', `Bearer ${token}`)

    // Check DB directly - endpoint is /contacts/:id
    await request(app)
      .delete(`/contacts/${contact.id}`)
      .set('Authorization', `Bearer ${token}`)

    const inDb = await prisma.contact.findUnique({ where: { id: contact.id } })
    expect(inDb?.name).toBe('Anonyme')
    expect(inDb?.phone).toBe('')
    expect(inDb?.email).toBeNull()
  })
})
