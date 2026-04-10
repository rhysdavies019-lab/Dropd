import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Landing  from './pages/Landing'
import Auth     from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Watchlist from './pages/Watchlist'
import Billing   from './pages/Billing'
import Settings  from './pages/Settings'

// Wrapper that redirects unauthenticated users to /auth
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
  </div>
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"     element={<Landing />} />
      <Route path="/auth" element={<Auth />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
      <Route path="/billing"   element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
