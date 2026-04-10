import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null) // from our public.users table
  const [loading, setLoading] = useState(true)

  // Load initial session and subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single()
    // If no profile row yet (first login), use sensible defaults
    setProfile(data ?? {
      id:         userId,
      plan:       'free',
      credits:    2,
      niche_lock: null,
    })
    setLoading(false)
  }

  // Shorthand getters used throughout the app
  const plan    = profile?.plan    ?? 'free'
  const credits = profile?.credits ?? 0
  const isPro   = plan === 'pro'
  const isHunter = plan === 'hunter'

  return (
    <AuthContext.Provider value={{ user, profile, loading, plan, credits, isPro, isHunter, loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
