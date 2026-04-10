import { requireAuth, json } from '../_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  const { user, supabase, error } = await requireAuth(req)
  if (error) return json(res, { error }, 401)
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  return json(res, { user: profile })
}
