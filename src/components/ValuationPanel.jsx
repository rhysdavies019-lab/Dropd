import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, ExternalLink, Loader, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { getValuation } from '../lib/valuation'

/**
 * ValuationPanel — shown inside a domain card after unlocking.
 * Fetches GoDaddy appraisal + NameBio comparable sales on demand.
 */
export default function ValuationPanel({ domain, fallbackValue }) {
  const [state,   setState]   = useState('idle')  // idle | loading | done | error
  const [data,    setData]    = useState(null)
  const [showAll, setShowAll] = useState(false)

  async function fetchValuation() {
    setState('loading')
    try {
      const result = await getValuation(domain.name, fallbackValue)
      setData(result)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {state === 'idle' && (
        <button
          onClick={fetchValuation}
          className="w-full flex items-center justify-center gap-2 text-xs text-lime border border-lime/30 bg-lime/5 hover:bg-lime/10 rounded-lg py-2 transition-colors"
        >
          <TrendingUp size={13} /> Get real valuation + comparable sales
        </button>
      )}

      {state === 'loading' && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted py-2">
          <Loader size={13} className="animate-spin" />
          Fetching GoDaddy appraisal + NameBio sales data…
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-xs text-muted py-1">
          <AlertCircle size={13} /> Valuation unavailable — try again later.
        </div>
      )}

      {state === 'done' && data && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            {/* ── Value summary ── */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                  {data.source}
                </p>
                <p className="text-lg font-black text-lime">
                  {data.appraisalGbp ? `£${data.appraisalGbp.toLocaleString()}` : 'N/A'}
                </p>
                <p className="text-[10px] text-muted">estimated resale</p>
              </div>

              <div className="bg-surface rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Est. profit</p>
                <p className="text-lg font-black text-white">
                  £{data.profitMin.toLocaleString()}
                  <span className="text-sm text-muted font-normal">–£{data.profitMax.toLocaleString()}</span>
                </p>
                <p className="text-[10px] text-muted">after catch fee</p>
              </div>
            </div>

            {/* ── Comparable sales ── */}
            {data.comparables.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-white transition-colors mb-2"
                >
                  {showAll ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {data.comparables.length} comparable sales
                  {data.compAvg ? ` · avg £${data.compAvg.toLocaleString()}` : ''}
                </button>

                <AnimatePresence>
                  {showAll && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1"
                    >
                      {data.comparables.map((sale, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-surface rounded-lg px-3 py-1.5">
                          <span className="font-mono text-white">{sale.domain}</span>
                          <div className="flex items-center gap-3 text-muted">
                            <span>{sale.venue}</span>
                            <span>{sale.date?.slice(0, 7)}</span>
                            <span className="text-lime font-semibold">£{sale.priceSterling.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {data.comparables.length === 0 && (
              <p className="text-[11px] text-muted">
                No comparable sales found on NameBio for this keyword/TLD combination.
                GoDaddy appraisal is based on ML model trained on millions of sales.
              </p>
            )}

            <p className="text-[10px] text-muted leading-relaxed">
              Appraisal from GoDaddy · Comparables from NameBio ·
              Profit range assumes £10–£50 catch fee depending on competition.
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
