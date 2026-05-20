import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, STATUS_LABELS, GRADE_COLORS, formatAmount, formatDate } from '../supabase'
import Layout from '../components/Layout'
import { Search, Download } from 'lucide-react'

export default function Portfolio({ lang, onToggleLang, user }) {
  const [applications, setApplications] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', product: '', grade: '', branch: '', from: '', to: '' })
  const navigate = useNavigate()

  const t = {
    title: lang === 'ar' ? 'المحفظة الائتمانية' : 'Credit Portfolio',
    status: lang === 'ar' ? 'الحالة' : 'Status',
    product: lang === 'ar' ? 'نوع التمويل' : 'Product',
    grade: lang === 'ar' ? 'درجة المخاطر' : 'Risk Grade',
    branch: lang === 'ar' ? 'الفرع' : 'Branch',
    from: lang === 'ar' ? 'من تاريخ' : 'From',
    to: lang === 'ar' ? 'إلى تاريخ' : 'To',
    search: lang === 'ar' ? 'بحث' : 'Search',
    export: lang === 'ar' ? 'تصدير CSV' : 'Export CSV',
    all: lang === 'ar' ? 'الكل' : 'All',
    total: lang === 'ar' ? 'إجمالي' : 'Total',
    amount: lang === 'ar' ? 'القيمة الإجمالية' : 'Total Value',
    noData: lang === 'ar' ? 'لا توجد نتائج' : 'No results',
    clientName: lang === 'ar' ? 'اسم العميل' : 'Client',
    ref: lang === 'ar' ? 'رقم الملف' : 'Reference',
  }

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      setApplications(data)
      setFiltered(data)
    }
    setLoading(false)
  }

  const applyFilters = () => {
    let result = [...applications]
    if (filters.status) result = result.filter(a => a.status === filters.status)
    if (filters.product) result = result.filter(a => a.product_type === filters.product)
    if (filters.grade) result = result.filter(a => a.risk_grade === filters.grade)
    if (filters.branch) result = result.filter(a => a.branch?.toLowerCase().includes(filters.branch.toLowerCase()))
    if (filters.from) result = result.filter(a => new Date(a.created_at) >= new Date(filters.from))
    if (filters.to) result = result.filter(a => new Date(a.created_at) <= new Date(filters.to))
    setFiltered(result)
  }

  const handleExport = () => {
    const headers = ['رقم الملف', 'اسم العميل', 'نوع التمويل', 'المبلغ', 'درجة المخاطر', 'الحالة', 'التاريخ']
    const rows = filtered.map(a => [
      a.reference_code, a.client_name_ar, a.product_type,
      a.requested_amount, a.risk_grade || '', a.status,
      new Date(a.created_at).toLocaleDateString('ar-EG')
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CreditIQ_Portfolio_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const totalValue = filtered.reduce((sum, a) => sum + (Number(a.requested_amount) || 0), 0)

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  return (
    <Layout title={t.title} lang={lang} onToggleLang={onToggleLang} user={user}>
      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-6 gap-3 mb-3">
          <div>
            <label className="label text-xs">{t.status}</label>
            <select className="input-field text-sm" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">{t.all}</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{lang === 'ar' ? v.ar : v.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">{t.product}</label>
            <select className="input-field text-sm" value={filters.product} onChange={e => setFilter('product', e.target.value)}>
              <option value="">{t.all}</option>
              {['تمويل صغير', 'تمويل سمارت', 'تمويل متوسط'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">{t.grade}</label>
            <select className="input-field text-sm" value={filters.grade} onChange={e => setFilter('grade', e.target.value)}>
              <option value="">{t.all}</option>
              {['A','B','C','D','E','F'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">{t.branch}</label>
            <input className="input-field text-sm" value={filters.branch} onChange={e => setFilter('branch', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">{t.from}</label>
            <input type="date" className="input-field text-sm" value={filters.from} onChange={e => setFilter('from', e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="label text-xs">{t.to}</label>
            <input type="date" className="input-field text-sm" value={filters.to} onChange={e => setFilter('to', e.target.value)} dir="ltr" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={applyFilters} className="btn-primary flex items-center gap-2">
            <Search size={14} />
            {t.search}
          </button>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{t.total}: <strong className="text-navy-800">{filtered.length}</strong></span>
            <span>{t.amount}: <strong className="text-navy-800">{totalValue.toLocaleString('ar-EG')} جنيه</strong></span>
            <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-xs py-2">
              <Download size={14} />
              {t.export}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-right">{t.clientName}</th>
              <th className="px-4 py-3 text-right">{t.ref}</th>
              <th className="px-4 py-3 text-right">{lang === 'ar' ? 'نوع التمويل' : 'Product'}</th>
              <th className="px-4 py-3 text-right">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className="px-4 py-3 text-center">{lang === 'ar' ? 'درجة المخاطر' : 'Grade'}</th>
              <th className="px-4 py-3 text-right">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              <th className="px-4 py-3 text-right">{lang === 'ar' ? 'الفرع' : 'Branch'}</th>
              <th className="px-4 py-3 text-right">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-300">{t.noData}</td></tr>
            ) : (
              filtered.map(app => {
                const si = STATUS_LABELS[app.status] || { ar: app.status, en: app.status, color: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={app.id} className="table-row" onClick={() => navigate(`/application/${app.id}`)}>
                    <td className="px-4 py-3 font-semibold text-navy-800">{app.client_name_ar}</td>
                    <td className="px-4 py-3 font-mono text-xs text-navy-500">{app.reference_code}</td>
                    <td className="px-4 py-3 text-gray-600">{app.product_type}</td>
                    <td className="px-4 py-3 font-medium text-navy-700">{formatAmount(app.requested_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {app.risk_grade
                        ? <span className={`badge ${GRADE_COLORS[app.risk_grade]}`}>{app.risk_grade}</span>
                        : <span className="text-gray-200">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${si.color}`}>{lang === 'ar' ? si.ar : si.en}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{app.branch}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(app.created_at)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
