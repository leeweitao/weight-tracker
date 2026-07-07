import { useState } from 'react'
import type { SyncStatus } from '../types'

type AuthMode = 'signin' | 'signup' | 'forgot'

interface CloudSyncPanelProps {
  isConfigured: boolean
  userEmail: string | null
  authLoading: boolean
  passwordRecovery: boolean
  syncStatus: SyncStatus
  syncError: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onSignOut: () => Promise<void>
  onRequestPasswordReset: (email: string) => Promise<void>
  onUpdatePassword: (newPassword: string) => Promise<void>
  onDismissPasswordRecovery: () => void
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
  passwordRecovery,
  syncStatus,
  syncError,
  onSignIn,
  onSignUp,
  onSignOut,
  onRequestPasswordReset,
  onUpdatePassword,
  onDismissPasswordRecovery,
}: CloudSyncPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('signin')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setAuthError(null)
    setAuthMessage(null)

    try {
      if (mode === 'signin') {
        await onSignIn(email, password)
      } else if (mode === 'signup') {
        await onSignUp(email, password)
      } else {
        await onRequestPasswordReset(email)
        setAuthMessage('Password reset link sent. Check your email and open the link on this device.')
      }
      if (mode !== 'forgot') setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdatePassword(event: React.FormEvent) {
    event.preventDefault()
    setAuthError(null)
    setAuthMessage(null)

    if (newPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await onUpdatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setAuthMessage('Password updated. You can sign in with your new password on other devices.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    setAuthError(null)
    setAuthMessage(null)
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
      ) : passwordRecovery ? (
        <>
          <p className="hint">Set a new password for {userEmail ?? 'your account'}.</p>
          <form className="cloud-form" onSubmit={handleUpdatePassword}>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <div className="cloud-form-actions">
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update password'}
              </button>
              <button type="button" className="chip" onClick={onDismissPasswordRecovery}>
                Cancel
              </button>
            </div>
          </form>
          {authError && <p className="auth-error">{authError}</p>}
          {authMessage && <p className="auth-success">{authMessage}</p>}
        </>
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
            {mode === 'forgot'
              ? 'Enter your email and we will send a password reset link.'
              : 'Sign in to back up and sync your projects across phone and laptop.'}
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
            {mode !== 'forgot' && (
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
            )}
            <div className="cloud-form-actions">
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting
                  ? 'Please wait...'
                  : mode === 'signin'
                    ? 'Sign in'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Send reset link'}
              </button>
              {mode === 'signin' && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setMode('forgot')
                    setAuthError(null)
                    setAuthMessage(null)
                  }}
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setMode((current) =>
                    current === 'signin' ? 'signup' : current === 'signup' ? 'signin' : 'signin',
                  )
                  setAuthError(null)
                  setAuthMessage(null)
                }}
              >
                {mode === 'signin'
                  ? 'Need an account?'
                  : mode === 'signup'
                    ? 'Have an account?'
                    : 'Back to sign in'}
              </button>
            </div>
          </form>
          {authError && <p className="auth-error">{authError}</p>}
          {authMessage && <p className="auth-success">{authMessage}</p>}
        </>
      )}
    </section>
  )
}
