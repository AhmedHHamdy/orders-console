import { useState } from 'react'
import { ORDER_STATUSES, type Order, type OrderStatus } from '../api/types'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { SORT_OPTIONS, type SortOption } from './api'
import { CreateOrderForm } from './CreateOrderForm'
import { OrdersTable } from './OrdersTable'
import { useOrders } from './useOrders'

const SEARCH_DEBOUNCE_MS = 300

export function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [sortOption, setSortOption] = useState<SortOption>('createdAt:desc')
  const [isCreating, setIsCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const q = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { sort, dir } = SORT_OPTIONS[sortOption]
  const list = useOrders({ q, status, sort, dir })

  function handleCreated(order: Order) {
    setIsCreating(false)
    setNotice(`Order #${order.id} saved for ${order.customerName}.`)
    list.reload()
  }

  return (
    <section>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search customer name or email"
          aria-label="Search customer name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select aria-label="Sort" value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)}>
          {Object.entries(SORT_OPTIONS).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="primary" onClick={() => setIsCreating(true)} disabled={isCreating}>
          New order
        </button>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {isCreating && <CreateOrderForm onCreated={handleCreated} onCancel={() => setIsCreating(false)} />}

      {list.error ? (
        <div className="error" role="alert">
          <p>Could not load orders: {list.error}</p>
          <button onClick={list.reload}>Retry</button>
        </div>
      ) : list.isLoading ? (
        <p className="muted" aria-busy="true">
          Loading orders…
        </p>
      ) : (
        <>
          <OrdersTable orders={list.orders} />
          <div className="list-footer">
            <span className="muted">{list.orders.length} orders shown</span>
            {list.loadMoreError && <span className="error-text">{list.loadMoreError}</span>}
            {list.hasMore && (
              <button onClick={list.loadMore} disabled={list.isLoadingMore}>
                {list.isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
