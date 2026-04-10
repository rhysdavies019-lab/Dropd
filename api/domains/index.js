import { requireAuth, adminClient, json } from '../_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405)

  const { user, supabase, error } = await requireAuth(req)
  if (error) return json(res, { error }, 401)

  const { data: profile } = await supabase
    .from('users').select('plan').eq('id', user.id).single()

  const plan       = profile?.plan ?? 'free'
  const delayHours = plan === 'pro' ? 0 : plan === 'hunter' ? 2 : 6
  const cutoff     = new Date(Date.now() - delayHours * 3600000).toISOString()

  const { grade, category, extension } = req.query

  let query = supabase
    .from('domains')
    .select('id,name_hashed,grade,score,backlinks,age,category,extension,estimated_value,created_at,reason')
    .lte('created_at', cutoff)
    .order('score', { ascending: false })
    .limit(50)

  if (grade)     query = query.eq('grade', grade)
  if (category)  query = query.eq('category', category)
  if (extension) query = query.eq('extension', extension)

  const { data: domains, error: dbErr } = await query
  if (dbErr) return json(res, { error: dbErr.message }, 500)

  return json(res, { domains, plan })
}
