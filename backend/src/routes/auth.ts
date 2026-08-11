import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'
import { unrevoke } from '../services/presenceService'

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

    // Ré-autorise le compte s'il avait été déconnecté de force précédemment
    unrevoke(user.id)

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

    // Ré-autorise le compte s'il avait été déconnecté de force précédemment
    unrevoke(user.id)

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiresAt },
    })

    // In production, send email here. For dev, return the link directly.
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`
    console.log(`[Password Reset] ${user.email} → ${resetUrl}`)

    return res.json({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Forgot password error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain at least 1 uppercase letter').regex(/[0-9]/, 'Must contain at least 1 digit'),
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body)

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return res.json({ message: 'Mot de passe réinitialisé avec succès.' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors })
    }
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
