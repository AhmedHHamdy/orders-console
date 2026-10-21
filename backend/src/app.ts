import cookieParser from 'cookie-parser'
import express, { type NextFunction, type Request, type Response } from 'express'
import { createRequireAuth } from './auth/middleware.js'
import { createAuthRouter } from './auth/routes.js'
import { createOrdersRouter } from './orders/routes.js'
import type { PrismaClient } from './generated/prisma/client.js'

export function createApp(prisma: PrismaClient) {
  const app = express()
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  const requireAuth = createRequireAuth(prisma)
  app.use('/api/auth', createAuthRouter(prisma, requireAuth))
  app.use('/api/orders', requireAuth, createOrdersRouter(prisma))

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'Malformed JSON body' })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
