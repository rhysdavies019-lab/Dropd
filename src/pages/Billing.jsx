import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Zap, Check, Package, ArrowUpRight, AlertCircle } from 'lucide-react'
import { useSearchParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '')
const STRIPE_READY  = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

// ─── Credit packs ──────────────────────────────────────────────────────────
const CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, price: '£9',  label: null,        priceId: 'price_10_credits'  },
  { id: 'pack_25', credits: 25, price: '£20', label: 'Best value', priceId: 'price_25_credits' },
  { id: 'pack_50', credits: 50, price: '£35', label: null,        priceId: 'price_50_credits'  },
]

// ─── Subscription plans ─────────────────────────────────────────────────────
const PLANS = [
  {
    id:      'free',
    name:    'Free',
    price:   '£0',
    period:  '',
    features: ['2 unlocks / month', 'C + D grade domains only', '+6h delay from Pro', 'Email alerts'],
    priceId: null,
  },
  {
    id:      'hunter',
    name:    'Hunter',
    price:   '£12',
    period:  '/mo',
    features: ['50 unlocks / month', 'A, B, C, D grades', '+2h delay from Pro', 'Email + SMS alerts', '1 niche filter'],
    priceId: 'price_hunter_monthly',
    highlight: false,
  },
  {
    id:      'pro',
    name:    'Pro',
    price:   '£29',
    period:  '/mo',
    features: ['Unlimited unlocks', 'All grades — A+ instantly', 'No delay — first in line', 'Niche lock (max 20 users)', 'Auto-Buy across 5 services', 'Priority support'],
    priceId: 'price_pro_monthly',
    highlight: true,
  },
]

export default function Billing() {
  const { plan, credits } = useAuth()
  const [params]          = useSearchParams()
  const [loading,  setLoading]  = useState(null) // which priceId is loading
  const [banner,   setBanner]   = useState(null)  // success | cancelled

  // Handle Stripe redirect back
  useEffect(() => {
    if (params.get('success'))   setBanner('success')
    if (params.get('cancelled')) setBanner('cancelled')
  }, [params])

  async function checkout(priceId, mode) {
    if (!STRIPE_READY) return alert('Add VITE_STRIPE_PUBLIC_KEY to .env to enable payments.')
    setLoading(priceId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, mode }),
      })
      const { sessionId, error } = await res.json()
      if (error) throw new Error(error)
      const stripe = await stripePromise
      await stripe.redirectToCheckout({ sessionId })
    } catch (e) {
      alert('Checkout error: ' + e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        <div className="py-6 border-b border-border mb-6">
          <h1 className="text-xl font-bold">Credits & Billing</h1>
          <p className="text-sm text-muted mt-0.5">Manage your plan and unlock balance.</p>
        </div>

        {/* ── Stripe not configured notice ── */}
        {!STRIPE_READY && (
          <div className="flex items-start gap-3 bg-surface border border-border rounded-xl p-4 mb-6 text-sm">
            <AlertCircle size={16} className="text-lime shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-0.5">Stripe not connected yet</p>
              <p className="text-muted text-xs">
                Add <code className="text-white">VITE_STRIPE_PUBLIC_KEY</code> to <code className="text-white">.env</code> and
                set <code className="text-white">STRIPE_SECRET_KEY</code> as a Worker secret. All plan and credit UI is ready to go.
              </p>
            </div>
          </div>
        )}

        {/* ── Success / cancel banner ── */}
        {banner === 'success' && (
          <div className="flex items-center gap-2 bg-lime/10 border border-lime/30 text-lime rounded-xl p-4 mb-6 text-sm font-medium">
            <Check size={16} /> Payment successful — your plan has been updated.
          </div>
        )}
        {banner === 'cancelled' && (
          <div className="flex items-center gap-2 bg-surface border border-border text-muted rounded-xl p-4 mb-6 text-sm">
            <AlertCircle size={15} /> Checkout cancelled — no charge made.
          </div>
        )}

        {/* ── Current plan + credits ── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-lime" />
              <span className="text-xs text-muted uppercase tracking-wider">Plan</span>
            </div>
            <p className="text-2xl font-black capitalize">{plan}</p>
            <p className="text-xs text-muted mt-1">
              {plan === 'free'   && 'Upgrade to unlock faster access + more grades.'}
              {plan === 'hunter' && 'Go Pro for instant access + niche lock.'}
              {plan === 'pro'    && "You're on the best plan."}
            </p>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-lime" />
              <span className="text-xs text-muted uppercase tracking-wider">Credits</span>
            </div>
            <p className="text-2xl font-black">{credits}</p>
            <p className="text-xs text-muted mt-1">1 credit = 1 domain unlock</p>
          </motion.div>
        </div>

        {/* ── Subscription plans ── */}
        <section className="mb-8">
          <h2 className="font-semibold mb-4">Subscription</h2>
          <div className="space-y-3">
            {PLANS.map((p, i) => (
              <motion.div
                key={p.id}
                className={`card flex flex-col sm:flex-row sm:items-center gap-4 ${
                  p.highlight    ? 'border-lime/40' : ''
                } ${p.id === plan ? 'bg-lime/5 border-lime/30' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                {p.highlight && p.id !== plan && (
                  <div className="absolute top-0 right-4 -translate-y-1/2">
                    <span className="bg-lime text-bg text-[10px] font-bold px-2.5 py-0.5 rounded-full">Most popular</span>
                  </div>
                )}

                <div className="flex-1 relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-sm font-semibold text-muted">{p.price}<span className="text-xs">{p.period}</span></span>
                    {p.id === plan && <span className="badge bg-lime/10 border border-lime/30 text-lime text-[10px]">Current plan</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {p.features.map(f => (
                      <span key={f} className="flex items-center gap-1 text-xs text-muted">
                        <Check size={10} className="text-lime shrink-0" /> {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  {p.id === plan ? (
                    <span className="text-xs text-muted">Active</span>
                  ) : p.id === 'free' ? (
                    <button className="btn-ghost text-xs" onClick={() => alert('Contact support to downgrade.')}>
                      Downgrade
                    </button>
                  ) : (
                    <button
                      onClick={() => checkout(p.priceId, 'subscription')}
                      disabled={loading === p.priceId}
                      className="btn-lime text-xs gap-1.5"
                    >
                      {loading === p.priceId ? 'Loading…' : `Switch to ${p.name}`}
                      <ArrowUpRight size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Credit packs ── */}
        <section>
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Package size={15} className="text-lime" /> Buy extra unlocks
          </h2>
          <p className="text-xs text-muted mb-4">One-time purchase. Credits never expire.</p>

          <div className="grid grid-cols-3 gap-3">
            {CREDIT_PACKS.map((pack, i) => (
              <motion.div
                key={pack.id}
                className={`card text-center relative ${pack.label ? 'border-lime/40' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
              >
                {pack.label && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-lime text-bg text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">{pack.label}</span>
                  </div>
                )}
                <p className="text-2xl font-black mb-0.5">{pack.credits}</p>
                <p className="text-xs text-muted mb-3">unlocks</p>
                <p className="text-lg font-bold mb-4">{pack.price}</p>
                <button
                  onClick={() => checkout(pack.priceId, 'payment')}
                  disabled={loading === pack.priceId}
                  className={`${pack.label ? 'btn-lime' : 'btn-ghost'} w-full justify-center text-xs`}
                >
                  {loading === pack.priceId ? 'Loading…' : 'Buy now'}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
