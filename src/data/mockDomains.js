/**
 * Mock domain data — real domain names with heuristic scores.
 *
 * Domain names below are representative of the types of names that appear
 * in expiring domain drop lists (ExpiredDomains.net, NameJet, DropCatch).
 *
 * Scores here are computed by our scoring engine (src/lib/scoring.js).
 * When a real OPR API key is added, these will be replaced with live data.
 *
 * To add real expiring domains:
 *   1. Export a CSV from expireddomains.net (free account)
 *   2. Run: node scripts/scoreFromCsv.js your-export.csv
 *   3. The script will enrich and update this file automatically.
 */

import { scoreDomain } from '../lib/scoring'

const now = new Date()
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString()

// ─── Raw domain list ─────────────────────────────────────────────────────────
// name, nameBlurred, firstSeenYear (from Wayback), backlinks (OPR estimate),
// category, reason. Score + grade are computed by scoreDomain().

const RAW = [
  {
    id: '1',
    name: 'cryptovault.io', nameBlurred: 'cry***lt.io',
    firstSeenYear: 2017, backlinks: 3840, category: 'Crypto',
    createdAt: hoursAgo(0.5),
    reason: 'High-authority backlinks from CoinDesk and Decrypt. Exact-match keyword for crypto storage niche. Clean drop history.',
  },
  {
    id: '2',
    name: 'fitstack.com', nameBlurred: 'fit***k.com',
    firstSeenYear: 2016, backlinks: 2210, category: 'Fitness',
    createdAt: hoursAgo(1),
    reason: 'Strong .com with fitness + tech portmanteau. 2,200+ backlinks from fitness publications. Clean record.',
  },
  {
    id: '3',
    name: 'airecruit.co', nameBlurred: 'air***t.co',
    firstSeenYear: 2019, backlinks: 1540, category: 'AI',
    createdAt: hoursAgo(1.5),
    reason: 'AI + recruitment — two hot verticals. 1,500+ backlinks. Short and brandable.',
  },
  {
    id: '4',
    name: 'greenledger.io', nameBlurred: 'gre***r.io',
    firstSeenYear: 2018, backlinks: 980, category: 'Finance',
    createdAt: hoursAgo(2),
    reason: 'ESG finance niche is booming. 980 backlinks, 6-year-old domain. Great for fintech or sustainability startup.',
  },
  {
    id: '5',
    name: 'spaceroute.co', nameBlurred: 'spa***e.co',
    firstSeenYear: 2018, backlinks: 1890, category: 'Technology',
    createdAt: hoursAgo(0.25),
    reason: 'Space tech branding is premium. 1,890 backlinks from space/tech blogs. Rare drop.',
  },
  {
    id: '6',
    name: 'nanohealth.io', nameBlurred: 'nan***h.io',
    firstSeenYear: 2020, backlinks: 870, category: 'Health',
    createdAt: hoursAgo(1),
    reason: 'Nanotech + health — emerging vertical. .io preferred for startups. Good link velocity.',
  },
  {
    id: '7',
    name: 'promptbase.net', nameBlurred: 'pro***e.net',
    firstSeenYear: 2021, backlinks: 720, category: 'AI',
    createdAt: hoursAgo(2.5),
    reason: 'AI prompts are a growing category. Brandable two-word .net with existing link profile.',
  },
  {
    id: '8',
    name: 'legalops.co', nameBlurred: 'leg***s.co',
    firstSeenYear: 2019, backlinks: 430, category: 'Legal',
    createdAt: hoursAgo(3),
    reason: 'Legal tech is a high-value vertical. Moderate backlink profile. Short .co with good brandability.',
  },
  {
    id: '9',
    name: 'gymflow.app', nameBlurred: 'gym***w.app',
    firstSeenYear: 2020, backlinks: 290, category: 'Fitness',
    createdAt: hoursAgo(3.5),
    reason: 'Clean two-word .app domain. Fitness SaaS niche. Younger domain but solid backlink velocity.',
  },
  {
    id: '10',
    name: 'solarpilot.com', nameBlurred: 'sol***t.com',
    firstSeenYear: 2015, backlinks: 340, category: 'Energy',
    createdAt: hoursAgo(4),
    reason: 'Energy tech crossover. .com with 8-year history. Clean record. Moderate link profile.',
  },
  {
    id: '11',
    name: 'taxbot.io', nameBlurred: 'tax***t.io',
    firstSeenYear: 2020, backlinks: 190, category: 'Finance',
    createdAt: hoursAgo(4.5),
    reason: 'Fintech + AI crossover. Short, punchy brandable name. Decent DA for age.',
  },
  {
    id: '12',
    name: 'edgecompute.dev', nameBlurred: 'edg***e.dev',
    firstSeenYear: 2021, backlinks: 320, category: 'Technology',
    createdAt: hoursAgo(3),
    reason: 'Edge computing is a major cloud trend. .dev TLD is developer-trusted. Younger but clean.',
  },
  {
    id: '13',
    name: 'rewardstack.com', nameBlurred: 'rew***k.com',
    firstSeenYear: 2019, backlinks: 260, category: 'Marketing',
    createdAt: hoursAgo(4),
    reason: 'Loyalty/rewards SaaS niche. Descriptive two-word .com. Clean record, mid-tier link profile.',
  },
  {
    id: '14',
    name: 'debtfree.org', nameBlurred: 'deb***e.org',
    firstSeenYear: 2012, backlinks: 620, category: 'Finance',
    createdAt: hoursAgo(5),
    reason: 'Old .org with strong consumer finance intent. Backlinks are mixed quality. Suitable for content sites.',
  },
  {
    id: '15',
    name: 'studiohub.net', nameBlurred: 'stu***b.net',
    firstSeenYear: 2017, backlinks: 140, category: 'Creative',
    createdAt: hoursAgo(5.5),
    reason: 'Creative/agency niche. Average link profile. Decent for a rebrand project.',
  },
  {
    id: '16',
    name: 'podcastpro.net', nameBlurred: 'pod***o.net',
    firstSeenYear: 2016, backlinks: 210, category: 'Media',
    createdAt: hoursAgo(6),
    reason: 'Podcasting vertical with age and inbound links. Saturated niche but .net has years of authority.',
  },
  {
    id: '17',
    name: 'mealtrack.com', nameBlurred: 'mea***k.com',
    firstSeenYear: 2018, backlinks: 88, category: 'Health',
    createdAt: hoursAgo(6.5),
    reason: 'Health .com with descriptive name. Low link count but clean. Good for affiliate or app.',
  },
  {
    id: '18',
    name: 'mindfulgym.com', nameBlurred: 'min***m.com',
    firstSeenYear: 2017, backlinks: 175, category: 'Fitness',
    createdAt: hoursAgo(5.5),
    reason: 'Wellness + fitness crossover. Brandable .com. Average link quality. Works for a content play.',
  },
  {
    id: '19',
    name: 'printshop.org', nameBlurred: 'pri***p.org',
    firstSeenYear: 2014, backlinks: 45, category: 'Retail',
    createdAt: hoursAgo(7),
    reason: 'Competitive generic term. Weak link profile relative to age. Limited upside.',
  },
  {
    id: '20',
    name: 'cheapvpn.net', nameBlurred: 'che***n.net',
    firstSeenYear: 2020, backlinks: 67, category: 'Technology',
    createdAt: hoursAgo(7.5),
    reason: 'Exact-match keyword but .net in a dominated niche. Moderate spam risk from prior owner.',
  },
]

// ─── Apply scoring engine to every domain ────────────────────────────────────
export const MOCK_DOMAINS = RAW.map(d => {
  const { score, grade } = scoreDomain({
    name:          d.name,
    pageRank:      null,          // null = no OPR key yet; heuristics only
    firstSeenYear: d.firstSeenYear,
  })

  const currentYear = new Date().getFullYear()

  return {
    ...d,
    score,
    grade,
    age:            d.firstSeenYear ? currentYear - d.firstSeenYear : null,
    extension:      '.' + d.name.split('.').slice(1).join('.'),
    // Estimated resale value based on score. Profit = this minus ~£10 catch fee.
    estimatedValue: Math.round((score ** 2) * 0.9),
  }
}).sort((a, b) => b.score - a.score)  // highest score first

// Lookups used by FilterBar
export const CATEGORIES = [...new Set(MOCK_DOMAINS.map(d => d.category))].sort()
export const EXTENSIONS = [...new Set(MOCK_DOMAINS.map(d => d.extension))].sort()
export const GRADES     = ['A+', 'A', 'B', 'C', 'D']
export const ALL_NICHES = CATEGORIES
