export function formatAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Authentication failed'

  if (message === 'Failed to fetch' || message.includes('NetworkError')) {
    return 'Cannot reach Supabase. Your project may be paused — open supabase.com/dashboard, restore the project, then try again.'
  }

  if (message.includes('Invalid login credentials')) {
    return 'Wrong email or password. Use Forgot password? or reset from Supabase → Authentication → Users.'
  }

  if (message.includes('Email not confirmed')) {
    return 'Check your email and confirm your account before signing in.'
  }

  if (message.includes('User already registered')) {
    return 'This email already has an account. Sign in instead, or use Forgot password?.'
  }

  return message
}
