import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Clock, Tag, TrendingUp, Lock, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'
import GradeBadge from './GradeBadge'
import AutoBuyModal from './AutoBuyModal'
import ValuationPanel from './ValuationPanel'
import { useAuth } from '../contexts/AuthContext'

// ─── Visibility rules ──────────────────────────────────────────────────────
// Returns true if the domain name should be blurred for the given plan/grade
function shouldBlur(grade, plan) {
  if (plan === 'pro')    return false          // Pro sees everything
  if (plan === 'hunter') return grade === 'A+' // Hunter misses A+ only
  // Free: A+, A, and B are blurred
  return ['A+', 'A', 'B'].includes(grade)
}

// Returns true if the domain is available to the user's speed tier yet
function isAvailable(createdAt, plan) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (plan === 'pro')    return true            // instant
  if (plan === 'hunter') return ageHours >= 2   // 2h delay
  return ageHours >= 6                          // 6h delay (4h after Hunter)
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function DomainCard({ domain, onUnlock, unlockedIds = [] }) {
  const { plan, credits } = useAuth()
  const [showAutoBuy, setShowAutoBuy]   = useState(false)
  const [showReason,  setShowReason]    = useState(false)
  const [unlocking,   setUnlocking]     = useState(false)
  const [revealed,    setRevealed]      = useState(false)

  const isUnlocked   = unlockedIds.includes(domain.id) || revealed
  const blurred      = shouldBlur(domain.grade, plan) && !isUnlocked
  const available    = isAvailable(domain.createdAt, plan)

  async function handleUnlock() {
    if (credits < 1) return alert('You have no credits left. Purchase more in Billing.')
    setUnlocking(true)
    await onUnlock(domain.id)
    // Small delay so the animation feels intentional
    setTimeout(() => { setRevealed(true); setUnlocking(false) }, 400)
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0  }}
        className="card hover:border-subtle relative overflow-hidden"
      >
        {/* Speed-tier lock overlay */}
        {!available && (
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 gap-2">
            <Clock size={20} className="text-muted" />
            <p className="text-xs text-muted text-center px-4">
              {plan === 'free'
                ? 'Upgrade to Hunter or Pro to see this domain sooner'
                : 'Available to Pro users — upgrade for instant access'}
            </p>
          </div>
        )}

        {/* ── Top row: name + grade ── */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <motion.p
              className={`font-mono font-semibold text-lg leading-tight truncate transition-all duration-700 ${blurred ? 'domain-blurred select-none' : 'domain-revealed'}`}
              animate={{ filter: blurred ? 'blur(6px)' : 'blur(0px)' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {blurred ? domain.nameBlurred : domain.name}
            </motion.p>
            <span className="text-xs text-muted font-mono">{domain.extension}</span>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <GradeBadge grade={domain.grade} />
            <span className="text-xs text-muted">Score {domain.score}/100</span>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat icon={<TrendingUp size={12} />} label="Est. profit" value={`£${Math.max(0, domain.estimatedValue - 10).toLocaleString()}`} highlight />
          <Stat icon={<Link2 size={12} />}      label="Backlinks"  value={domain.backlinks.toLocaleString()} />
          <Stat icon={<Clock size={12} />}      label="Age"        value={`${domain.age}y`} />
          <Stat icon={<Tag size={12} />}        label="Niche"      value={domain.category} />
        </div>

        {/* ── Why it scored — expandable ── */}
        {isUnlocked && (
          <AnimatePresence initial={false}>
            <div className="mb-4">
              <button
                onClick={() => setShowReason(v => !v)}
                className="flex items-center gap-1 text-xs text-lime hover:text-lime-dim transition-colors"
              >
                Why this score?
                {showReason ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showReason && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{   opacity: 0, height: 0 }}
                  className="mt-2 text-xs text-muted leading-relaxed border-l-2 border-lime/30 pl-3"
                >
                  {domain.reason}
                </motion.p>
              )}
            </div>
          </AnimatePresence>
        )}

        {/* ── Valuation panel — shown after unlock ── */}
        {isUnlocked && (
          <ValuationPanel domain={domain} fallbackValue={domain.estimatedValue} />
        )}

        {/* ── Actions ── */}
        <div className="flex gap-2">
          {blurred ? (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="btn-lime flex-1 justify-center text-xs"
            >
              <Lock size={12} />
              {unlocking ? 'Unlocking…' : `Unlock (1 credit)`}
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-1.5 text-xs text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              {isUnlocked ? 'Unlocked' : 'Visible on your plan'}
            </div>
          )}

          <button
            onClick={() => setShowAutoBuy(true)}
            className="btn-ghost text-xs gap-1.5"
          >
            <ShoppingCart size={13} />
            Auto-Buy
          </button>
        </div>
      </motion.div>

      {/* Auto-buy modal */}
      {showAutoBuy && (
        <AutoBuyModal domain={domain} onClose={() => setShowAutoBuy(false)} />
      )}
    </>
  )
}

// Small stat cell used inside the card
function Stat({ icon, label, value, highlight }) {
  return (
    <div className="bg-surface rounded-lg px-2.5 py-2">
      <div className="flex items-center gap-1 text-muted mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${highlight ? 'text-lime' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
