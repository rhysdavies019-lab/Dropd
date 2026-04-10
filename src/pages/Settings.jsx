import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Trash2, AlertTriangle } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [email,        setEmail]        = useState(user?.email ?? '')
  const [newPass,      setNewPass]      = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [emailMsg,     setEmailMsg]     = useState('')
  const [passMsg,      setPassMsg]      = useState('')
  const [delConfirm,   setDelConfirm]   = useState(false)
  const [saving,       setSaving]       = useState(false)

  async function updateEmail(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email })
    setEmailMsg(error ? `Error: ${error.message}` : '✅ Confirmation sent to new email.')
    setSaving(false)
  }

  async function updatePassword(e) {
    e.preventDefault()
    if (newPass !== confirmPass) return setPassMsg('Passwords do not match.')
    if (newPass.length < 8)      return setPassMsg('Password must be at least 8 characters.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassMsg(error ? `Error: ${error.message}` : '✅ Password updated.')
    setNewPass('')
    setConfirmPass('')
    setSaving(false)
  }

  async function deleteAccount() {
    // Calls the Worker API which uses the service role key to delete the user
    const res = await fetch('/api/users/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    })
    if (res.ok) {
      await supabase.auth.signOut()
      navigate('/')
    } else {
      alert('Failed to delete account. Please contact support.')
    }
  }

  const inputClass = 'input'
  const msgClass = (msg) => msg.startsWith('✅')
    ? 'text-xs text-lime mt-2'
    : 'text-xs text-red-400 mt-2'

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 pt-20 pb-16">
        <div className="py-6 border-b border-border mb-8">
          <h1 className="text-xl font-bold">Account Settings</h1>
          <p className="text-sm text-muted mt-0.5">{user?.email}</p>
        </div>

        {/* ── Update email ── */}
        <motion.section
          className="card mb-5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Mail size={15} className="text-lime" /> Update email
          </h2>
          <form onSubmit={updateEmail} className="space-y-3">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={saving || email === user?.email} className="btn-lime text-sm">
              {saving ? 'Saving…' : 'Update email'}
            </button>
            {emailMsg && <p className={msgClass(emailMsg)}>{emailMsg}</p>}
          </form>
        </motion.section>

        {/* ── Update password ── */}
        <motion.section
          className="card mb-5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Lock size={15} className="text-lime" /> Change password
          </h2>
          <form onSubmit={updatePassword} className="space-y-3">
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={saving} className="btn-lime text-sm">
              {saving ? 'Saving…' : 'Update password'}
            </button>
            {passMsg && <p className={msgClass(passMsg)}>{passMsg}</p>}
          </form>
        </motion.section>

        {/* ── Danger zone ── */}
        <motion.section
          className="card border-red-500/20"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <h2 className="font-semibold mb-1 flex items-center gap-2 text-red-400">
            <AlertTriangle size={15} /> Danger zone
          </h2>
          <p className="text-xs text-muted mb-4">
            Permanently deletes your account, all unlocks, and watchlist data. This cannot be undone.
          </p>

          {!delConfirm ? (
            <button
              onClick={() => setDelConfirm(true)}
              className="btn-ghost text-red-400 border-red-500/30 hover:border-red-500/60 text-sm gap-1.5"
            >
              <Trash2 size={14} /> Delete my account
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-400 font-medium">Are you absolutely sure? This is irreversible.</p>
              <div className="flex gap-2">
                <button onClick={() => setDelConfirm(false)} className="btn-ghost text-sm">Cancel</button>
                <button onClick={deleteAccount} className="btn-ghost border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm">
                  Yes, delete everything
                </button>
              </div>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  )
}
