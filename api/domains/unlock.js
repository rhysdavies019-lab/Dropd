import { requireAuth, json } from '../_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405)

  const { user, supabase, error } = await requireAuth(req)
  if (error) return json(res, { error }, 401)

  const { domainId } = req.body
  if (!domainId) return json(res, { error: 'domainId required' }, 400)

  const { data: profile } = await supabase
    .from('users').select('credits').eq('id', user.id).single()

  if ((profile?.credits ?? 0) < 1)
    return json(res, { error: 'Insufficient credits' }, 402)

  const { data: existing } = await supabase
    .from('unlocks').select('id').eq('user_id', user.id).eq('domain_id', domainId).single()
  if (existing) return json(res, { already_unlocked: true })

  await Promise.all([
    supabase.from('unlocks').insert({ user_id: user.id, domain_id: domainId }),
    supabase.from('users').update({ credits: profile.credits - 1 }).eq('id', user.id),
  ])

  const { data: domain } = await supabase
    .from('domains').select('name').eq('id', domainId).single()

  return json(res, { success: true, name: domain?.name })
}
