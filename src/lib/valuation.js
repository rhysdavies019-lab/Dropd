/**
 * Domain Valuation Engine
 *
 * Two free data sources:
 *
 * 1. GoDaddy Appraisal API (no key needed)
 *    Returns a real machine-learning valuation for any domain.
 *    endpoint: https://appraisal.godaddy.com/api/v1/appraisal/{domain}
 *
 * 2. NameBio (historical sales database — 500k+ real sales)
 *    We search by keyword to find what similar domains actually sold for.
 *    endpoint: https://namebio.com/api/v2/
 *    Free tier: limited but enough for comparables.
 *
 * Profit estimate = GoDaddy appraisal value − estimated catch cost
 * Catch cost depends on competition: solo = ~£10, contested = auction price
 */

// ─── GoDaddy free appraisal ─────────────────────────────────────────────────
export async function getGoDaddyAppraisal(domain) {
  try {
    const res = await fetch(
      `https://appraisal.godaddy.com/api/v1/appraisal/${encodeURIComponent(domain)}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    // GoDaddy returns { govalue: 1234, ... }
    return data?.govalue ?? null
  } catch {
    return null
  }
}

// ─── NameBio comparable sales ────────────────────────────────────────────────
// Searches for recent sales of domains containing the same keyword
export async function getComparableSales(domain) {
  const keyword = domain.split('.')[0]           // e.g. "cryptovault"
  const tld     = domain.split('.').slice(1).join('.') // e.g. "io"

  try {
    // NameBio public search — returns sold domains matching keyword
    const res = await fetch(
      `https://namebio.com/api/v2/?q=${encodeURIComponent(keyword)}&tld=${encodeURIComponent(tld)}&sales=1&limit=5`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const sales = data?.results ?? []

    return sales.slice(0, 5).map(s => ({
      domain:   s.domain,
      price:    s.price,          // USD
      priceSterling: Math.round(s.price * 0.79), // approx USD→GBP
      date:     s.date,
      venue:    s.venue,          // e.g. "Sedo", "GoDaddy", "Afternic"
    }))
  } catch {
    return []
  }
}

// ─── Profit estimate ─────────────────────────────────────────────────────────
/**
 * Returns structured valuation data for display.
 * @param {string} domain  - e.g. "cryptovault.io"
 * @param {number} fallback - heuristic score-based estimate (shown if APIs fail)
 */
export async function getValuation(domain, fallback = 0) {
  const [appraisal, comparables] = await Promise.all([
    getGoDaddyAppraisal(domain),
    getComparableSales(domain),
  ])

  const appraisalGbp = appraisal ? Math.round(appraisal * 0.79) : null
  const value        = appraisalGbp ?? fallback

  // Typical catch fee range
  const catchFeeMin  = 10   // uncontested backorder (GBP)
  const catchFeeMax  = 50   // lightly contested (GBP)

  const profitMin    = Math.max(0, value - catchFeeMax)
  const profitMax    = Math.max(0, value - catchFeeMin)

  // Comparable average — used to validate the appraisal
  const compAvg = comparables.length
    ? Math.round(comparables.reduce((s, c) => s + c.priceSterling, 0) / comparables.length)
    : null

  return {
    appraisalGbp,          // GoDaddy's ML valuation in GBP
    compAvg,               // average of comparable sales in GBP
    comparables,           // array of real past sales
    value,                 // best available value estimate
    profitMin,             // conservative profit (after contested catch)
    profitMax,             // optimistic profit (after solo catch)
    source: appraisalGbp ? 'GoDaddy Appraisal' : 'Heuristic estimate',
  }
}
