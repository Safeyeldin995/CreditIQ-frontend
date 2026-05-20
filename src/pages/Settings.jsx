import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { Plus, X, UserCheck, UserX } from 'lucide-react'

const ROLES = {
  admin: { ar: 'مدير النظام', en: 'Admin' },
  team_head: { ar: 'رئيس فريق', en: 'Team Head' },
  analyst: { ar: 'محلل ائتمان', en: 'Analyst' },
}

export default function Settings({ lang, onToggleLang, user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'analyst', is_active: true })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const t = {
    title: lang === 'ar' ? 'الإعدادات' : 'Settings',
    users: lang === 'ar' ? 'إدارة المستخدمين' : 'User Management',
    addUser: lang === 'ar' ? 'إضافة مستخدم' : 'Add User',
    name: lang === 'ar' ? 'الاسم' : 'Name',
    email: lang === 'ar' ? 'البريد الإلكتروني' : 'Email',
    role: lang === 'ar' ? 'الدور' : 'Role',
    active: lang === 'ar' ? 'نشط' : 'Active',
    created: lang === 'ar' ? 'تاريخ الإنشاء' : 'Created',
  }

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authErr) throw authErr
      await supabase.from('users').insert({
        auth_id: authData.user?.id,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      })
      toast(lang === 'ar' ? 'تم إضافة المستخدم بنجاح' : 'User added successfully', 'success')
      setShowModal(false)
      setForm({ full_name: '', email: '', password: '', role: 'analyst', is_active: true })
      fetchUsers()
    } catch (err) {
      toast(err.message, 'error')
    }
    setSaving(false)
  }

  const toggleActive = async (u) => {
    await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success')
    fetchUsers()
  }

  return (
    <Layout title={t.title} lang={lang} onToggleLang={onToggleLang} user={user}>
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="section-title">{t.users}</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            {t.addUser}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-right">{t.name}</th>
              <th className="px-4 py-3 text-right">{t.email}</th>
              <th className="px-4 py-3 text-right">{t.role}</th>
              <th className="px-4 py-3 text-center">{t.active}</th>
              <th className="px-4 py-3 text-right">{t.created}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">
                {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-semibold text-navy-800">{u.full_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-navy-100 text-navy-700">
                    {lang === 'ar' ? ROLES[u.role]?.ar : ROLES[u.role]?.en || u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(u)}>
                    {u.is_active
                      ? <UserCheck size={18} className="text-emerald-500 mx-auto" />
                      : <UserX size={18} className="text-gray-300 mx-auto" />
                    }
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-navy-800">{t.addUser}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddUser} className="flex flex-col gap-4">
              <div>
                <label className="label">{t.name}</label>
                <input className="input-field" required value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t.email}</label>
                <input type="email" className="input-field" required value={form.email} dir="ltr"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                <input type="password" className="input-field" required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t.role}</label>
                <select className="input-field" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {Object.entries(ROLES).map(([k, v]) => (
                    <option key={k} value={k}>{lang === 'ar' ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? '...' : (lang === 'ar' ? 'إضافة' : 'Add User')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
