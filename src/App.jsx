import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import NewApplication from './pages/NewApplication'
import ApplicationDetail from './pages/ApplicationDetail'
import Portfolio from './pages/Portfolio'
import Settings from './pages/Settings'

function ProtectedRoute({ children, user }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('ar')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  const toggleLang = () => setLang(l => l === 'ar' ? 'en' : 'ar')

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🌍</div>
          <div className="text-white font-bold text-xl">CreditIQ</div>
          <div className="mt-4 w-8 h-8 border-2 border-navy-400 border-t-gold-400 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  const sharedProps = { lang, onToggleLang: toggleLang, user }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login {...sharedProps} />} />
          <Route path="/setup" element={<Setup {...sharedProps} />} />
          <Route path="/dashboard" element={
            <ProtectedRoute user={user}>
              <Dashboard {...sharedProps} />
            </ProtectedRoute>
          } />
          <Route path="/new-application" element={
            <ProtectedRoute user={user}>
              <NewApplication {...sharedProps} />
            </ProtectedRoute>
          } />
          <Route path="/application/:id" element={
            <ProtectedRoute user={user}>
              <ApplicationDetail {...sharedProps} />
            </ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <ProtectedRoute user={user}>
              <Portfolio {...sharedProps} />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute user={user}>
              <Settings {...sharedProps} />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
