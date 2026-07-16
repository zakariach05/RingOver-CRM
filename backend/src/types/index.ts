import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT'

export interface AuthUser {
  id: string
  role: UserRole
  teamId: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'NO_TOKEN' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'TOKEN_EXPIRED_OR_INVALID' })
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'NO_TOKEN' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }
    next()
  }
}
