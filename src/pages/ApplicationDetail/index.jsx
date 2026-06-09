import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, STATUS_LABELS, GRADE_COLORS, formatAmount, formatDate } from '../../supabase'
import Layout from '../../components/Layout'
import DocumentsTab from './DocumentsTab'
import AnalysisTab from './AnalysisTab'
import MemoTab from './MemoTab'
import AnalystDrawer from './AnalystDrawer'
import CreditMemo from './CreditMemo'
import { ArrowRight } from 'lucide-react'

const TABS = [
  { key: 'assessment', ar: 'التقييم', en: 'Assessment' },
  { key: 'attachments', ar: 'المرفقات', en: 'Attachments' },
  { key: 'ai', ar: 'توصية AI', en: 'AI Recommendation' },
  { key: 'creditMemo', ar: 'مذكرة الائتمان', en: 'Credit Memo' },
  { key: 'finalDecision', ar: 'القرار النهائي', en: 'Final Decision' },
]

export default function ApplicationDetail({ lang, onToggleLang, user }) {
  const { id } = useParams()
  const [application, setApplication] = useState(null)
  const [activeTab, setActiveTab] = useState('assessment')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchApplication()
  }, [id])

  async function fetchApplication() {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setApplication(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <Layout title="..." lang={lang} onToggleLang={onToggleLang} user={user}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!application) {
    return (
      <Layout title="خطأ" lang={lang} onToggleLang={onToggleLang} user={user}>
        <div className="text-center py-20">
          <p className="text-gray-400">{lang === 'ar' ? 'الطلب غير موجود' : 'Application not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
            {lang === 'ar' ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
          </button>
        </div>
      </Layout>
    )
  }

  const statusInfo = STATUS_LABELS[application.status] || { ar: application.status, en: application.status, color: 'bg-gray-100 text-gray-700' }

  return (
    <>
    <Layout
      title={lang === 'ar' ? `ملف العميل — ${application.client_name_ar}` : `Application — ${application.client_name_ar}`}
      lang={lang}
      onToggleLang={onToggleLang}
      user={user}
    >
      {/* Header */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-navy-600 flex items-center gap-1 text-sm"
          >
            <ArrowRight size={14} />
            {lang === 'ar' ? 'العودة' : 'Back'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy-900">{application.client_name_ar}</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {application.reference_code} | {application.product_type}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${statusInfo.color}`}>
                {lang === 'ar' ? statusInfo.ar : statusInfo.en}
              </span>
              <span className="text-gray-400 text-xs">{formatDate(application.created_at)}</span>
              <span className="text-navy-600 text-sm font-semibold">{formatAmount(application.requested_amount)}</span>
              <span className="text-gray-400 text-xs">| {application.branch}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {application.risk_grade && (
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow ${GRADE_COLORS[application.risk_grade]}`}>
                {application.risk_grade}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn flex-1 ${activeTab === tab.key ? 'tab-active' : 'tab-inactive'}`}
            >
              {lang === 'ar' ? tab.ar : tab.en}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'assessment' && (
            <AnalystDrawer
              application={application}
              lang={lang}
              onSaved={fetchApplication}
              embedded
            />
          )}
          {activeTab === 'attachments' && (
            <DocumentsTab application={application} lang={lang} />
          )}
          {activeTab === 'ai' && (
            <AnalysisTab application={application} lang={lang} />
          )}
          {activeTab === 'creditMemo' && (
            <CreditMemo application={application} embedded />
          )}
          {activeTab === 'finalDecision' && (
            <MemoTab application={application} lang={lang} onStatusChange={fetchApplication} />
          )}
        </div>
      </div>
    </Layout>
    </>
  )
}
