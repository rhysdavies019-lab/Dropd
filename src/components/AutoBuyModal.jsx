import { useState } from 'react'
import { X, ExternalLink, Zap, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Catching services — listed in recommended order.
 * Each service has a URL template that pre-fills the domain name.
 * "recommended" = shown first with a star badge.
 */
const CATCHERS = [
  {
    id:    'dropcatch',
    name:  'DropCatch',
    desc:  'Largest backorder network. Best for competitive drops.',
    url:   (domain) => `https://www.dropcatch.com/domain/${encodeURIComponent(domain)}`,
    recommended: true,
    free:  true,
  },
  {
    id:    'namejet',
    name:  'NameJet',
    desc:  'Strong auction network. Good for aged .com domains.',
    url:   (domain) => `https://www.namejet.com/pages/auctions/backorders.aspx?SearchTerm=${encodeURIComponent(domain)}`,
    recommended: false,
    free:  true,
  },
  {
    id:    'godaddy',
    name:  'GoDaddy Auctions',
    desc:  'Largest volume. Good fallback for any extension.',
    url:   (domain) => `https://auctions.godaddy.com/trpItemListing.aspx?miid=&aucType=2&searchfield=${encodeURIComponent(domain)}`,
    recommended: false,
    free:  true,
  },
  {
    id:    'dynadot',
    name:  'Dynadot Backorder',
    desc:  'Lower competition. Good for budget backorders.',
    url:   (domain) => `https://www.dynadot.com/domain/backorder.html?domain=${encodeURIComponent(domain)}`,
    recommended: false,
    free:  true,
  },
  {
    id:    'snapnames',
    name:  'SnapNames',
    desc:  'Network2 partner. Complements DropCatch coverage.',
    url:   (domain) => `https://www.snapnames.com/landing/domainDetail.action?domain=${encodeURIComponent(domain)}`,
    recommended: false,
    free:  true,
  },
]

export default function AutoBuyModal({ domain, onClose }) {
  const [showAll, setShowAll] = useState(false)
  const [launched, setLaunched] = useState([])

  const displayed = showAll ? CATCHERS : CATCHERS.slice(0, 2)

  function handleOpen(catcher) {
    window.open(catcher.url(domain.name), '_blank', 'noopener,noreferrer')
    setLaunched(prev => [...new Set([...prev, catcher.id])])
  }

  function handleOpenAll() {
    CATCHERS.forEach(c => handleOpen(c))
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="p-5 border-b border-border">
            <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-white transition-colors">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-lime" />
              </div>
              <div>
                <h2 className="font-bold text-white">Auto-Buy Backorder</h2>
                <p className="text-xs text-muted font-mono">{domain.name}</p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Place backorders across multiple catching services to maximise your chances.
              Each service competes to catch the domain the moment it drops.
            </p>
          </div>

          {/* Catcher list */}
          <div className="p-4 space-y-2">
            {displayed.map(catcher => (
              <div
                key={catcher.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  launched.includes(catcher.id)
                    ? 'border-lime/30 bg-lime/5'
                    : 'border-border bg-surface hover:border-subtle'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{catcher.name}</span>
                    {catcher.recommended && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-lime bg-lime/10 border border-lime/20 px-1.5 py-0.5 rounded-full">
                        <Star size={9} fill="currentColor" /> Recommended
                      </span>
                    )}
                    {launched.includes(catcher.id) && (
                      <span className="text-[10px] text-lime font-medium">Opened ✓</span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{catcher.desc}</p>
                </div>
                <button
                  onClick={() => handleOpen(catcher)}
                  className={`shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    launched.includes(catcher.id)
                      ? 'border-lime/30 text-lime hover:bg-lime/10'
                      : 'border-border text-white hover:border-subtle hover:bg-card'
                  }`}
                >
                  {launched.includes(catcher.id) ? 'Re-open' : 'Backorder'}
                  <ExternalLink size={11} />
                </button>
              </div>
            ))}

            {/* Show more toggle */}
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full text-xs text-muted hover:text-white transition-colors flex items-center justify-center gap-1 py-1"
            >
              {showAll ? <><ChevronUp size={12}/> Show fewer</> : <><ChevronDown size={12}/> Show {CATCHERS.length - 2} more services</>}
            </button>
          </div>

          {/* Footer actions */}
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">
              Done
            </button>
            <button
              onClick={handleOpenAll}
              className="btn-lime flex-1 justify-center text-sm gap-1.5"
            >
              <Zap size={13} /> Open all {CATCHERS.length} services
            </button>
          </div>

          {/* Tip */}
          <div className="px-4 pb-4">
            <p className="text-[11px] text-muted text-center leading-relaxed">
              💡 Placing backorders on multiple services doesn't cost more — each charges only if they successfully catch the domain.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
