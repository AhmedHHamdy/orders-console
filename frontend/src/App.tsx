import { useEffect, useState } from 'react'
import { apiFetch, onUnauthorized } from './api/client'
import type { User } from './api/types'
import { LoginForm } from './auth/LoginForm'
import { OrdersPage } from './orders/OrdersPage'

type Session = { status: 'checking' } | { status: 'signed-out' } | { status: 'signed-in'; user: User }

function App() {
  const [session, setSession] = useState<Session>({ status: 'checking' })

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setSession({ status: 'signed-out' }))
    // The cookie is httpOnly, so asking the server is the only way to know if we're signed in
    apiFetch<{ user: User }>('/auth/me')
      .then(({ user }) => setSession({ status: 'signed-in', user }))
      .catch(() => setSession({ status: 'signed-out' }))
    return unsubscribe
  }, [])

  function handleLogout() {
    apiFetch('/auth/logout', { method: 'POST' }).finally(() => setSession({ status: 'signed-out' }))
  }

  return (
    <main>
      <header className="app-header">
        <h1>Orders Console</h1>
        {session.status === 'signed-in' && (
          <div className="user">
            <span className="muted">
              {session.user.email} ({session.user.role})
            </span>
            <button onClick={handleLogout}>Sign out</button>
          </div>
        )}
      </header>

      {session.status === 'checking' && <p className="muted">Loading…</p>}
      {session.status === 'signed-out' && <LoginForm onLogin={(user) => setSession({ status: 'signed-in', user })} />}
      {session.status === 'signed-in' && <OrdersPage />}
    </main>
  )
}

export default App
