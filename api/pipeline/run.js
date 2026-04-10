/**
 * Called by cron-job.org every hour to find & score real expiring domains.
 * POST https://your-app.vercel.app/api/pipeline/run
 * Header: x-admin-key: your-secret
 *
 * How it works:
 * 1. Generates thousands of quality domain name combinations
 * 2. Checks each against the free RDAP registry API for real expiry dates
 * 3. Keeps only domains expiring within 60 days
 * 4. Scores, grades, and stores them in Supabase
 * Fully automated — no paid APIs, no manual work.
 */
import { adminClient } from '../_lib/supabase.js'

// ─── Scoring config ────────────────────────────────────────────────────────
const TLD_SCORES = {
  '.com':100,'.io':82,'.ai':85,'.co':75,'.app':70,
  '.dev':68,'.net':60,'.org':55,'.gg':52,
}
const KEYWORDS = {
  premium:  ['ai','gpt','crypto','bitcoin','defi','finance','fintech','health','invest','capital','saas','llm','nft'],
  good:     ['legal','recruit','data','tech','digital','cyber','api','lab','pro','hub','stack','brand','cloud','edge'],
  moderate: ['gym','fit','meal','food','travel','media','shop','store','studio','agency'],
}

// ─── Domain name generation ────────────────────────────────────────────────
const PREFIXES = [
  'ai','crypto','fin','health','legal','cloud','data','cyber','saas','dev',
  'tech','nano','edge','green','solar','fit','meal','media','brand','market',
  'invest','capital','defi','gpt','llm','web3','bio','eco','auto','smart',
  'fast','easy','quick','pro','top','best','next','new','open','meta',
]
const SUFFIXES = [
  'lab','hub','stack','pro','vault','base','flow','pulse','ops','track',
  'pilot','recruit','ledger','chain','agent','bot','route','compute','studio',
  'tools','hq','zone','dash','grid','link','fx','iq','ai','io',
]
const TLDS = ['.io','.co','.ai','.app','.dev','.net','.org','.com']

// Generate a shuffled batch of domain candidates
function generateCandidates(batchSize = 80) {
  const all = []
  for (const prefix of PREFIXES) {
    for (const suffix of SUFFIXES) {
      for (const tld of TLDS) {
        // Skip if suffix is same as TLD part (e.g. ailab.ai with suffix 'ai')
        if (tld === '.' + suffix) continue
        all.push(`${prefix}${suffix}${tld}`)
      }
    }
  }
  // Shuffle and return a batch
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, batchSize)
}

// ─── Scoring functions ─────────────────────────────────────────────────────
function scoreD(name, firstSeenYear) {
  const n    = name.toLowerCase()
  const ext  = '.' + name.split('.').slice(1).join('.')
  const base = name.split('.')[0]
  const kw   = KEYWORDS.premium.some(k=>n.includes(k)) ? 100
             : KEYWORDS.good.some(k=>n.includes(k))    ? 70
             : KEYWORDS.moderate.some(k=>n.includes(k)) ? 45 : 25
  const tld  = TLD_SCORES[ext] ?? 20
  const len  = base.length<=5?100:base.length<=8?80:base.length<=11?60:base.length<=14?40:20
  const age  = firstSeenYear ? new Date().getFullYear()-firstSeenYear : 0
  const ageS = age>=15?100:age>=10?85:age>=7?70:age>=5?55:age>=3?40:20
  return Math.round(kw*0.30 + tld*0.25 + ageS*0.25 + len*0.20)
}

function grade(s)  { return s>=88?'A+':s>=74?'A':s>=58?'B':s>=40?'C':'D' }

function blur(name) {
  const [base,...rest] = name.split('.')
  const tld = rest.join('.')
  return base.length<=4
    ? base[0]+'***.'+tld
    : base.slice(0,3)+'***'+base.slice(-1)+'.'+tld
}

function category(name) {
  const n = name.toLowerCase()
  if (['ai','gpt','llm','prompt','bot'].some(k=>n.includes(k)))              return 'AI'
  if (['crypto','bitcoin','defi','web3','nft'].some(k=>n.includes(k)))       return 'Crypto'
  if (['finance','fintech','bank','invest','capital','tax'].some(k=>n.includes(k))) return 'Finance'
  if (['health','medical','pharma','biotech','fit','gym'].some(k=>n.includes(k)))   return 'Health'
  if (['legal','law'].some(k=>n.includes(k)))                                return 'Legal'
  if (['cloud','saas','api','data','tech','dev','cyber','edge'].some(k=>n.includes(k))) return 'Technology'
  if (['market','brand','agency'].some(k=>n.includes(k)))                    return 'Marketing'
  if (['media','pod','cast','studio'].some(k=>n.includes(k)))                return 'Media'
  return 'General'
}

// ─── Free API calls ────────────────────────────────────────────────────────

// RDAP — free registry API, no key needed, returns real expiry dates
async function getExpiryDate(domain) {
  try {
    const r = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { 'Accept': 'application/rdap+json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) return null
    const data = await r.json()
    const exp  = data.events?.find(e => e.eventAction === 'expiration')
    return exp?.eventDate ?? null
  } catch { return null }
}

// Wayback Machine — free, gets domain age
async function firstSeen(domain) {
  try {
    const r  = await fetch(`https://web.archive.org/cdx/search/cdx?url=${domain}&output=json&fl=timestamp&limit=1`, { signal: AbortSignal.timeout(5000) })
    const j  = await r.json()
    const ts = j?.[1]?.[0]
    return ts ? parseInt(ts.slice(0,4),10) : null
  } catch { return null }
}

// ─── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(403).json({ error: 'Forbidden' })

  const supabase = adminClient()

  // Combine: user seed list + generated candidates
  const seedList   = (process.env.DOMAIN_SEED_LIST || '').split(',').map(d=>d.trim()).filter(Boolean)
  const generated  = generateCandidates(60)
  const candidates = [...new Set([...seedList, ...generated])]

  // Also pull from external feed URL if configured
  const feedUrl = process.env.DOMAIN_FEED_URL
  if (feedUrl) {
    try {
      const r = await fetch(feedUrl)
      const t = await r.text()
      candidates.push(...t.split('\n').map(l=>l.trim()).filter(l=>l.includes('.')).slice(0,50))
    } catch {}
  }

  const DAYS_WINDOW = 60  // show domains expiring within 60 days
  const MIN_SCORE   = 40  // skip D-grade domains
  const results     = []
  let   checked     = 0

  for (const name of [...new Set(candidates)]) {
    checked++
    try {
      // 1. Check real expiry date via RDAP
      const expiryStr = await getExpiryDate(name)

      let dropDate = null
      if (expiryStr) {
        const expiry       = new Date(expiryStr)
        const daysUntilExp = (expiry - Date.now()) / 86400000

        // Skip if not expiring within our window (or already expired >30 days ago)
        if (daysUntilExp > DAYS_WINDOW || daysUntilExp < -30) {
          await new Promise(r=>setTimeout(r,150))
          continue
        }
        dropDate = expiry.toISOString()
      } else {
        // RDAP returned nothing — domain likely unregistered, skip
        await new Promise(r=>setTimeout(r,150))
        continue
      }

      // 2. Get domain age from Wayback Machine
      const year = await firstSeen(name)
      const s    = scoreD(name, year)

      // Skip low-grade domains
      if (s < MIN_SCORE) { await new Promise(r=>setTimeout(r,150)); continue }

      const ext = '.' + name.split('.').slice(1).join('.')
      const age = year ? new Date().getFullYear() - year : 0

      results.push({
        name,
        name_hashed:     blur(name),
        grade:           grade(s),
        score:           s,
        backlinks:       0,
        age,
        category:        category(name),
        extension:       ext,
        estimated_value: Math.round(s**2 * 0.9),
        drop_date:       dropDate,
        reason:          `Scored ${s}/100. Drops ${new Date(dropDate).toLocaleDateString('en-GB')}. Rated on TLD quality, domain age, and keyword value.`,
        created_at:      new Date().toISOString(),
      })

    } catch { /* skip on error */ }
    await new Promise(r=>setTimeout(r,300))
  }

  // Upsert results and clean up old entries
  if (results.length) {
    await supabase.from('domains').upsert(results, { onConflict: 'name' })
  }

  // Remove entries older than 14 days
  const cutoff = new Date(Date.now() - 14*86400000).toISOString()
  await supabase.from('domains').delete().lt('created_at', cutoff)

  return res.json({
    found:   results.length,
    checked,
    grades:  results.reduce((acc,d)=>({ ...acc, [d.grade]: (acc[d.grade]||0)+1 }),{}),
  })
}
