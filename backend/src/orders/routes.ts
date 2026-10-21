import { setTimeout } from 'node:timers/promises'
import { Router, type Response } from 'express'
import { z } from 'zod'
import { currentUser, requireRole } from '../auth/middleware.js'
import { config } from '../config.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import { createOrderSchema, idempotencyKeySchema, listOrdersQuerySchema, orderIdSchema } from './schemas.js'
import { createOrder, deleteOrder, IdempotencyKeyReusedError, listOrders } from './service.js'

function sendInvalid(res: Response, error: z.ZodError) {
  res.status(400).json({ error: z.prettifyError(error) })
}

export function createOrdersRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = listOrdersQuerySchema.safeParse(req.query)
    if (!query.success) return sendInvalid(res, query.error)

    // Demo-only latency so out-of-order responses can be shown (see README, R1)
    if (config.LIST_DELAY_MAX_MS > 0) await setTimeout(Math.random() * config.LIST_DELAY_MAX_MS)

    res.json(await listOrders(prisma, query.data))
  })

  router.post('/', async (req, res) => {
    const key = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'))
    if (!key.success) {
      res.status(400).json({ error: 'Idempotency-Key header must be a UUID' })
      return
    }
    const body = createOrderSchema.safeParse(req.body)
    if (!body.success) return sendInvalid(res, body.error)

    try {
      const { order, replayed } = await createOrder(prisma, currentUser(req).id, key.data, body.data)
      res.status(replayed ? 200 : 201).set('Idempotent-Replayed', String(replayed)).json({ order })
    } catch (err) {
      if (!(err instanceof IdempotencyKeyReusedError)) throw err
      res.status(422).json({ error: err.message })
    }
  })

  router.delete('/:id', requireRole('admin'), async (req, res) => {
    const id = orderIdSchema.safeParse(req.params.id)
    if (!id.success) return sendInvalid(res, id.error)

    if (!(await deleteOrder(prisma, id.data))) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    res.status(204).end()
  })

  return router
}
