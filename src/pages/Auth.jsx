import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { signInWithEmail, signUpWithEmail, resetPassword } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [tab,     setTab]     = useState(params.get('tab') === 'signup' ? 'signup' : 'login')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [forgot,  setForgot]  = useState(false)

  // Redirect already-logged-in users
  useEffect(() => { if (user) navigate('/dashboard', { replace: true }) }, [user])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fn = tab === 'login' ? signInWithEmail : signUpWithEmail
    const { error: err } = await fn(email, pass)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else if (tab === 'signup') {
      setError('')
      setLoading(false)
      // Supabase sends a confirmation email — inform the user
      setError('✅ Check your email to confirm your account, then log in.')
    } else {
      navigate('/dashboard')
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError(err.message)
    else setError('✅ Check your email for a password reset link.')
  }

  const isSuccess = error.startsWith('✅')

  return (
    <div className="min-h-screen bg-bg hero-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-1.5 mb-8">
          <Zap size={22} className="text-lime" fill="currentColor" />
          <span className="font-black text-xl tracking-tight">Dropd</span>
        </Link>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Tab switcher */}
          <div className="flex rounded-lg bg-surface border border-border p-1 mb-6">
            {['login', 'signup'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === t ? 'bg-card text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Forgot password form */}
          {forgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="label">Your email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="input pl-9" />
                </div>
              </div>
              {error && <p className={`text-xs p-3 rounded-lg border ${isSuccess ? 'border-lime/30 bg-lime/10 text-lime' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>{error}</p>}
              <button type="submit" disabled={loading} className="btn-lime w-full justify-center">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => { setForgot(false); setError('') }} className="w-full text-xs text-muted hover:text-white transition-colors text-center">← Back to login</button>
            </form>
          ) : null}

          {/* Email / password form */}
          {!forgot && <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  required
                  minLength={8}
                  className="input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error / success message */}
            {error && (
              <div className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                isSuccess ? 'border-lime/30 bg-lime/10 text-lime' : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {!isSuccess && <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                <p>{error}</p>
              </div>
            )}

            {tab === 'login' && (
              <button type="button" onClick={() => { setForgot(true); setError('') }} className="w-full text-xs text-muted hover:text-white transition-colors text-center -mt-2">
                Forgot password?
              </button>
            )}

            <button type="submit" disabled={loading} className="btn-lime w-full justify-center">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                tab === 'login' ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>}
        </motion.div>

        <p className="text-center text-xs text-muted mt-6">
          {tab === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-lime hover:text-lime-dim transition-colors">
            {tab === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
