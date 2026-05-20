import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../components/Toast'

export default function Login({ lang, onToggleLang }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast(lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password', 'error')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, #c9a227 0, #c9a227 1px, transparent 0, transparent 50%)`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gold-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            🌍
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">المبادرة</h1>
          <p className="text-navy-400 text-sm">El-Mobadara — FRA License 1245</p>
          <div className="mt-2 inline-block bg-navy-800 text-gold-400 text-xs px-3 py-1 rounded-full font-semibold tracking-wide">
            CreditIQ Platform
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy-800 mb-6 text-center">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={lang === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
              />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 text-center py-3">
              {loading
                ? (lang === 'ar' ? 'جاري الدخول...' : 'Signing in...')
                : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')
              }
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/setup')} className="text-xs text-gray-400 hover:text-navy-600">
              {lang === 'ar' ? 'إعداد النظام لأول مرة' : 'First time setup'}
            </button>
          </div>
        </div>

        {/* Language toggle */}
        <div className="text-center mt-4">
          <button onClick={onToggleLang} className="text-navy-400 hover:text-gold-400 text-sm transition-colors">
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </div>
    </div>
  )
}
