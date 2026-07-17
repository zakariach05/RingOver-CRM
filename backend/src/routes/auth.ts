import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, teamId: true },
    })
    if (!user || user.role !== req.user!.role) {
      return res.status(401).json({ error: 'USER_NOT_FOUND' })
    }
    return res.json(user)
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain at least 1 uppercase letter').regex(/[0-9]/, 'Must contain at least 1 digit'),
  name: z.string().min(1, 'Name is required'),
  invitationToken: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existingUser) {
      return res.status(409).json({ error: 'EMAIL_ALREADY_USED' })
    }

    const userCount = await prisma.user.count()
    let role = 'AGENT'
    let teamId: string

    if (userCount === 0) {
      role = 'ADMIN'
      const team = await prisma.team.create({
        data: { name: 'Default Team' },
      })
      teamId = team.id
    } else if (data.invitationToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: data.invitationToken },
      })
      if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: 'INVALID_INVITATION' })
      }
      if (invitation.email !== data.email) {
        return res.status(400).json({ error: 'INVITATION_EMAIL_MISMATCH' })
      }
      role = invitation.role
      teamId = invitation.teamId
    } else {
      return res.status(400).json({ error: 'INVITATION_REQUIRED' })
    }

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role,
        teamId,
      },
    })

    if (data.invitationToken) {
      await prisma.invitation.update({
        where: { token: data.invitationToken },
        data: { status: 'ACCEPTED' },
      })
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, teamId: user.teamId },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Register error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'ACCOUNT_DISABLED' })
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, teamId: user.teamId },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Login error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
