import type { CreateOrderInput } from '../api/types'

export type ItemDraft = { product: string; quantity: string; unitPrice: string }
export type OrderDraft = { customerName: string; customerEmail: string; items: ItemDraft[] }

type ValidationResult = { ok: true; input: CreateOrderInput } | { ok: false; errors: string[] }

// Mirrors backend/src/orders/schemas.ts for fast feedback; the server remains the authority
const MAX_ITEMS = 20
const MAX_QUANTITY = 100
const MAX_UNIT_PRICE_CENTS = 1_000_000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/

export function priceToCents(price: string): number | null {
  const trimmed = price.trim()
  return PRICE_PATTERN.test(trimmed) ? Math.round(Number(trimmed) * 100) : null
}

export function draftTotalCents(items: ItemDraft[]): number {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (priceToCents(item.unitPrice) ?? 0), 0)
}

export function validateOrder(draft: OrderDraft): ValidationResult {
  const errors: string[] = []
  const customerName = draft.customerName.trim()
  const customerEmail = draft.customerEmail.trim()

  if (!customerName || customerName.length > 100) errors.push('Customer name is required (max 100 characters)')
  if (!EMAIL_PATTERN.test(customerEmail) || customerEmail.length > 254) errors.push('Enter a valid customer email')
  if (draft.items.length === 0 || draft.items.length > MAX_ITEMS) errors.push(`Add between 1 and ${MAX_ITEMS} items`)

  const items = draft.items.map((item, index) => {
    const label = `Item ${index + 1}`
    const product = item.product.trim()
    const quantity = Number(item.quantity)
    const unitPriceCents = priceToCents(item.unitPrice)

    if (!product || product.length > 100) errors.push(`${label}: product name is required`)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      errors.push(`${label}: quantity must be a whole number from 1 to ${MAX_QUANTITY}`)
    }
    if (unitPriceCents === null || unitPriceCents > MAX_UNIT_PRICE_CENTS) {
      errors.push(`${label}: price must be between 0 and 10,000.00 SAR`)
    }
    return { product, quantity, unitPriceCents: unitPriceCents ?? 0 }
  })

  return errors.length > 0 ? { ok: false, errors } : { ok: true, input: { customerName, customerEmail, items } }
}
