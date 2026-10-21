import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import type { CreateOrderInput, ListOrdersQuery } from './schemas.js'

const orderSummary = {
  id: true,
  customerName: true,
  customerEmail: true,
  status: true,
  totalCents: true,
  createdAt: true,
} satisfies Prisma.OrderSelect

export class IdempotencyKeyReusedError extends Error {
  constructor() {
    super('This Idempotency-Key was already used for a different order')
  }
}

export async function listOrders(prisma: PrismaClient, query: ListOrdersQuery) {
  const { q, status, sort, dir, limit, cursor } = query

  // Prisma's cursor is keyset pagination: it continues from the cursor row's sort values, no OFFSET.
  // id is the tie-breaker so rows with equal dates/amounts are never skipped or repeated.
  const rows = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ customerName: { contains: q } }, { customerEmail: { contains: q } }] } : {}),
    },
    orderBy: sort === 'createdAt' ? [{ createdAt: dir }, { id: dir }] : [{ totalCents: dir }, { id: dir }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: orderSummary,
  })

  // One extra row tells us whether another page exists, without a COUNT(*) over the table
  const hasMore = rows.length > limit
  const orders = hasMore ? rows.slice(0, limit) : rows
  return { orders, nextCursor: hasMore ? orders.at(-1)!.id : null }
}

export async function createOrder(
  prisma: PrismaClient,
  userId: number,
  idempotencyKey: string,
  input: CreateOrderInput,
) {
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  // The server computes the amount from the items, so the two can never disagree
  const totalCents = input.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0)

  try {
    const order = await prisma.order.create({
      data: {
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        status: 'pending',
        totalCents,
        createdById: userId,
        idempotencyKey,
        requestHash,
        items: { create: input.items },
      },
      select: orderSummary,
    })
    return { order, replayed: false }
  } catch (err) {
    // P2002 = the unique (createdById, idempotencyKey) index rejected the insert: the order already exists
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err
  }

  const { requestHash: storedHash, ...order } = await prisma.order.findUniqueOrThrow({
    where: { createdById_idempotencyKey: { createdById: userId, idempotencyKey } },
    select: { ...orderSummary, requestHash: true },
  })
  if (storedHash !== requestHash) throw new IdempotencyKeyReusedError()
  return { order, replayed: true }
}

export async function deleteOrder(prisma: PrismaClient, id: number): Promise<boolean> {
  const [, { count }] = await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.deleteMany({ where: { id } }),
  ])
  return count > 0
}
