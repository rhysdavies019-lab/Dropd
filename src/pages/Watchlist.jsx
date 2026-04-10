import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Bell, Mail, MessageSquare, Lock } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { getWatchlist, addWatchlistKeyword, removeWatchlistKeyword, updateWatchlistAlert } from '../lib/supabase'
import { ALL_NICHES } from '../data/mockDomains'

// Niche lock: up to 20 Pro users can exclusively lock a niche
// When locked, they get priority alerts for that niche
const NICHE_LOCK_LIMIT = 20

export default function Watchlist() {
  const { user, plan, isPro } = useAuth()
  const [keywords,   setKeywords]   = useState([])
  const [inputVal,   setInputVal]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const [nicheLock,  setNicheLock]  = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (!user) return
    getWatchlist(user.id).then(({ data }) => {
      setKeywords(data ?? [])
      setLoading(false)
    })
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    const kw = inputVal.trim().toLowerCase()
    if (!kw || keywords.some(k => k.keyword === kw)) return

    // Optimistic UI update
    const temp = { id: 'temp-' + Date.now(), keyword: kw, alert_email: true, alert_sms: false, alert_app: true }
    setKeywords(prev => [...prev, temp])
    setInputVal('')

    const { data, error } = await addWatchlistKeyword(user.id, kw)
    if (error) {
      setKeywords(prev => prev.filter(k => k.id !== temp.id))
    } else if (data?.[0]) {
      setKeywords(prev => prev.map(k => k.id === temp.id ? data[0] : k))
    }
  }

  async function handleRemove(id) {
    setKeywords(prev => prev.filter(k => k.id !== id))
    await removeWatchlistKeyword(id)
  }

  async function handleToggle(id, field, current) {
    // Optimistic
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, [field]: !current } : k))
    await updateWatchlistAlert(id, field, !current)
  }

  async function saveNicheLock() {
    setSaving(true)
    // TODO: call Worker API to reserve niche lock in DB
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        <div className="py-6 border-b border-border mb-8">
          <h1 className="text-xl font-bold">Watchlist & Alerts</h1>
          <p className="text-sm text-muted mt-0.5">Get notified when domains matching your keywords drop.</p>
        </div>

        {/* ── Keyword input ── */}
        <section className="card mb-6">
          <h2 className="font-semibold mb-4">Track keywords</h2>
          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder='e.g. "finance", "AI", "gym"'
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="input flex-1"
            />
            <button type="submit" className="btn-lime shrink-0">
              <Plus size={15} /> Add
            </button>
          </form>

          {/* Keyword list */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-14 w-full" />)}
            </div>
          ) : keywords.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No keywords yet — add one above.</p>
          ) : (
            <AnimatePresence initial={false}>
              {keywords.map(kw => (
                <motion.div
                  key={kw.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{   opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    {/* Keyword chip */}
                    <span className="flex-1 font-mono text-sm font-medium text-lime">#{kw.keyword}</span>

                    {/* Alert toggles */}
                    <div className="flex items-center gap-2">
                      <AlertToggle
                        icon={<Mail size={13} />}
                        label="Email"
                        active={kw.alert_email}
                        onToggle={() => handleToggle(kw.id, 'alert_email', kw.alert_email)}
                      />
                      <AlertToggle
                        icon={<MessageSquare size={13} />}
                        label="SMS"
                        active={kw.alert_sms}
                        onToggle={() => handleToggle(kw.id, 'alert_sms', kw.alert_sms)}
                        locked={!isPro}
                        lockedLabel="Pro"
                      />
                      <AlertToggle
                        icon={<Bell size={13} />}
                        label="In-app"
                        active={kw.alert_app}
                        onToggle={() => handleToggle(kw.id, 'alert_app', kw.alert_app)}
                      />
                    </div>

                    <button
                      onClick={() => handleRemove(kw.id)}
                      className="text-muted hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </section>

        {/* ── Niche Lock (Pro only) ── */}
        <section className="card relative overflow-hidden">
          {!isPro && (
            <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 gap-2">
              <Lock size={20} className="text-muted" />
              <p className="text-sm text-muted font-medium">Pro feature</p>
              <p className="text-xs text-muted text-center px-6">Upgrade to Pro to lock a niche and get priority alerts.</p>
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                Niche Lock
                <span className="badge bg-lime/10 border border-lime/20 text-lime text-[10px]">Pro</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                Pick one niche and get priority access to every domain that drops in it.
                Limited to {NICHE_LOCK_LIMIT} Pro users per niche.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={nicheLock}
              onChange={e => setNicheLock(e.target.value)}
              disabled={!isPro}
              className="input flex-1"
            >
              <option value="">Select a niche…</option>
              {ALL_NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button
              onClick={saveNicheLock}
              disabled={!nicheLock || !isPro || saving}
              className="btn-lime shrink-0"
            >
              {saving ? 'Saving…' : 'Lock niche'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

// Toggle pill for alert types
function AlertToggle({ icon, label, active, onToggle, locked, lockedLabel }) {
  return (
    <button
      onClick={locked ? undefined : onToggle}
      title={locked ? `${lockedLabel} feature` : label}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all ${
        locked
          ? 'border-border text-muted cursor-not-allowed opacity-40'
          : active
            ? 'border-lime/40 bg-lime/10 text-lime'
            : 'border-border text-muted hover:border-subtle'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {locked && <Lock size={10} />}
    </button>
  )
}
