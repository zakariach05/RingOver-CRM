import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import contactsRoutes from '../routes/contacts'
import { prisma, cleanDb, createTestTeam, createTestUser, generateToken } from './helpers'

const app = express()
app.use(express.json())
app.use('/contacts', contactsRoutes)

describe('Contacts API', () => {
  let adminToken: string
  let teamId: string
  let adminId: string
  let agentId: string

  beforeAll(async () => {
    await cleanDb()

    const team = await createTestTeam()
    teamId = team.id

    const admin = await createTestUser(teamId, {
      email: 'admin-contact@ringover.com',
      name: 'Admin',
      role: 'ADMIN',
    })
    adminId = admin.id
    adminToken = generateToken(admin)

    const agent = await createTestUser(teamId, {
      email: 'agent-contact@ringover.com',
      name: 'Agent',
      role: 'AGENT',
    })
    agentId = agent.id
  })

  afterAll(async () => {
    await cleanDb()
    await prisma.$disconnect()
  })

  let createdContactId: string

  it('should create a contact', async () => {
    const res = await request(app)
      .post('/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'John Doe',
        company: 'RingOver',
        phone: '+33612345678',
        email: 'john@ringover.com',
        ownerId: agentId
      })

    expect(res.status).toBe(201)
    expect(res.body.contact).toHaveProperty('id')
    expect(res.body.contact.name).toBe('John Doe')
    createdContactId = res.body.contact.id
  })

  it('should warn when creating a contact with duplicate phone', async () => {
    const res = await request(app)
      .post('/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jane Doe',
        phone: '+33612345678' // Même téléphone
      })

    expect(res.status).toBe(201)
    expect(res.body.warning).toBe('DUPLICATE_PHONE')
  })

  it('should list contacts and support search', async () => {
    const res = await request(app)
      .get('/contacts?q=John')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.contacts.length).toBeGreaterThan(0)
    expect(res.body.contacts[0].name).toBe('John Doe')
  })

  it('should get contact details', async () => {
    const res = await request(app)
      .get(`/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('John Doe')
  })

  it('should update a contact', async () => {
    const res = await request(app)
      .put(`/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'John Updated',
        phone: '+33612345678'
      })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('John Updated')
  })

  it('should soft delete a contact', async () => {
    const res = await request(app)
      .delete(`/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.action).toBe('deleted')

    // Vérifier le soft delete (plus renvoyé par GET)
    const getRes = await request(app)
      .get(`/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(getRes.status).toBe(404)
  })
})
