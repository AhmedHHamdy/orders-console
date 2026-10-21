import bcrypt from 'bcryptjs'
import { Router, type CookieOptions, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import { AUTH_COOKIE, currentUser } from './middleware.js'
import { signToken, TOKEN_TTL_SECONDS } from './token.js'

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
})

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.NODE_ENV === 'production',
  path: '/api',
}

// Compared against when the email is unknown, so "no such user" and "wrong password" take the same time
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10)

export function createAuthRouter(prisma: PrismaClient, requireAuth: RequestHandler) {
  const router = Router()
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })

  router.post('/login', loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'A valid email and password are required' })
      return
    }

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

    if (!user || !passwordMatches) {
      res.status(401).json({ error: 'Wrong email or password' })
      return
    }

    res.cookie(AUTH_COOKIE, signToken(user.id), { ...cookieOptions, maxAge: TOKEN_TTL_SECONDS * 1000 })
    res.json({ user: { id: user.id, email: user.email, role: user.role } })
  })

  router.post('/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE, cookieOptions)
    res.status(204).end()
  })

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: currentUser(req) })
  })

  return router
}

