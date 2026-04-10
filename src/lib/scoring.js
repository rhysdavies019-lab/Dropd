/**
 * Dropd Scoring Engine
 *
 * Grades domains A+–D using weighted signals from free APIs.
 * Each signal is normalised to 0–100 before weighting.
 *
 * Weights:
 *   40% — OpenPageRank (real backlink authority)
 *   20% — Domain age   (Wayback Machine first-seen date)
 *   15% — TLD value    (.com best, then .io, .co, .ai, etc.)
 *   15% — Keyword niche value (AI, crypto, finance = premium)
 *   10% — Domain length (shorter = more brandable)
 */

// ─── TLD value table ────────────────────────────────────────────────────────
const TLD_SCORES = {
  '.com': 100, '.io': 82, '.ai': 85, '.co': 75, '.app': 70,
  '.dev': 68,  '.net': 60, '.org': 55, '.gg': 52, '.xyz': 35,
  '.info': 30, '.biz': 25,
}

// ─── High-value keyword categories ─────────────────────────────────────────
const KEYWORD_NICHES = {
  // Premium — AI, crypto, finance, health
  premium: ['ai', 'gpt', 'llm', 'crypto', 'bitcoin', 'defi', 'web3', 'nft',
            'finance', 'fintech', 'bank', 'invest', 'fund', 'capital',
            'health', 'medical', 'pharma', 'biotech', 'nano'],
  // Good — SaaS, tech, legal, marketing
  good:    ['saas', 'cloud', 'api', 'data', 'tech', 'digital', 'cyber', 'dev',
            'legal', 'law', 'recruit', 'hr', 'agency', 'market', 'brand',
            'stack', 'hub', 'base', 'lab', 'pro', 'studio'],
  // Moderate — fitness, media, retail
  moderate:['gym', 'fit', 'sport', 'run', 'meal', 'food', 'travel', 'hotel',
            'media', 'pod', 'cast', 'blog', 'shop', 'store', 'print'],
}

function keywordScore(name) {
  const lower = name.toLowerCase()
  if (KEYWORD_NICHES.premium.some(k => lower.includes(k))) return 100
  if (KEYWORD_NICHES.good.some(k => lower.includes(k)))    return 70
  if (KEYWORD_NICHES.moderate.some(k => lower.includes(k))) return 45
  return 25
}

function lengthScore(name) {
  // Strip TLD, score by character count. <6 chars = perfect, >15 = poor
  const base = name.split('.')[0].length
  if (base <= 5)  return 100
  if (base <= 8)  return 80
  if (base <= 11) return 60
  if (base <= 14) return 40
  return 20
}

function tldScore(name) {
  const tld = '.' + name.split('.').slice(1).join('.')
  return TLD_SCORES[tld] ?? 20
}

function ageScore(firstSeenYear) {
  if (!firstSeenYear) return 30
  const age = new Date().getFullYear() - firstSeenYear
  if (age >= 15) return 100
  if (age >= 10) return 85
  if (age >= 7)  return 70
  if (age >= 5)  return 55
  if (age >= 3)  return 40
  return 20
}

function pagerankToScore(opr) {
  // OpenPageRank returns 0–10. Normalise to 0–100.
  if (!opr || opr === 0) return 5
  return Math.min(100, Math.round((opr / 10) * 100))
}

/**
 * Compute final 0–100 score + letter grade from raw signals.
 * @param {object} signals
 * @param {string} signals.name          - full domain name e.g. "cryptovault.io"
 * @param {number} signals.pageRank      - OpenPageRank 0–10 (null if unavailable)
 * @param {number} signals.backlinks     - raw backlink count (for display only)
 * @param {number} signals.firstSeenYear - year domain first appeared in Wayback
 */
export function scoreDomain(signals) {
  const { name, pageRank, firstSeenYear } = signals

  const prScore  = pagerankToScore(pageRank)
  const ageS     = ageScore(firstSeenYear)
  const tldS     = tldScore(name)
  const kwS      = keywordScore(name)
  const lenS     = lengthScore(name)

  const score = Math.round(
    prScore * 0.40 +
    ageS    * 0.20 +
    tldS    * 0.15 +
    kwS     * 0.15 +
    lenS    * 0.10
  )

  const grade =
    score >= 88 ? 'A+' :
    score >= 74 ? 'A'  :
    score >= 58 ? 'B'  :
    score >= 40 ? 'C'  : 'D'

  return { score, grade }
}
