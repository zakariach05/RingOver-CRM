import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

export const prisma = new PrismaClient()

export async function cleanDb() {
  await prisma.invitation.deleteMany()
  await prisma.user.deleteMany()
  await prisma.team.deleteMany()
}

export async function createTestTeam() {
  return prisma.team.create({ data: { name: 'Test Team' } })
}

export async function createTestUser(teamId: string, overrides: { email?: string; name?: string; role?: string; status?: string } = {}) {
  const hash = await bcrypt.hash('Test1234', 10)
  return prisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      passwordHash: hash,
      name: overrides.name || 'Test User',
      role: overrides.role || 'AGENT',
      status: overrides.status || 'ACTIVE',
      teamId,
    },
  })
}

export function generateToken(user: { id: string; role: string; teamId: string }) {
  return jwt.sign({ id: user.id, role: user.role, teamId: user.teamId }, JWT_SECRET, { expiresIn: '7d' })
}

export function generateExpiredToken(user: { id: string; role: string; teamId: string }) {
  return jwt.sign({ id: user.id, role: user.role, teamId: user.teamId }, JWT_SECRET, { expiresIn: '0s' })
}
