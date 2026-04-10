import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, Bookmark, CreditCard, Settings, LogOut, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Feed',      icon: LayoutDashboard },
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark        },
  { to: '/billing',   label: 'Billing',   icon: CreditCard      },
  { to: '/settings',  label: 'Settings',  icon: Settings        },
]

export default function Navbar() {
  const { user, plan, credits } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  // Plan badge colours
  const planMeta = {
    free:   { label: 'Free',   cls: 'bg-surface border-border text-muted' },
    hunter: { label: 'Hunter', cls: 'bg-lime/10 border-lime/30 text-lime' },
    pro:    { label: 'Pro',    cls: 'bg-lime/20 border-lime/40 text-lime font-bold' },
  }[plan] ?? { label: plan, cls: 'bg-surface border-border text-muted' }

  if (!user) {
    // Public navbar (landing page)
    return (
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-bg/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/auth" className="btn-ghost text-xs py-2">Log in</Link>
            <Link to="/auth?tab=signup" className="btn-lime text-xs py-2">Get started</Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === to
                  ? 'bg-lime/10 text-lime'
                  : 'text-muted hover:text-white hover:bg-surface'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: plan + credits + sign out */}
        <div className="hidden md:flex items-center gap-3">
          <span className={`badge border text-xs ${planMeta.cls}`}>{planMeta.label}</span>
          <span className="text-xs text-muted">
            <span className="text-white font-semibold">{credits}</span> credits
          </span>
          <button onClick={handleSignOut} className="btn-ghost text-xs py-2 gap-1.5">
            <LogOut size={13} /> Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-muted hover:text-white" onClick={() => setOpen(v => !v)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-bg px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === to ? 'bg-lime/10 text-lime' : 'text-muted hover:text-white hover:bg-surface'
              }`}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`badge border text-xs ${planMeta.cls}`}>{planMeta.label}</span>
              <span className="text-xs text-muted">{credits} credits</span>
            </div>
            <button onClick={handleSignOut} className="text-xs text-muted hover:text-white flex items-center gap-1">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

function Logo() {
  return (
    <Link to={useAuth().user ? '/dashboard' : '/'} className="flex items-center gap-1.5 group">
      <Zap size={20} className="text-lime group-hover:text-lime-dim transition-colors" fill="currentColor" />
      <span className="font-bold text-lg text-white tracking-tight">Dropd</span>
    </Link>
  )
}
