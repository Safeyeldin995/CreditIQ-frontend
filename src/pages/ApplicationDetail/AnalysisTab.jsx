import { useState, useEffect, useRef } from 'react'
import { supabase, GRADE_COLORS, formatAmount } from '../../lib/supabase'
import { AlertTriangle, FileX, CheckCircle, RefreshCw, TrendingUp, Shield, DollarSign, Users, Globe, Activity } from 'lucide-react'

const SIX_CS = [
  { key: 'character', arLabel: 'الشخصية', enLabel: 'Character', icon: Users },
  { key: 'capacity', arLabel: 'القدرة', enLabel: 'Capacity', icon: Activity },
  { key: 'capital', arLabel: 'رأس المال', enLabel: 'Capital', icon: DollarSign },
  { key: 'collateral', arLabel: 'الضمانات', enLabel: 'Collateral', icon: Shield },
  { key: 'conditions', arLabel: 'الظروف', enLabel: 'Conditions', icon: Globe },
  { key: 'cash_flow', arLabel: 'التدفق النقدي', enLabel: 'Cash Flow', icon: TrendingUp },
]

const RECOMMENDATION_STYLES = {
  'موافقة': 'bg-emerald-600 text-white',
  'موافقة بشروط': 'bg-blue-600 text-white',
  'رفض': 'bg-red-600 text-white',
  'إحالة للجنة': 'bg-amber-500 text-white',
}

export default function AnalysisTab({ application, lang }) {
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollingRef = useRef(null)

  useEffect(() => {
    fetchDecision()
    pollingRef.current = setInterval(fetchDecision, 10000)
    return () => clearInterval(pollingRef.current)
  }, [application.id])

  async function fetchDecision() {
    const { data } = await supabase
      .from('risk_decision')
      .select('*')
      .eq('application_id', application.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
    if (data) {
      setDecision(data)
      clearInterval(pollingRef.current)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-navy-400 mr-3" />
        <span className="text-gray-400">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileX size={48} className="text-gray-200 mb-4" />
        <p className="text-gray-400 font-medium">
          {lang === 'ar' ? 'لم يتم توليد التحليل بعد' : 'Analysis not generated yet'}
        </p>
        <p className="text-gray-300 text-sm mt-1">
          {lang === 'ar' ? 'ارفع المستندات واضغط "توليد التحليل الائتماني"' : 'Upload documents and click "Generate AI Analysis"'}
        </p>
        <button onClick={fetchDecision} className="btn-ghost mt-4 flex items-center gap-2">
          <RefreshCw size={14} />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>
    )
  }

  const sixCs = (() => {
    try { return typeof decision.six_cs_scores === 'string' ? JSON.parse(decision.six_cs_scores) : decision.six_cs_scores }
    catch { return {} }
  })()

  const fraudFlags = (() => {
    try { return typeof decision.fraud_flags === 'string' ? JSON.parse(decision.fraud_flags) : (decision.fraud_flags || []) }
    catch { return [] }
  })()

  const missingDocs = (() => {
    try { return typeof decision.missing_documents === 'string' ? JSON.parse(decision.missing_documents) : (decision.missing_documents || []) }
    catch { return [] }
  })()

  const fulfillments = (() => {
    try { return typeof decision.required_fulfillments === 'string' ? JSON.parse(decision.required_fulfillments) : (decision.required_fulfillments || []) }
    catch { return [] }
  })()

  const recStyle = RECOMMENDATION_STYLES[decision.recommendation] || 'bg-gray-600 text-white'

  return (
    <div className="flex flex-col gap-6">
      {/* Risk overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Grade circle */}
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg ${GRADE_COLORS[decision.risk_grade] || 'bg-gray-200 text-gray-700'}`}>
              {decision.risk_grade || '?'}
            </div>
            <div>
              <p className="text-gray-400 text-sm">{lang === 'ar' ? 'درجة المخاطر' : 'Risk Grade'}</p>
              <p className="text-4xl font-black text-navy-900">{decision.risk_score || 0}<span className="text-lg font-normal text-gray-400">/100</span></p>
            </div>
          </div>
          {/* Recommendation */}
          <div className={`px-6 py-3 rounded-xl text-lg font-bold ${recStyle}`}>
            {decision.recommendation || '—'}
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'المبلغ الموصى به' : 'Recommended Amount'}</p>
            <p className="font-bold text-navy-800">{formatAmount(decision.recommended_amount)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'سعر الفائدة' : 'Interest Rate'}</p>
            <p className="font-bold text-navy-800">{decision.interest_rate ? `${decision.interest_rate}%` : '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">ECR {lang === 'ar' ? 'التكلفة الفعلية' : 'Effective Cost'}</p>
            <p className="font-bold text-navy-800">{decision.ecr ? `${decision.ecr}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* 6Cs grid */}
      {Object.keys(sixCs).length > 0 && (
        <div>
          <h3 className="section-title mb-3">{lang === 'ar' ? 'تحليل 6Cs' : '6Cs Analysis'}</h3>
          <div className="grid grid-cols-2 gap-3">
            {SIX_CS.map(c => {
              const data = sixCs[c.key] || {}
              const score = data.score || 0
              const scoreColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
              return (
                <div key={c.key} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <c.icon size={16} className="text-navy-600" />
                      <span className="font-bold text-navy-800 text-sm">
                        {lang === 'ar' ? c.arLabel : c.enLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.grade && (
                        <span className={`badge ${GRADE_COLORS[data.grade] || 'bg-gray-100 text-gray-600'}`}>
                          {data.grade}
                        </span>
                      )}
                      <span className="text-sm font-bold text-navy-700">{score}/100</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${scoreColor}`} style={{ width: `${score}%` }} />
                  </div>
                  {data.findings && (
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{data.findings}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Fraud flags */}
      {fraudFlags.length > 0 && (
        <div>
          <h3 className="section-title mb-3 text-red-700">
            {lang === 'ar' ? '⚠️ مؤشرات الاحتيال المرصودة' : '⚠️ Fraud Indicators'}
          </h3>
          <div className="flex flex-col gap-2">
            {fraudFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{flag}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing documents */}
      {missingDocs.length > 0 && (
        <div>
          <h3 className="section-title mb-3 text-amber-700">
            {lang === 'ar' ? 'المستندات الناقصة' : 'Missing Documents'}
          </h3>
          <div className="flex flex-col gap-2">
            {missingDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <FileX size={16} className="text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">{doc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required fulfillments */}
      {fulfillments.length > 0 && (
        <div>
          <h3 className="section-title mb-3">
            {lang === 'ar' ? 'الاستيفاءات المطلوبة' : 'Required Fulfillments'}
          </h3>
          <div className="card p-4">
            <ol className="flex flex-col gap-2">
              {fulfillments.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
