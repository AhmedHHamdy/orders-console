import { z } from 'zod'
import { OrderStatus } from '../generated/prisma/enums.js'

export const listOrdersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(OrderStatus).optional(),
  sort: z.enum(['createdAt', 'totalCents']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.coerce.number().int().positive().optional(),
})
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>

// Limits keep the largest possible total (20 × 100 × 1,000,000) below Prisma's 32-bit Int
const orderItemSchema = z.object({
  product: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(100),
  unitPriceCents: z.number().int().min(0).max(1_000_000),
})

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  customerEmail: z.email().max(254),
  items: z.array(orderItemSchema).min(1).max(20),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const idempotencyKeySchema = z.uuid()

export const orderIdSchema = z.coerce.number().int().positive()
