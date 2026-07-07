import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'

function hasRecoveryHash(): boolean {
  const hash = window.location.hash
  return hash.includes('type=recovery') || hash.includes('type=password_recovery')
}

function clearAuthHashFromUrl() {
  if (!window.location.hash) return
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [passwordRecovery, setPasswordRecovery] = useState(hasRecoveryHash)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      if (hasRecoveryHash()) setPasswordRecovery(true)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY' || hasRecoveryHash()) {
        setPasswordRecovery(true)
      }
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error('Cloud sync is not configured')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Cloud sync is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setPasswordRecovery(false)
  }

  async function requestPasswordReset(email: string) {
    if (!supabase) throw new Error('Cloud sync is not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    if (!supabase) throw new Error('Cloud sync is not configured')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setPasswordRecovery(false)
    clearAuthHashFromUrl()
  }

  function dismissPasswordRecovery() {
    setPasswordRecovery(false)
    clearAuthHashFromUrl()
  }

  return {
    user,
    loading,
    isConfigured: isSupabaseConfigured,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    dismissPasswordRecovery,
  }
}
