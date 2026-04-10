import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../lib/supabase'
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

  async function handleGoogle() {
    setLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) { setError(err.message); setLoading(false) }
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

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="btn-ghost w-full justify-center mb-4 text-sm"
          >
            {/* Google G SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
          </form>
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
