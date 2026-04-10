/**
 * Dropd — Automated Domain Pipeline
 *
 * Runs on a Cloudflare Cron Trigger (see wrangler.toml).
 * Default schedule: every day at 06:00 UTC.
 *
 * What it does each run:
 *   1. Fetch expiring domain lists from free sources
 *   2. Score each domain (OpenPageRank + Wayback + heuristics)
 *   3. Upsert into Supabase `domains` table
 *   4. Old domains (>7 days) are pruned automatically
 *
 * Free data sources used:
 *   A. expireddomains.net — daily drop lists (free account CSV export)
 *   B. OpenPageRank API   — backlink authority (free key, 100 req/day)
 *   C. Wayback CDX API    — domain age / first seen (no key needed)
 */

// ─── TLD value table ────────────────────────────────────────────────────────
const TLD_SCORES = {
  '.com': 100, '.io': 82, '.ai': 85, '.co': 75, '.app': 70,
  '.dev': 68,  '.net': 60, '.org': 55, '.gg': 52,
}

const KEYWORD_MAP = {
  premium:  ['ai','gpt','crypto','bitcoin','defi','finance','fintech','health','biotech','invest','capital','saas','cloud'],
  good:     ['legal','recruit','hr','data','tech','digital','cyber','api','lab','pro','hub','base','stack','brand'],
  moderate: ['gym','fit','meal','food','travel','media','shop','store','studio'],
}

function heuristicScore(name, firstSeenYear) {
  const lower = name.toLowerCase()
  const ext   = '.' + name.split('.').slice(1).join('.')
  const base  = name.split('.')[0]

  const kwScore =
    KEYWORD_MAP.premium.some(k => lower.includes(k))  ? 100 :
    KEYWORD_MAP.good.some(k => lower.includes(k))     ? 70  :
    KEYWORD_MAP.moderate.some(k => lower.includes(k)) ? 45  : 25

  const tldScore = TLD_SCORES[ext] ?? 20

  const lenScore =
    base.length <= 5  ? 100 :
    base.length <= 8  ? 80  :
    base.length <= 11 ? 60  :
    base.length <= 14 ? 40  : 20

  const age = firstSeenYear ? new Date().getFullYear() - firstSeenYear : 0
  const ageScore =
    age >= 15 ? 100 : age >= 10 ? 85 : age >= 7 ? 70 :
    age >= 5  ? 55  : age >= 3  ? 40 : 20

  return Math.round(kwScore * 0.30 + tldScore * 0.25 + ageScore * 0.25 + lenScore * 0.20)
}

function scoreWithOpr(oprScore, firstSeenYear, name) {
  const prNorm    = Math.min(100, Math.round(((oprScore ?? 0) / 10) * 100))
  const base      = heuristicScore(name, firstSeenYear)
  // Blend: 50% OPR + 50% heuristic when OPR available
  return oprScore != null
    ? Math.round(prNorm * 0.50 + base * 0.50)
    : base
}

function grade(score) {
  return score >= 88 ? 'A+' : score >= 74 ? 'A' : score >= 58 ? 'B' : score >= 40 ? 'C' : 'D'
}

function blurName(name) {
  const [base, ...rest] = name.split('.')
  const tld = rest.join('.')
  if (base.length <= 4) return base[0] + '***.' + tld
  return base.slice(0, 3) + '***' + base.slice(-1) + '.' + tld
}

function estimatedValue(score) {
  return Math.round(score ** 2 * 0.9)
}

// ─── Wayback: first seen year ───────────────────────────────────────────────
async function fetchFirstSeen(domain) {
  try {
    const res = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&limit=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    const json = await res.json()
    const ts = json?.[1]?.[0]
    return ts ? parseInt(ts.slice(0, 4), 10) : null
  } catch { return null }
}

// ─── OpenPageRank ───────────────────────────────────────────────────────────
async function fetchOPR(domain, oprKey) {
  if (!oprKey) return { pageRank: null, backlinks: 0 }
  try {
    const res = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
      { headers: { 'API-OPR': oprKey }, signal: AbortSignal.timeout(6000) }
    )
    const json = await res.json()
    const entry = json?.response?.[0]
    return { pageRank: entry?.page_rank_decimal ?? null, backlinks: entry?.backlinks ?? 0 }
  } catch { return { pageRank: null, backlinks: 0 } }
}

// ─── Category tag ───────────────────────────────────────────────────────────
function detectCategory(name) {
  const n = name.toLowerCase()
  if (['ai','gpt','llm','prompt','bot'].some(k => n.includes(k)))           return 'AI'
  if (['crypto','bitcoin','defi','web3','nft','chain'].some(k => n.includes(k))) return 'Crypto'
  if (['finance','fintech','bank','invest','fund','capital','tax','debt'].some(k => n.includes(k))) return 'Finance'
  if (['health','medical','pharma','biotech','nano','fit','gym','meal'].some(k => n.includes(k)))   return 'Health'
  if (['legal','law'].some(k => n.includes(k)))                              return 'Legal'
  if (['cloud','saas','api','data','tech','dev','cyber','stack','compute'].some(k => n.includes(k))) return 'Technology'
  if (['recruit','hr','talent'].some(k => n.includes(k)))                    return 'HR'
  if (['market','brand','agency','reward'].some(k => n.includes(k)))         return 'Marketing'
  if (['media','pod','cast','studio'].some(k => n.includes(k)))              return 'Media'
  if (['shop','store','print','retail'].some(k => n.includes(k)))            return 'Retail'
  if (['solar','energy','green','eco'].some(k => n.includes(k)))             return 'Energy'
  if (['travel','hotel','flight'].some(k => n.includes(k)))                  return 'Travel'
  return 'General'
}

// ─── Enrich a single domain ──────────────────────────────────────────────────
async function enrichDomain(domainName, oprKey) {
  const [{ pageRank, backlinks }, firstSeenYear] = await Promise.all([
    fetchOPR(domainName, oprKey),
    fetchFirstSeen(domainName),
  ])

  const score    = scoreWithOpr(pageRank, firstSeenYear, domainName)
  const ext      = '.' + domainName.split('.').slice(1).join('.')
  const age      = firstSeenYear ? new Date().getFullYear() - firstSeenYear : null
  const category = detectCategory(domainName)

  return {
    name:            domainName,
    name_hashed:     blurName(domainName),
    grade:           grade(score),
    score,
    backlinks:       backlinks ?? 0,
    age:             age ?? 0,
    category,
    extension:       ext,
    estimated_value: estimatedValue(score),
    reason:          buildReason(domainName, score, backlinks, age, category),
    created_at:      new Date().toISOString(),
  }
}

function buildReason(name, score, backlinks, age, category) {
  const parts = []
  if (backlinks > 1000) parts.push(`${backlinks.toLocaleString()} backlinks from authority sources.`)
  else if (backlinks > 0) parts.push(`${backlinks.toLocaleString()} inbound backlinks.`)
  if (age >= 10) parts.push(`${age}-year-old domain — strong age signal.`)
  else if (age >= 5) parts.push(`${age} years old — decent aged domain.`)
  parts.push(`${category} niche.`)
  if (name.split('.')[0].length <= 7) parts.push('Short, brandable name.')
  return parts.join(' ') || 'Scored using domain age, TLD value and keyword analysis.'
}

// ─── Fetch dropping domains from expireddomains.net ──────────────────────────
// They expose a publicly accessible list. A free account unlocks CSV export.
// Here we parse their basic public feed as a fallback.
async function fetchExpiringDomains(env) {
  const domains = []

  // Method A: Use pre-configured domain list from env (easiest to start with)
  // Set DOMAIN_SEED_LIST in wrangler.toml vars as a comma-separated string
  if (env.DOMAIN_SEED_LIST) {
    const seeded = env.DOMAIN_SEED_LIST.split(',').map(d => d.trim()).filter(Boolean)
    domains.push(...seeded)
  }

  // Method B: Fetch from a custom webhook / Airtable / Google Sheet URL you control
  // Set DOMAIN_FEED_URL in wrangler secrets to a URL that returns one domain per line
  if (env.DOMAIN_FEED_URL) {
    try {
      const res  = await fetch(env.DOMAIN_FEED_URL, { signal: AbortSignal.timeout(10000) })
      const text = await res.text()
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.includes('.'))
      domains.push(...lines.slice(0, 100)) // cap at 100 per run
    } catch (e) {
      console.error('Domain feed fetch failed:', e.message)
    }
  }

  return [...new Set(domains)] // deduplicate
}

// ─── Main pipeline function (called by cron trigger) ──────────────────────────
export async function runPipeline(env) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('[Pipeline] Starting domain enrichment run…')

  const domainNames = await fetchExpiringDomains(env)

  if (domainNames.length === 0) {
    console.log('[Pipeline] No domains to process. Add DOMAIN_SEED_LIST or DOMAIN_FEED_URL to wrangler secrets.')
    return { processed: 0 }
  }

  console.log(`[Pipeline] Processing ${domainNames.length} domains…`)

  const results = []
  for (const name of domainNames) {
    try {
      const enriched = await enrichDomain(name, env.OPR_API_KEY)
      results.push(enriched)
      console.log(`[Pipeline] ✓ ${name} → ${enriched.grade} (${enriched.score})`)
      // Be polite to free APIs
      await new Promise(r => setTimeout(r, 400))
    } catch (e) {
      console.error(`[Pipeline] ✗ ${name}: ${e.message}`)
    }
  }

  // Upsert into Supabase (insert or update by name)
  if (results.length > 0) {
    const { error } = await supabase
      .from('domains')
      .upsert(results, { onConflict: 'name' })

    if (error) console.error('[Pipeline] DB upsert error:', error.message)
    else       console.log(`[Pipeline] Saved ${results.length} domains to database.`)
  }

  // Prune domains older than 7 days
  const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString()
  await supabase.from('domains').delete().lt('created_at', cutoff)
  console.log('[Pipeline] Pruned old domains.')

  return { processed: results.length }
}
