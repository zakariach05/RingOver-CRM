import { Router } from 'express'
import { prisma } from '../utils/prisma'
import { authenticate, requireRole } from '../types'
import crypto from 'crypto'

const router = Router()

router.get('/members', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const members = await prisma.user.findMany({
      where: { teamId: req.user!.teamId },
      select: { id: true, email: true, name: true, role: true, status: true, phoneExtension: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ members })
  } catch (error) {
    console.error('Get members error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/invitations', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: { teamId: req.user!.teamId },
      select: { id: true, email: true, role: true, status: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ invitations })
  } catch (error) {
    console.error('Get invitations error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.post('/invitations', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { email, role } = req.body
    if (!email || !role) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: [{ message: 'email and role are required' }] })
    }
    if (!['ADMIN', 'MANAGER', 'AGENT'].includes(role)) {
      return res.status(400).json({ error: 'INVALID_ROLE' })
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, teamId: req.user!.teamId },
    })
    if (existingUser) {
      return res.status(409).json({ error: 'USER_ALREADY_MEMBER' })
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: { email, status: 'PENDING', expiresAt: { gt: new Date() } },
    })
    if (existingInvitation) {
      return res.status(409).json({ error: 'INVITATION_ALREADY_SENT' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        teamId: req.user!.teamId,
        invitedById: req.user!.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return res.status(201).json({
      invitationLink: `${frontendUrl}/register?token=${token}`,
      invitation,
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/invitations/:token', async (req, res) => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token: req.params.token },
      select: { email: true, role: true, status: true, expiresAt: true },
    })
    if (!invitation) {
      return res.status(404).json({ error: 'INVITATION_NOT_FOUND' })
    }
    return res.json({
      ...invitation,
      expired: invitation.status !== 'PENDING' || invitation.expiresAt < new Date(),
    })
  } catch (error) {
    console.error('Get invitation error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/members/:userId/role', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body
    if (!['ADMIN', 'MANAGER', 'AGENT'].includes(role)) {
      return res.status(400).json({ error: 'INVALID_ROLE' })
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, teamId: req.user!.teamId },
    })
    if (!target) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' })
    }

    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { teamId: req.user!.teamId, role: 'ADMIN' },
      })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'LAST_ADMIN_CANNOT_BE_DEMOTED' })
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    return res.json(updated)
  } catch (error) {
    console.error('Update role error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/members/:userId/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params
    const { status } = req.body
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS' })
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, teamId: req.user!.teamId },
    })
    if (!target) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' })
    }

    if (target.role === 'ADMIN' && status === 'INACTIVE') {
      const adminCount = await prisma.user.count({
        where: { teamId: req.user!.teamId, role: 'ADMIN', status: 'ACTIVE' },
      })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'LAST_ADMIN_CANNOT_BE_DEACTIVATED' })
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    return res.json(updated)
  } catch (error) {
    console.error('Update status error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.delete('/invitations/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: req.params.id, teamId: req.user!.teamId },
    })
    if (!invitation) {
      return res.status(404).json({ error: 'INVITATION_NOT_FOUND' })
    }
    await prisma.invitation.delete({ where: { id: req.params.id } })
    return res.json({ action: 'deleted' })
  } catch (error) {
    console.error('Delete invitation error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
