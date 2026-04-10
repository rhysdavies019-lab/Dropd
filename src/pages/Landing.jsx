import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Search, Brain, Trophy, Check, ArrowRight, Star, Clock, Shield, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import GradeBadge from '../components/GradeBadge'

// ─── Static example cards shown on the landing page (always blurred) ────────
const EXAMPLE_CARDS = [
  { grade: 'A+', score: 96, nameBlurred: 'cry***lt.io',  value: '£8,500', backlinks: '3,840', category: 'Crypto'  },
  { grade: 'A',  score: 88, nameBlurred: 'air***t.co',   value: '£4,100', backlinks: '1,540', category: 'AI'      },
  { grade: 'A+', score: 91, nameBlurred: 'spa***e.co',   value: '£5,100', backlinks: '1,890', category: 'Tech'    },
  { grade: 'B',  score: 74, nameBlurred: 'leg***s.co',   value: '£1,900', backlinks: '430',   category: 'Legal'   },
  { grade: 'A',  score: 84, nameBlurred: 'nan***h.io',   value: '£3,600', backlinks: '870',   category: 'Health'  },
  { grade: 'B',  score: 72, nameBlurred: 'edg***e.dev',  value: '£1,400', backlinks: '320',   category: 'Tech'    },
]

const PRICING = [
  {
    name: 'Free',
    price: '£0',
    period: '',
    description: 'For casual domain shoppers.',
    highlight: false,
    features: [
      '2 unlocks per month',
      'C and D grade domains',
      '6-hour delay from Pro',
      'Email alerts',
      'Basic dashboard',
    ],
    cta: 'Start for free',
    ctaTo: '/auth?tab=signup',
  },
  {
    name: 'Hunter',
    price: '£12',
    period: '/mo',
    description: 'For active domain investors.',
    highlight: false,
    features: [
      '50 unlocks per month',
      'A, B, C, D grade domains',
      '2-hour delay from Pro',
      'Email + SMS alerts',
      '1 niche filter',
      'Auto-Buy shortcuts',
    ],
    cta: 'Start hunting',
    ctaTo: '/auth?tab=signup&plan=hunter',
  },
  {
    name: 'Pro',
    price: '£29',
    period: '/mo',
    description: 'For serious domain professionals.',
    highlight: true,
    features: [
      'Unlimited unlocks',
      'All grades — A+ first',
      'Instant access (no delay)',
      'All alert types',
      'Niche lock (max 20 users)',
      'Auto-Buy feature',
      'Priority support',
    ],
    cta: 'Go Pro',
    ctaTo: '/auth?tab=signup&plan=pro',
  },
]

const HOW_IT_WORKS = [
  {
    icon: <Search size={22} className="text-lime" />,
    title: 'We scan daily',
    body: 'Dropd monitors expiring domain registries every day, pulling thousands of dropping domains before they go public.',
  },
  {
    icon: <Brain size={22} className="text-lime" />,
    title: 'AI scores each one',
    body: 'Our scoring engine analyses backlinks, domain age, keyword value, and niche demand — then grades A+ through D.',
  },
  {
    icon: <Trophy size={22} className="text-lime" />,
    title: 'You act first',
    body: "Pro users see every domain the moment it's scored. Beat the market, unlock names you want, and backorder via DropCatch.",
  },
]

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function Landing() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)

  function handleWaitlist(e) {
    e.preventDefault()
    // TODO: connect to Supabase or a mailing service
    setJoined(true)
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/40 bg-bg/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap size={20} className="text-lime" fill="currentColor" />
            <span className="font-bold text-lg tracking-tight">Dropd</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="btn-ghost text-xs py-2">Log in</Link>
            <Link to="/auth?tab=signup" className="btn-lime text-xs py-2">Get started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative hero-gradient grid-bg pt-32 pb-24 px-4 overflow-hidden">
        {/* Decorative radial blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-lime/5 blur-[120px] pointer-events-none" />

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          animate="show"
        >
          {/* Eyebrow */}
          <motion.div variants={fade} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime/20 bg-lime/5 text-lime text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse-slow" />
            Live domain feed — updated daily
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fade} className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-tight mb-6">
            Find valuable expiring
            <br />
            <span className="text-lime text-glow-lime">domains before</span>
            <br />
            anyone else.
          </motion.h1>

          {/* Sub */}
          <motion.p variants={fade} className="text-lg text-muted max-w-xl mx-auto mb-8 leading-relaxed">
            Dropd scores, grades, and explains every expiring domain — so you can act
            fast, with confidence, before the market catches up.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fade} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth?tab=signup" className="btn-lime px-6 py-3 text-sm">
              Start for free <ArrowRight size={15} />
            </Link>
            <Link to="/auth" className="btn-ghost px-6 py-3 text-sm">
              Sign in
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div variants={fade} className="mt-8 flex items-center justify-center gap-4 text-xs text-muted">
            <div className="flex -space-x-2">
              {['#c8f135','#a0c020','#90b018'].map((c,i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-bg" style={{ background: c }} />
              ))}
            </div>
            <span>Joined by 340+ domain investors</span>
            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={11} className="text-lime fill-lime" />)}</div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Example domain cards ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-lime uppercase tracking-widest font-medium mb-3">Live feed preview</p>
            <h2 className="text-3xl font-bold">Today's top drops</h2>
            <p className="text-muted mt-2 text-sm">Names blurred — unlock yours after signing up.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXAMPLE_CARDS.map((card, i) => (
              <motion.div
                key={i}
                className="card hover:border-subtle"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono font-semibold text-base domain-blurred">{card.nameBlurred}</p>
                    <span className="text-xs text-muted">{card.category}</span>
                  </div>
                  <GradeBadge grade={card.grade} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-surface rounded-lg p-2">
                    <p className="text-muted mb-0.5">Est. profit</p>
                    <p className="text-lime font-semibold">{card.value}</p>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <p className="text-muted mb-0.5">Links</p>
                    <p className="font-semibold">{card.backlinks}</p>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <p className="text-muted mb-0.5">Score</p>
                    <p className="font-semibold">{card.score}/100</p>
                  </div>
                </div>
                <Link to="/auth?tab=signup" className="mt-3 btn-ghost w-full justify-center text-xs gap-1.5">
                  <Lock size={12} /> Unlock domain
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-lime uppercase tracking-widest font-medium mb-3">How it works</p>
            <h2 className="text-3xl font-bold">Three steps to your next domain</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                className="card hover:border-subtle"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <div className="text-xs text-muted font-medium mb-1.5 uppercase tracking-wider">Step {i + 1}</div>
                <h3 className="font-bold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Speed tiers ── */}
      <section className="py-16 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-border bg-surface text-xs text-muted">
            <Clock size={12} /> Speed matters in domain investing
          </div>
          <h2 className="text-2xl font-bold mb-4">See it first. Win it first.</h2>
          <p className="text-muted text-sm mb-10">Your plan determines when you see a freshly scored domain.</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { plan: 'Pro',    delay: 'Instant',   cls: 'border-lime/40 bg-lime/5 text-lime' },
              { plan: 'Hunter', delay: '+2 hours',  cls: 'border-border bg-surface text-white' },
              { plan: 'Free',   delay: '+6 hours',  cls: 'border-border bg-surface text-muted' },
            ].map(t => (
              <div key={t.plan} className={`card border ${t.cls} text-center`}>
                <p className="font-bold mb-1">{t.plan}</p>
                <p className="text-xs opacity-70">{t.delay}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-4 border-t border-border" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-lime uppercase tracking-widest font-medium mb-3">Pricing</p>
            <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted mt-2 text-sm">Cancel anytime. No lock-in.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((tier, i) => (
              <motion.div
                key={tier.name}
                className={`card relative ${tier.highlight ? 'border-lime/50 glow-lime' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-lime text-bg text-xs font-bold px-3 py-1 rounded-full">Most popular</span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-bold text-lg mb-1">{tier.name}</h3>
                  <div className="flex items-end gap-0.5 mb-1">
                    <span className="text-3xl font-black">{tier.price}</span>
                    <span className="text-muted text-sm mb-1">{tier.period}</span>
                  </div>
                  <p className="text-xs text-muted">{tier.description}</p>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="text-lime shrink-0 mt-0.5" />
                      <span className="text-muted">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.ctaTo}
                  className={tier.highlight ? 'btn-lime w-full justify-center' : 'btn-ghost w-full justify-center'}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist / email capture ── */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-lg mx-auto text-center">
          <Shield size={28} className="text-lime mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Join the waitlist</h2>
          <p className="text-muted text-sm mb-6">Get early access and a free credit pack when we launch niche locks.</p>

          {joined ? (
            <div className="flex items-center justify-center gap-2 text-lime font-medium">
              <Check size={18} /> You're on the list — we'll be in touch!
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input flex-1"
              />
              <button type="submit" className="btn-lime shrink-0">
                Join <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-lime" fill="currentColor" />
            <span className="font-bold text-white">Dropd</span>
            <span>— Find valuable expiring domains first.</span>
          </div>
          <div className="flex gap-6">
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link to="/auth" className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/auth?tab=signup" className="hover:text-white transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

