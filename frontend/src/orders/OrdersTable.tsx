import type { Order } from '../api/types'
import { formatDateTime, formatMoney } from './format'

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="muted">No orders match these filters.</p>

  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Customer</th>
          <th>Status</th>
          <th className="num">Total</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="muted">{order.id}</td>
            <td>
              <div>{order.customerName}</div>
              <div className="muted small">{order.customerEmail}</div>
            </td>
            <td>
              <span className={`badge badge-${order.status}`}>{order.status}</span>
            </td>
            <td className="num">{formatMoney(order.totalCents)}</td>
            <td>{formatDateTime(order.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
