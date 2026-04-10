/**
 * Called by cron-job.org every hour to score new domains.
 * Set up a free cron at cron-job.org pointing to:
 *   POST https://your-app.vercel.app/api/pipeline/run
 *   Header: x-admin-key: your-secret
 */
import { adminClient } from '../_lib/supabase.js'

const TLD_SCORES = {
  '.com':100,'.io':82,'.ai':85,'.co':75,'.app':70,
  '.dev':68,'.net':60,'.org':55,'.gg':52,
}
const KEYWORDS = {
  premium:  ['ai','gpt','crypto','bitcoin','defi','finance','fintech','health','invest','capital','saas'],
  good:     ['legal','recruit','data','tech','digital','cyber','api','lab','pro','hub','stack','brand'],
  moderate: ['gym','fit','meal','food','travel','media','shop','store','studio'],
}

function score(name, firstSeenYear) {
  const n   = name.toLowerCase()
  const ext = '.' + name.split('.').slice(1).join('.')
  const base = name.split('.')[0]
  const kw  = KEYWORDS.premium.some(k=>n.includes(k)) ? 100 : KEYWORDS.good.some(k=>n.includes(k)) ? 70 : KEYWORDS.moderate.some(k=>n.includes(k)) ? 45 : 25
  const tld = TLD_SCORES[ext] ?? 20
  const len = base.length<=5?100:base.length<=8?80:base.length<=11?60:base.length<=14?40:20
  const age = firstSeenYear ? new Date().getFullYear()-firstSeenYear : 0
  const ageS= age>=15?100:age>=10?85:age>=7?70:age>=5?55:age>=3?40:20
  return Math.round(kw*0.30 + tld*0.25 + ageS*0.25 + len*0.20)
}

function grade(s) { return s>=88?'A+':s>=74?'A':s>=58?'B':s>=40?'C':'D' }
function blur(name) {
  const [base,...rest]=name.split('.'); const tld=rest.join('.')
  return base.length<=4 ? base[0]+'***.'+tld : base.slice(0,3)+'***'+base.slice(-1)+'.'+tld
}
function category(name) {
  const n=name.toLowerCase()
  if(['ai','gpt','llm','prompt','bot'].some(k=>n.includes(k))) return 'AI'
  if(['crypto','bitcoin','defi','web3'].some(k=>n.includes(k))) return 'Crypto'
  if(['finance','fintech','bank','invest','capital','tax'].some(k=>n.includes(k))) return 'Finance'
  if(['health','medical','pharma','biotech','fit','gym'].some(k=>n.includes(k))) return 'Health'
  if(['legal','law'].some(k=>n.includes(k))) return 'Legal'
  if(['cloud','saas','api','data','tech','dev','cyber'].some(k=>n.includes(k))) return 'Technology'
  if(['market','brand','agency'].some(k=>n.includes(k))) return 'Marketing'
  if(['media','pod','cast','studio'].some(k=>n.includes(k))) return 'Media'
  return 'General'
}

async function firstSeen(domain) {
  try {
    const r = await fetch(`https://web.archive.org/cdx/search/cdx?url=${domain}&output=json&fl=timestamp&limit=1`)
    const j = await r.json()
    const ts = j?.[1]?.[0]
    return ts ? parseInt(ts.slice(0,4),10) : null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(403).json({ error: 'Forbidden' })

  const supabase  = adminClient()
  const seedList  = (process.env.DOMAIN_SEED_LIST || '').split(',').map(d=>d.trim()).filter(Boolean)
  const feedUrl   = process.env.DOMAIN_FEED_URL

  let names = [...seedList]
  if (feedUrl) {
    try {
      const r = await fetch(feedUrl)
      const t = await r.text()
      names.push(...t.split('\n').map(l=>l.trim()).filter(l=>l.includes('.')).slice(0,100))
    } catch {}
  }
  names = [...new Set(names)]

  const results = []
  for (const name of names) {
    const year  = await firstSeen(name)
    const s     = score(name, year)
    const ext   = '.' + name.split('.').slice(1).join('.')
    const age   = year ? new Date().getFullYear()-year : 0
    results.push({
      name, name_hashed: blur(name),
      grade: grade(s), score: s,
      backlinks: 0, age, category: category(name),
      extension: ext, estimated_value: Math.round(s**2*0.9),
      reason: `Scored ${s}/100 based on TLD, age, and keyword niche.`,
      created_at: new Date().toISOString(),
    })
    await new Promise(r=>setTimeout(r,400))
  }

  if (results.length) {
    await supabase.from('domains').upsert(results, { onConflict: 'name' })
    const cutoff = new Date(Date.now()-7*86400000).toISOString()
    await supabase.from('domains').delete().lt('created_at', cutoff)
  }

  return res.json({ processed: results.length })
}
