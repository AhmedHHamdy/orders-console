import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { Order } from '../api/types'
import { createOrder } from './api'
import { formatMoney } from './format'
import { draftTotalCents, validateOrder, type ItemDraft } from './validation'

const EMPTY_ITEM: ItemDraft = { product: '', quantity: '1', unitPrice: '' }

type Props = {
  onCreated: (order: Order) => void
  onCancel: () => void
}

function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return 'An order was already saved from this form with different details. Cancel and check the list before creating another.'
  }
  if (err instanceof ApiError) return err.message
  return 'Network error: the order may or may not have been saved. Submitting again is safe; it cannot create a duplicate.'
}

export function CreateOrderForm({ onCreated, onCancel }: Props) {
  // One key per form, reused by every submit attempt: double-clicks, retries after a timeout and
  // resends all resolve to the same order on the server. A new form (after success) gets a new key.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([EMPTY_ITEM])
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateItem(index: number, change: Partial<ItemDraft>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const result = validateOrder({ customerName, customerEmail, items })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    setErrors([])
    setIsSubmitting(true)
    try {
      const { order } = await createOrder(result.input, idempotencyKey)
      onCreated(order)
    } catch (err) {
      setErrors([submitErrorMessage(err)])
      setIsSubmitting(false)
    }
  }

  return (
    <form className="panel create-form" onSubmit={handleSubmit} noValidate>
      <h2>New order</h2>

      <div className="fields">
        <label>
          Customer name
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoFocus />
        </label>
        <label>
          Customer email
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </label>
      </div>

      <table className="items">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit price (SAR)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <input
                  aria-label={`Item ${index + 1} product`}
                  value={item.product}
                  onChange={(e) => updateItem(index, { product: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  min={1}
                  max={100}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Item ${index + 1} unit price`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="link"
                  disabled={items.length === 1}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="form-footer">
        <button type="button" className="link" onClick={() => setItems((current) => [...current, EMPTY_ITEM])}>
          + Add item
        </button>
        <strong>Total: {formatMoney(draftTotalCents(items))}</strong>
      </div>

      {errors.length > 0 && (
        <ul className="error" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Create order'}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}
