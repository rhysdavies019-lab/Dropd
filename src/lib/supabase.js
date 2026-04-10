import { createClient } from '@supabase/supabase-js'

// These env vars are set in .env (copy from .env.example)
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co'
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Auth helpers ──────────────────────────────────────────────────────────

export async function signUpWithEmail(email, password) {
  return supabase.auth.signUp({ email, password })
}

export async function signInWithEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

// ─── Domain helpers ────────────────────────────────────────────────────────

export async function getUnlockedDomains(userId) {
  const { data, error } = await supabase
    .from('unlocks')
    .select('domain_id')
    .eq('user_id', userId)
  return { unlockedIds: data?.map(r => r.domain_id) ?? [], error }
}

export async function unlockDomain(userId, domainId) {
  return supabase.from('unlocks').insert({ user_id: userId, domain_id: domainId })
}

// ─── User profile helpers ──────────────────────────────────────────────────

export async function getUserProfile(userId) {
  return supabase.from('users').select('*').eq('id', userId).single()
}

export async function updateUserProfile(userId, updates) {
  return supabase.from('users').update(updates).eq('id', userId)
}

// ─── Watchlist helpers ─────────────────────────────────────────────────────

export async function getWatchlist(userId) {
  return supabase.from('watchlist').select('*').eq('user_id', userId)
}

export async function addWatchlistKeyword(userId, keyword) {
  return supabase.from('watchlist').insert({
    user_id:    userId,
    keyword,
    alert_email: true,
    alert_sms:   false,
    alert_app:   true,
  })
}

export async function removeWatchlistKeyword(id) {
  return supabase.from('watchlist').delete().eq('id', id)
}

export async function updateWatchlistAlert(id, field, value) {
  return supabase.from('watchlist').update({ [field]: value }).eq('id', id)
}
