export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let handleUnauthorized = () => {}

// Lets the app drop back to the login screen when the session cookie expires mid-use
export function onUnauthorized(handler: () => void): () => void {
  handleUnauthorized = handler
  return () => {
    handleUnauthorized = () => {}
  }
}

// The auth token is an httpOnly cookie, so the browser attaches it; no Authorization header here
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

  if (res.status === 401) handleUnauthorized()
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}
