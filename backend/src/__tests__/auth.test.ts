import request from 'supertest'
import app from '../server'
import { prisma, cleanDb, createTestTeam, createTestUser, generateToken, generateExpiredToken } from './helpers'

beforeEach(async () => {
  await cleanDb()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /auth/register', () => {
  it('premier compte devient automatiquement ADMIN', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'first@example.com', password: 'Admin123', name: 'First User' })

    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('ADMIN')
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('first@example.com')
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('email doublon retourne 409', async () => {
    const team = await createTestTeam()
    await createTestUser(team.id, { email: 'dup@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'Admin123', name: 'Dup' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('EMAIL_ALREADY_USED')
  })

  it('inscription sans invitation après le premier compte retourne 400', async () => {
    const team = await createTestTeam()
    await createTestUser(team.id, { email: 'existing@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'Admin123', name: 'New User' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVITATION_REQUIRED')
  })

  it('mot de passe trop faible retourne 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'weak@example.com', password: 'weak', name: 'Weak' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('mot de passe sans majuscule retourne 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'noupper@example.com', password: 'admin1234', name: 'No Upper' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('mot de passe sans chiffre retourne 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'nodigit@example.com', password: 'AdminPass', name: 'No Digit' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('inscription avec invitation valide', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'admin@example.com', role: 'ADMIN' })

    const invRes = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'invited@example.com', role: 'MANAGER' })

    const token = invRes.body.invitation.token

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'invited@example.com', password: 'Manager123', name: 'Invited', invitationToken: token })

    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('MANAGER')
  })

  it('invitation avec mauvais email retourne 400', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'admin@example.com', role: 'ADMIN' })

    const invRes = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'target@example.com', role: 'AGENT' })

    const token = invRes.body.invitation.token

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'wrong@example.com', password: 'Agent1234', name: 'Wrong', invitationToken: token })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVITATION_EMAIL_MISMATCH')
  })
})

describe('POST /auth/login', () => {
  it('connexion valide retourne token et user', async () => {
    const team = await createTestTeam()
    await createTestUser(team.id, { email: 'login@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'Test1234' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('login@example.com')
  })

  it('email inexistant retourne 401 générique', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'Test1234' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })

  it('mauvais mot de passe retourne 401 générique', async () => {
    const team = await createTestTeam()
    await createTestUser(team.id, { email: 'real@example.com' })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'real@example.com', password: 'WrongPass1' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })

  it('compte désactivé retourne 403', async () => {
    const team = await createTestTeam()
    await createTestUser(team.id, { email: 'disabled@example.com', status: 'INACTIVE' })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'disabled@example.com', password: 'Test1234' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('ACCOUNT_DISABLED')
  })

  it('les erreurs email/password prennent un temps similaire (timing)', async () => {
    const team = await createTestTeam()
    await createTestUser(team.id, { email: 'timing@example.com' })

    const start1 = Date.now()
    await request(app).post('/auth/login').send({ email: 'nonexistent@example.com', password: 'Test1234' })
    const time1 = Date.now() - start1

    const start2 = Date.now()
    await request(app).post('/auth/login').send({ email: 'timing@example.com', password: 'Wrong1234' })
    const time2 = Date.now() - start2

    const diff = Math.abs(time1 - time2)
    expect(diff).toBeLessThan(500)
  })
})

describe('Middleware auth', () => {
  it('route protégée sans token retourne 401', async () => {
    const res = await request(app).get('/team/members')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('NO_TOKEN')
  })

  it('token expiré retourne 401', async () => {
    const team = await createTestTeam()
    const user = await createTestUser(team.id, { role: 'ADMIN' })
    const token = generateExpiredToken(user)

    await new Promise((r) => setTimeout(r, 1100))

    const res = await request(app)
      .get('/team/members')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('TOKEN_EXPIRED_OR_INVALID')
  })

  it('token invalide retourne 401', async () => {
    const res = await request(app)
      .get('/team/members')
      .set('Authorization', 'Bearer invalidtoken123')

    expect(res.status).toBe(401)
  })
})

describe('GET /team/members', () => {
  it('retourne les membres de la team', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'admin@example.com', role: 'ADMIN' })
    await createTestUser(team.id, { email: 'agent@example.com', role: 'AGENT' })

    const res = await request(app)
      .get('/team/members')
      .set('Authorization', `Bearer ${generateToken(admin)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /team/invitations', () => {
  it('admin peut inviter', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })

    const res = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'new@example.com', role: 'AGENT' })

    expect(res.status).toBe(201)
    expect(res.body.invitationLink).toContain('/register?token=')
  })

  it('agent ne peut pas inviter (403)', async () => {
    const team = await createTestTeam()
    const agent = await createTestUser(team.id, { role: 'AGENT' })

    const res = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(agent)}`)
      .send({ email: 'new@example.com', role: 'AGENT' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
  })

  it('invitation doublon retourne 409', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })

    await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'dup@example.com', role: 'AGENT' })

    const res = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'dup@example.com', role: 'AGENT' })

    expect(res.status).toBe(409)
  })

  it('invitation à un email déjà membre retourne 409', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { email: 'member@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'member@example.com', role: 'AGENT' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('USER_ALREADY_MEMBER')
  })
})

describe('GET /team/invitations/:token', () => {
  it('retourne les infos de l\'invitation', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })

    const invRes = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ email: 'info@example.com', role: 'MANAGER' })

    const token = invRes.body.invitation.token

    const res = await request(app).get(`/team/invitations/${token}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('info@example.com')
    expect(res.body.role).toBe('MANAGER')
    expect(res.body.expired).toBe(false)
  })

  it('token inexistant retourne 404', async () => {
    const res = await request(app).get('/team/invitations/nonexistent')
    expect(res.status).toBe(404)
  })
})

describe('PATCH /team/members/:userId/role', () => {
  it('admin peut changer le rôle', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })
    const agent = await createTestUser(team.id, { role: 'AGENT' })

    const res = await request(app)
      .patch(`/team/members/${agent.id}/role`)
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ role: 'MANAGER' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('MANAGER')
  })

  it('ne peut pas rétrograder le dernier admin', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })

    const res = await request(app)
      .patch(`/team/members/${admin.id}/role`)
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ role: 'AGENT' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('LAST_ADMIN_CANNOT_BE_DEMOTED')
  })

  it('manager ne peut pas accéder à ces routes (403)', async () => {
    const team = await createTestTeam()
    const manager = await createTestUser(team.id, { role: 'MANAGER' })
    const agent = await createTestUser(team.id, { role: 'AGENT' })

    const res = await request(app)
      .patch(`/team/members/${agent.id}/role`)
      .set('Authorization', `Bearer ${generateToken(manager)}`)
      .send({ role: 'AGENT' })

    expect(res.status).toBe(403)
  })
})

describe('PATCH /team/members/:userId/status', () => {
  it('admin peut activer/désactiver un membre', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })
    const agent = await createTestUser(team.id, { role: 'AGENT' })

    const res = await request(app)
      .patch(`/team/members/${agent.id}/status`)
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ status: 'INACTIVE' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('INACTIVE')
  })

  it('ne peut pas désactiver le dernier admin', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })

    const res = await request(app)
      .patch(`/team/members/${admin.id}/status`)
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ status: 'INACTIVE' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('LAST_ADMIN_CANNOT_BE_DEACTIVATED')
  })

  it('peut désactiver un admin s\'il en reste un autre', async () => {
    const team = await createTestTeam()
    const admin1 = await createTestUser(team.id, { email: 'admin1@example.com', role: 'ADMIN' })
    const admin2 = await createTestUser(team.id, { email: 'admin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .patch(`/team/members/${admin1.id}/status`)
      .set('Authorization', `Bearer ${generateToken(admin2)}`)
      .send({ status: 'INACTIVE' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('INACTIVE')
  })
})

describe('Critères d\'acceptation Partie 1', () => {
  it('CA1: premier compte = Admin automatiquement', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ca1@example.com', password: 'Admin123', name: 'CA1' })

    expect(res.body.user.role).toBe('ADMIN')
  })

  it('CA2: messages d\'erreur login génériques', async () => {
    const res1 = await request(app).post('/auth/login').send({ email: 'x@x.com', password: 'y' })
    const res2 = await request(app).post('/auth/login').send({ email: 'x@x.com', password: 'z' })
    expect(res1.body.error).toBe(res2.body.error)
  })

  it('CA3: token expiré → 401', async () => {
    const team = await createTestTeam()
    const user = await createTestUser(team.id, { role: 'ADMIN' })
    const token = generateExpiredToken(user)
    await new Promise((r) => setTimeout(r, 1100))

    const res = await request(app).get('/team/members').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('CA4: Agent ne peut pas accéder aux routes team (403)', async () => {
    const team = await createTestTeam()
    const agent = await createTestUser(team.id, { role: 'AGENT' })

    const res1 = await request(app).get('/team/members').set('Authorization', `Bearer ${generateToken(agent)}`)
    expect(res1.status).toBe(200)

    const res2 = await request(app)
      .post('/team/invitations')
      .set('Authorization', `Bearer ${generateToken(agent)}`)
      .send({ email: 'x@x.com', role: 'AGENT' })
    expect(res2.status).toBe(403)
  })

  it('CA5: pas de double admin supprimable', async () => {
    const team = await createTestTeam()
    const admin = await createTestUser(team.id, { role: 'ADMIN' })

    const res = await request(app)
      .patch(`/team/members/${admin.id}/role`)
      .set('Authorization', `Bearer ${generateToken(admin)}`)
      .send({ role: 'AGENT' })

    expect(res.status).toBe(400)
  })
})
