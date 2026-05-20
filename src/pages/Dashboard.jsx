import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, STATUS_LABELS, GRADE_COLORS, formatAmount, formatDate } from '../supabase'
import Layout from '../components/Layout'
import { Plus, TrendingUp, Clock, CheckCircle, XCircle, Layers } from 'lucide-react'

export default function Dashboard({ lang, onToggleLang, user }) {
  const [stats, setStats] = useState({ total: 0, under_review: 0, pending: 0, approved: 0, rejected: 0 })
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const t = {
    title: lang === 'ar' ? 'لوحة التحكم' : 'Dashboard',
    total: lang === 'ar' ? 'إجمالي الطلبات' : 'Total Applications',
    review: lang === 'ar' ? 'قيد الدراسة' : 'Under Review',
    pending: lang === 'ar' ? 'بانتظار الاعتماد' : 'Pending Approval',
    approved: lang === 'ar' ? 'معتمدة' : 'Approved',
    rejected: lang === 'ar' ? 'مرفوضة' : 'Rejected',
    recent: lang === 'ar' ? 'أحدث الطلبات' : 'Recent Applications',
    newApp: lang === 'ar' ? 'طلب جديد' : 'New Application',
    clientName: lang === 'ar' ? 'اسم العميل' : 'Client Name',
    refCode: lang === 'ar' ? 'رقم الملف' : 'Reference',
    product: lang === 'ar' ? 'نوع التمويل' : 'Product',
    amount: lang === 'ar' ? 'المبلغ' : 'Amount',
    grade: lang === 'ar' ? 'درجة المخاطر' : 'Risk Grade',
    status: lang === 'ar' ? 'الحالة' : 'Status',
    date: lang === 'ar' ? 'التاريخ' : 'Date',
    noData: lang === 'ar' ? 'لا توجد طلبات حتى الآن' : 'No applications yet',
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    const [{ count: total }, { data: apps }] = await Promise.all([
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*').order('created_at', { ascending: false }).limit(20)
    ])

    const counts = { total: total || 0, under_review: 0, pending: 0, approved: 0, rejected: 0 }
    if (apps) {
      apps.forEach(a => {
        if (a.status === 'draft' || a.status === 'under_review') counts.under_review++
        if (a.status === 'pending_approval') counts.pending++
        if (a.status === 'approved') counts.approved++
        if (a.status === 'rejected') counts.rejected++
      })
      setApplications(apps)
    }
    setStats(counts)
    setLoading(false)
  }

  const statCards = [
    { label: t.total, value: stats.total, icon: Layers, color: 'bg-navy-800 text-white' },
    { label: t.review, value: stats.under_review, icon: Clock, color: 'bg-blue-600 text-white' },
    { label: t.pending, value: stats.pending, icon: TrendingUp, color: 'bg-amber-500 text-white' },
    { label: t.approved, value: stats.approved, icon: CheckCircle, color: 'bg-emerald-600 text-white' },
    { label: t.rejected, value: stats.rejected, icon: XCircle, color: 'bg-red-600 text-white' },
  ]

  return (
    <Layout title={t.title} lang={lang} onToggleLang={onToggleLang} user={user}>
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className={`rounded-xl p-5 ${s.color} shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">{loading ? '—' : s.value}</div>
            <div className="text-sm opacity-80 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="section-title">{t.recent}</h2>
          <button onClick={() => navigate('/new-application')} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            {t.newApp}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-right font-semibold">{t.clientName}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.refCode}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.product}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.amount}</th>
                <th className="px-4 py-3 text-center font-semibold">{t.grade}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.status}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                  {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t.noData}</td></tr>
              ) : (
                applications.map(app => {
                  const statusInfo = STATUS_LABELS[app.status] || { ar: app.status, en: app.status, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={app.id} className="table-row" onClick={() => navigate(`/application/${app.id}`)}>
                      <td className="px-4 py-3 font-semibold text-navy-800">{app.client_name_ar}</td>
                      <td className="px-4 py-3 text-navy-600 font-mono text-xs">{app.reference_code}</td>
                      <td className="px-4 py-3 text-gray-600">{app.product_type}</td>
                      <td className="px-4 py-3 text-navy-700 font-medium">{formatAmount(app.requested_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        {app.risk_grade ? (
                          <span className={`badge ${GRADE_COLORS[app.risk_grade] || 'bg-gray-100 text-gray-700'}`}>
                            {app.risk_grade}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusInfo.color}`}>
                          {lang === 'ar' ? statusInfo.ar : statusInfo.en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(app.created_at)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
