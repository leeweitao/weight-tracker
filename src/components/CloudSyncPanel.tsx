import { useState } from 'react'
import type { SyncStatus } from '../types'

interface CloudSyncPanelProps {
  isConfigured: boolean
  userEmail: string | null
  authLoading: boolean
  syncStatus: SyncStatus
  syncError: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onSignOut: () => Promise<void>
}

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case 'offline':
      return 'Local only'
    case 'syncing':
      return 'Syncing...'
    case 'synced':
      return 'Synced'
    case 'error':
      return 'Sync error'
    default:
      return 'Ready'
  }
}

export function CloudSyncPanel({
  isConfigured,
  userEmail,
  authLoading,
  syncStatus,
  syncError,
  onSignIn,
  onSignUp,
  onSignOut,
}: CloudSyncPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [authError, setAuthError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setAuthError(null)

    try {
      if (mode === 'signin') {
        await onSignIn(email, password)
      } else {
        await onSignUp(email, password)
      }
      setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    setAuthError(null)
    try {
      await onSignOut()
      setEmail('')
      setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign out failed')
    }
  }

  return (
    <section className="card cloud-card">
      <div className="section-header">
        <h2>Cloud sync</h2>
        <span className={`sync-badge sync-${syncStatus}`}>{syncLabel(syncStatus)}</span>
      </div>

      {!isConfigured ? (
        <p className="hint">
          Cloud sync is not configured yet. Add Supabase keys to a <code>.env</code> file and run the
          SQL schema in <code>supabase/schema.sql</code>.
        </p>
      ) : authLoading ? (
        <p className="hint">Checking account...</p>
      ) : userEmail ? (
        <div className="cloud-signed-in">
          <p className="hint">Signed in as {userEmail}. Your projects sync across devices.</p>
          {syncError && <p className="auth-error">{syncError}</p>}
          <button type="button" className="chip" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      ) : (
        <>
          <p className="hint">
            Sign in to back up and sync your projects across phone and laptop.
          </p>
          <form className="cloud-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </label>
            <div className="cloud-form-actions">
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setMode((current) => (current === 'signin' ? 'signup' : 'signin'))
                  setAuthError(null)
                }}
              >
                {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
              </button>
            </div>
          </form>
          {authError && <p className="auth-error">{authError}</p>}
        </>
      )}
    </section>
  )
}
