import { apiFetch } from '../api/client'
import type { CreateOrderInput, Order, OrdersPage, OrderStatus } from '../api/types'

const PAGE_SIZE = 50

export const SORT_OPTIONS = {
  'createdAt:desc': { label: 'Newest first', sort: 'createdAt', dir: 'desc' },
  'createdAt:asc': { label: 'Oldest first', sort: 'createdAt', dir: 'asc' },
  'totalCents:desc': { label: 'Amount: high to low', sort: 'totalCents', dir: 'desc' },
  'totalCents:asc': { label: 'Amount: low to high', sort: 'totalCents', dir: 'asc' },
} as const
export type SortOption = keyof typeof SORT_OPTIONS

export type OrderQuery = {
  q: string
  status: OrderStatus | ''
  sort: 'createdAt' | 'totalCents'
  dir: 'asc' | 'desc'
}

export function fetchOrdersPage(query: OrderQuery, cursor: number | null, signal: AbortSignal) {
  const params = new URLSearchParams({ sort: query.sort, dir: query.dir, limit: String(PAGE_SIZE) })
  if (query.q) params.set('q', query.q)
  if (query.status) params.set('status', query.status)
  if (cursor !== null) params.set('cursor', String(cursor))

  return apiFetch<OrdersPage>(`/orders?${params}`, { signal })
}

export function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  return apiFetch<{ order: Order }>('/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  })
}
