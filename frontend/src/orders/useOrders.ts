import { useEffect, useRef, useState } from 'react'
import type { Order } from '../api/types'
import { fetchOrdersPage, type OrderQuery } from './api'

type ListState = {
  key: string
  orders: Order[]
  nextCursor: number | null
  error: string | null
  loadMoreError: string | null
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')

/**
 * Loads the first page whenever the query changes and appends pages on loadMore().
 *
 * An earlier, slower response can never replace the latest one, for two independent reasons:
 * 1. Changing the query aborts the previous request (effect cleanup), so its result is dropped.
 * 2. Every stored result is tagged with the query key it answers, and only the result whose key
 *    matches the current query is rendered. Even a response that slips past the abort is ignored.
 */
export function useOrders({ q, status, sort, dir }: OrderQuery) {
  const [reloadCount, setReloadCount] = useState(0)
  const [state, setState] = useState<ListState | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRequest = useRef<AbortController | null>(null)

  const key = JSON.stringify([q, status, sort, dir, reloadCount])

  useEffect(() => {
    const controller = new AbortController()

    fetchOrdersPage({ q, status, sort, dir }, null, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setState({ key, ...page, error: null, loadMoreError: null })
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, orders: [], nextCursor: null, error: errorMessage(err), loadMoreError: null })
        }
      })

    return () => {
      controller.abort()
      loadMoreRequest.current?.abort()
    }
  }, [key, q, status, sort, dir])

  const current = state?.key === key ? state : null

  function loadMore() {
    if (!current || current.nextCursor === null || isLoadingMore) return

    const controller = new AbortController()
    loadMoreRequest.current = controller
    setIsLoadingMore(true)

    fetchOrdersPage({ q, status, sort, dir }, current.nextCursor, controller.signal)
      .then((page) =>
        setState((prev) =>
          prev?.key === key
            ? { ...prev, orders: [...prev.orders, ...page.orders], nextCursor: page.nextCursor, loadMoreError: null }
            : prev,
        ),
      )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState((prev) => (prev?.key === key ? { ...prev, loadMoreError: errorMessage(err) } : prev))
      })
      .finally(() => {
        if (loadMoreRequest.current === controller) setIsLoadingMore(false)
      })
  }

  return {
    orders: current?.orders ?? [],
    hasMore: current?.nextCursor != null,
    isLoading: current === null,
    error: current?.error ?? null,
    loadMoreError: current?.loadMoreError ?? null,
    isLoadingMore,
    loadMore,
    reload: () => setReloadCount((count) => count + 1),
  }
}
