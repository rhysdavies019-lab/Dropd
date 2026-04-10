import { createClient } from '@supabase/supabase-js'

export function adminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function requireAuth(req) {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '')
  if (!token) return { error: 'Unauthorised' }
  const supabase = adminClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: 'Invalid token' }
  return { user, supabase }
}

export function json(res, data, status = 200) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  return res.status(status).json(data)
}
