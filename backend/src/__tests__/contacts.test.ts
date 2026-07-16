import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import contactsRoutes from '../routes/contacts'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())
app.use('/contacts', contactsRoutes)

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

describe('Contacts API', () => {
  let adminToken: string
  let teamId: string
  let adminId: string
  let agentId: string

  beforeAll(async () => {
    // Nettoyer la base
    // @ts-ignore
    await prisma.contact.deleteMany()
    await prisma.invitation.deleteMany()
    await prisma.user.deleteMany()
    await prisma.team.deleteMany()

    // Créer une équipe
    const team = await prisma.team.create({ data: { name: 'Test Team' } })
    teamId = team.id

    // Créer un admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin-contact@ringover.com',
        name: 'Admin',
        passwordHash: 'hash',
        role: 'ADMIN',
        teamId: team.id
      }
    })
    adminId = admin.id
    adminToken = jwt.sign({ id: admin.id, role: admin.role, teamId: admin.teamId }, JWT_SECRET)

    // Créer un agent
    const agent = await prisma.user.create({
      data: {
        email: 'agent-contact@ringover.com',
        name: 'Agent',
        passwordHash: 'hash',
        role: 'AGENT',
        teamId: team.id
      }
    })
    agentId = agent.id
  })

  afterAll(async () => {
    // @ts-ignore
    await prisma.contact.deleteMany()
    await prisma.user.deleteMany()
    await prisma.team.deleteMany()
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
