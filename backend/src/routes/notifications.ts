import { Router } from 'express'
import { prisma } from '../utils/prisma'
import { authenticate } from '../types'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { unread, page = '1', pageSize = '20' } = req.query as Record<string, string>
    const p = Math.max(1, parseInt(page))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)))

    const where: any = {
      userId: req.user!.id,
      teamId: req.user!.teamId,
    }

    if (unread === 'true') {
      where.read = false
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      prisma.notification.count({ where }),
    ])

    return res.json({ notifications, total, page: p, pageSize: ps })
  } catch (error) {
    console.error('List notifications error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        teamId: req.user!.teamId,
        read: false,
      },
    })
    return res.json({ count })
  } catch (error) {
    console.error('Unread count error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    })

    return res.json(updated)
  } catch (error) {
    console.error('Mark read error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.patch('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        teamId: req.user!.teamId,
        read: false,
      },
      data: { read: true },
    })

    return res.json({ action: 'all_read' })
  } catch (error) {
    console.error('Mark all read error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }

    await prisma.notification.delete({ where: { id: req.params.id } })
    return res.json({ action: 'deleted' })
  } catch (error) {
    console.error('Delete notification error:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
