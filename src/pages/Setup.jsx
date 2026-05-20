import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../components/Toast'

export default function Setup({ lang }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', 'error')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }
    // Insert into users table
    if (data.user) {
      await supabase.from('users').insert({
        auth_id: data.user.id,
        full_name: form.fullName,
        email: form.email,
        role: 'admin',
        is_active: true,
      })
    }
    toast(lang === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully', 'success')
    navigate('/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold-500 flex items-center justify-center text-2xl mx-auto mb-4">
            🌍
          </div>
          <h1 className="text-2xl font-bold text-white">CreditIQ</h1>
          <p className="text-navy-400 text-sm mt-1">
            {lang === 'ar' ? 'إعداد حساب المدير الأول' : 'First Admin Setup'}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
              <input className="input-field" required value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <input type="email" className="input-field" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
              <input type="password" className="input-field" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
              <input type="password" className="input-field" required value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-3">
              {loading
                ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                : (lang === 'ar' ? 'إنشاء الحساب' : 'Create Account')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
