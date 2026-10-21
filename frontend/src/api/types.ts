// Mirrors the API responses (backend/prisma/schema.prisma, backend/src/orders/schemas.ts)

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type Order = {
  id: number
  customerName: string
  customerEmail: string
  status: OrderStatus
  totalCents: number
  createdAt: string
}

export type OrdersPage = {
  orders: Order[]
  nextCursor: number | null
}

export type CreateOrderInput = {
  customerName: string
  customerEmail: string
  items: { product: string; quantity: number; unitPriceCents: number }[]
}

export type User = {
  id: number
  email: string
  role: 'admin' | 'agent'
}
