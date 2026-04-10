import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Database, CheckCircle, Radio } from 'lucide-react'
import Navbar     from '../components/Navbar'
import DomainCard from '../components/DomainCard'
import FilterBar  from '../components/FilterBar'
import { MOCK_DOMAINS } from '../data/mockDomains'
import { useAuth } from '../contexts/AuthContext'
import { supabase, unlockDomain, getUnlockedDomains } from '../lib/supabase'
import { enrichDomains } from '../lib/enrichDomain'

const HAS_OPR_KEY  = Boolean(import.meta.env.VITE_OPR_API_KEY)
const HAS_SUPABASE = import.meta.env.VITE_SUPABASE_URL &&
                     !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

export default function Dashboard() {
  const { user, plan } = useAuth()

  const [filters,         setFilters]         = useState({ grade: '', category: '', extension: '', dropDays: '' })
  const [unlockedIds,     setUnlockedIds]      = useState([])
  const [domains,         setDomains]          = useState([])
  const [enriching,       setEnriching]        = useState(false)
  const [enrichProgress,  setEnrichProgress]   = useState(null)
  const [enrichDone,      setEnrichDone]       = useState(false)
  const [newCount,        setNewCount]         = useState(0)   // live "N new domains" banner
  const [lastUpdated,     setLastUpdated]      = useState(new Date())
  const [liveConnected,   setLiveConnected]    = useState(false)
  const channelRef = useRef(null)

  // ── Load domains from Supabase ────────────────────────────────────────────
  useEffect(() => {
    if (!HAS_SUPABASE) { setDomains(MOCK_DOMAINS); return }
    supabase
      .from('domains')
      .select('*')
      .order('score', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDomains(data.map(d => ({
            ...d,
            nameBlurred: d.name_hashed,
            estimatedValue: d.estimated_value,
            createdAt: d.created_at,
            dropDate: d.drop_date,
          })))
        } else {
          setDomains(MOCK_DOMAINS)
        }
      })
  }, [])

  // ── Load unlocked IDs ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    getUnlockedDomains(user.id).then(({ unlockedIds }) => setUnlockedIds(unlockedIds))
  }, [user])

  // ── Supabase Realtime — subscribe to new domains being inserted ───────────
  useEffect(() => {
    if (!HAS_SUPABASE || !user) return

    // Subscribe to INSERT events on the domains table
    const channel = supabase
      .channel('domains-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'domains' },
        (payload) => {
          const newDomain = payload.new
          if (!newDomain) return

          // Apply speed-tier delay client-side
          const ageHours = (Date.now() - new Date(newDomain.created_at).getTime()) / 3600000
          const minAge   = plan === 'pro' ? 0 : plan === 'hunter' ? 2 : 6
          if (ageHours < minAge) return // not visible to this tier yet

          setDomains(prev => {
            // Don't add duplicates
            if (prev.some(d => d.id === newDomain.id)) return prev
            setNewCount(n => n + 1)
            setLastUpdated(new Date())
            return [newDomain, ...prev]
          })
        }
      )
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [user, plan])

  // ── Poll every 5 min as fallback (when Supabase not connected / mock mode) ─
  useEffect(() => {
    if (HAS_SUPABASE) return // realtime handles it
    const id = setInterval(() => setLastUpdated(new Date()), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── Filtered domain list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return domains.filter(d => {
      if (filters.grade     && d.grade     !== filters.grade)     return false
      if (filters.category  && d.category  !== filters.category)  return false
      if (filters.extension && d.extension !== filters.extension) return false
      if (filters.dropDays && d.dropDate) {
        const daysLeft = (new Date(d.dropDate) - Date.now()) / 86400000
        if (daysLeft > parseInt(filters.dropDays)) return false
      }
      return true
    })
  }, [domains, filters])

  // ── Unlock handler ────────────────────────────────────────────────────────
  async function handleUnlock(domainId) {
    if (!user) return
    const { error } = await unlockDomain(user.id, domainId)
    if (!error) setUnlockedIds(prev => [...prev, domainId])
  }

  // ── Enrich with real free API data ────────────────────────────────────────
  async function handleEnrich() {
    setEnriching(true)
    setEnrichDone(false)
    const names    = MOCK_DOMAINS.map(d => d.name)
    const enriched = await enrichDomains(names, (done, total) => setEnrichProgress(`${done} / ${total}`))

    setDomains(prev => prev.map(d => {
      const e = enriched.find(r => r.name === d.name)
      if (!e) return d
      return {
        ...d,
        score:         e.score,
        grade:         e.grade,
        backlinks:     e.backlinks ?? d.backlinks,
        age:           e.age ?? d.age,
        estimatedValue: Math.round((e.score ** 2) * 0.9),
      }
    }).sort((a, b) => b.score - a.score))

    setEnriching(false)
    setEnrichProgress(null)
    setEnrichDone(true)
    setLastUpdated(new Date())
    setTimeout(() => setEnrichDone(false), 4000)
  }

  // ── Dismiss new-domain banner and scroll to top ───────────────────────────
  function dismissNew() {
    setNewCount(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tierInfo = {
    free:   'You see domains 6h after Pro users.',
    hunter: 'You see domains 2h after Pro. Go Pro for instant access.',
    pro:    "You're first — every domain the moment it drops.",
  }[plan]

  // Format last updated time
  const updatedStr = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-20 pb-16">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-6 border-b border-border mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap size={18} className="text-lime" fill="currentColor" />
              Domain Feed
              {/* Live indicator */}
              <span className={`flex items-center gap-1 text-xs font-normal px-2 py-0.5 rounded-full border ${
                liveConnected
                  ? 'border-lime/30 bg-lime/10 text-lime'
                  : 'border-border bg-surface text-muted'
              }`}>
                <Radio size={10} className={liveConnected ? 'animate-pulse' : ''} />
                {liveConnected ? 'Live' : 'Polling'}
              </span>
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {filtered.length} domains · updated {updatedStr} · {tierInfo}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="btn-ghost text-xs py-2 gap-1.5"
              title="Score with Wayback Machine + OpenPageRank"
            >
              <Database size={13} className={enriching ? 'animate-pulse text-lime' : ''} />
              {enriching ? `Scoring ${enrichProgress ?? '…'}` : 'Live score'}
            </button>
          </div>
        </div>

        {/* ── New domains banner ── */}
        <AnimatePresence>
          {newCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={dismissNew}
              className="w-full flex items-center justify-center gap-2 bg-lime/10 border border-lime/30 text-lime text-sm font-medium rounded-xl py-2.5 mb-4 hover:bg-lime/15 transition-colors"
            >
              <Zap size={14} fill="currentColor" />
              {newCount} new domain{newCount > 1 ? 's' : ''} just dropped — click to view
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Enrich success ── */}
        <AnimatePresence>
          {enrichDone && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-lime bg-lime/10 border border-lime/20 rounded-xl px-4 py-2.5 mb-4"
            >
              <CheckCircle size={15} />
              Scores updated with {HAS_OPR_KEY ? 'OpenPageRank + Wayback' : 'Wayback Machine (heuristic fallback)'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── No OPR key notice ── */}
        {!HAS_OPR_KEY && (
          <div className="flex items-start gap-2 text-xs text-muted border border-border rounded-xl px-4 py-3 mb-5 bg-surface">
            <Database size={13} className="shrink-0 mt-0.5 text-lime" />
            <span>
              <strong className="text-white">Free scoring active.</strong> Add a free{' '}
              <a href="https://www.openpagerank.com" target="_blank" rel="noopener noreferrer" className="text-lime underline">OpenPageRank key</a>{' '}
              to <code className="text-white">.env</code> for real backlink data.
            </span>
          </div>
        )}

        {/* ── Filter bar ── */}
        <div className="mb-6">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {/* ── Domain grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">No domains match your filters.</div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map(domain => (
              <DomainCard
                key={domain.id}
                domain={domain}
                unlockedIds={unlockedIds}
                onUnlock={handleUnlock}
              />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}
