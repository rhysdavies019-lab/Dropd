import { requireAuth, adminClient, json } from '../_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return json(res, { error: 'Method not allowed' }, 405)
  const { user, supabase, error } = await requireAuth(req)
  if (error) return json(res, { error }, 401)
  await Promise.all([
    supabase.from('unlocks').delete().eq('user_id', user.id),
    supabase.from('watchlist').delete().eq('user_id', user.id),
    supabase.from('users').delete().eq('id', user.id),
  ])
  const admin = adminClient()
  await admin.auth.admin.deleteUser(user.id)
  return json(res, { deleted: true })
}
