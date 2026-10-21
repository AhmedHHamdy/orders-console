import type { NextFunction, Request, Response } from 'express'
import type { PrismaClient } from '../generated/prisma/client.js'
import type { Role } from '../generated/prisma/enums.js'
import { verifyToken } from './token.js'

export const AUTH_COOKIE = 'token'

export type AuthUser = { id: number; email: string; role: Role }

export function createRequireAuth(prisma: PrismaClient) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token: unknown = req.cookies[AUTH_COOKIE]
    const userId = typeof token === 'string' ? verifyToken(token) : null

    // Role comes from the database, not the token, so a demoted or deleted user loses access immediately
    const user = userId === null
      ? null
      : await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } })

    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    req.user = user
    next()
  }
}

export function requireRole(role: Role) {
  return function checkRole(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== role) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new Error('currentUser() used on a route without requireAuth')
  return req.user
}
