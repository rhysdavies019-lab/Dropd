/**
 * enrichDomain.js
 *
 * Fetches free data for a domain and returns scored signals.
 *
 * Free APIs used:
 *   1. OpenPageRank  — real backlink authority (free key at openpagerank.com)
 *   2. Wayback CDX   — first seen date / domain age (no key required)
 *
 * In development (no OPR key), scoring falls back to heuristics only.
 */

import { scoreDomain } from './scoring'

const OPR_KEY = import.meta.env.VITE_OPR_API_KEY ?? ''

// ─── OpenPageRank ───────────────────────────────────────────────────────────
async function fetchPageRank(domain) {
  if (!OPR_KEY) return { pageRank: null, backlinks: null }

  try {
    const res = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
      { headers: { 'API-OPR': OPR_KEY } }
    )
    const json = await res.json()
    const entry = json?.response?.[0]
    return {
      pageRank: entry?.page_rank_decimal ?? null,
      backlinks: entry?.backlinks ?? null,
    }
  } catch {
    return { pageRank: null, backlinks: null }
  }
}

// ─── Wayback Machine CDX — first seen year ───────────────────────────────────
async function fetchFirstSeen(domain) {
  try {
    // CDX API returns the earliest snapshot timestamp
    const res = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&limit=1&from=19900101&to=20991231`
    )
    const json = await res.json()
    // json[0] is the header row ["timestamp"], json[1] is first result
    const ts = json?.[1]?.[0]
    if (!ts) return null
    return parseInt(ts.slice(0, 4), 10) // extract year from e.g. "20080412..."
  } catch {
    return null
  }
}

/**
 * Enrich a single domain with free API data + score it.
 * Returns an object ready to merge into a domain card.
 */
export async function enrichDomain(domainName) {
  // Fetch both in parallel
  const [{ pageRank, backlinks }, firstSeenYear] = await Promise.all([
    fetchPageRank(domainName),
    fetchFirstSeen(domainName),
  ])

  const currentYear = new Date().getFullYear()
  const age = firstSeenYear ? currentYear - firstSeenYear : null

  const { score, grade } = scoreDomain({
    name: domainName,
    pageRank,
    firstSeenYear,
  })

  return {
    score,
    grade,
    backlinks: backlinks ?? null,
    age:       age ?? null,
    firstSeenYear,
    pageRank,
    dataSource: OPR_KEY ? 'OpenPageRank + Wayback' : 'Heuristic (add OPR key for real data)',
  }
}

/**
 * Enrich multiple domains — rate limited to avoid hammering free APIs.
 * Returns array of enriched results in the same order as input.
 */
export async function enrichDomains(domainNames, onProgress) {
  const results = []
  for (let i = 0; i < domainNames.length; i++) {
    const result = await enrichDomain(domainNames[i])
    results.push({ name: domainNames[i], ...result })
    onProgress?.(i + 1, domainNames.length)
    // Small delay to be polite to free APIs
    if (i < domainNames.length - 1) await new Promise(r => setTimeout(r, 300))
  }
  return results
}
