import { useState, useEffect, useRef } from 'react'
import { supabase, GRADE_COLORS, formatAmount } from '../../supabase'
import { AlertTriangle, CheckCircle, FileText, FileX, Printer, RefreshCw, ShieldCheck } from 'lucide-react'

const RECOMMENDATION_STYLES = {
  'موافقة': 'bg-emerald-600 text-white',
  'موافقة بشروط': 'bg-blue-600 text-white',
  'رفض': 'bg-red-600 text-white',
  'إحالة للجنة': 'bg-amber-500 text-white',
}

function parseJson(value, fallback) {
  if (!value) return fallback
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) }
  catch { return fallback }
}

function parseList(value) {
  const parsed = parseJson(value, value)
  if (Array.isArray(parsed)) return parsed.filter(Boolean)
  if (typeof parsed === 'string') {
    return parsed
      .split(/\|\||\n|،|,/)
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

function StatusPill({ status }) {
  const labels = {
    pending_review: 'بانتظار اعتماد رئيس الفريق',
    approved: 'تم الاعتماد',
    rejected: 'مرفوض',
  }
  const color = status === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'
  return <span className={`badge ${color}`}>{labels[status] || status || 'بانتظار المراجعة'}</span>
}

export default function AnalysisTab({ application, lang }) {
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('analysis')
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
      .maybeSingle()
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
        <span className="text-gray-400">جاري التحميل...</span>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileX size={48} className="text-gray-200 mb-4" />
        <p className="text-gray-400 font-medium">لم يتم توليد التحليل بعد</p>
        <p className="text-gray-300 text-sm mt-1">أكمل بيانات الدراسة واضغط حفظ وتوليد التحليل</p>
        <button onClick={fetchDecision} className="btn-ghost mt-4 flex items-center gap-2">
          <RefreshCw size={14} />تحديث
        </button>
      </div>
    )
  }

  const fraudFlags = parseList(decision.fraud_flags)
  const missingDocs = parseList(decision.missing_documents)
  const missingData = parseList(decision.missing_data)
  const creditMemo = parseJson(decision.credit_memo_data, {}) || {}
  const fulfillments = parseList(creditMemo.fulfillments || decision.fulfillments)
  const collaterals = parseList(creditMemo.collaterals || decision.collaterals)
  const guarantors = parseList(creditMemo.guarantors)
  const memoText = decision.generated_memo || creditMemo.memo || ''

  const recStyle = RECOMMENDATION_STYLES[decision.recommendation] || 'bg-gray-600 text-white'

  return (
    <div className="flex flex-col gap-4">

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {[{id:'analysis',label:'التحليل والنتائج'},{id:'memo',label:'جواب الموافقة'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab===t.id?'border-navy-700 text-navy-800':'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'analysis' && (
        <div className="flex flex-col gap-5">

          {/* Overview */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className={`w-18 h-18 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ${GRADE_COLORS[decision.risk_grade] || 'bg-gray-200 text-gray-700'}`}>
                  {decision.risk_grade || '?'}
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">درجة المخاطر</p>
                  <p className="text-3xl font-black text-navy-900">{decision.risk_score || 0}<span className="text-base font-normal text-gray-400">/100</span></p>
                </div>
              </div>
              <div className={`px-5 py-2.5 rounded-xl text-base font-bold ${recStyle}`}>
                {decision.recommendation || '—'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <StatusPill status={decision.status} />
              {decision.generated_at && (
                <span className="text-xs text-gray-400">
                  تاريخ التحليل: {new Date(decision.generated_at).toLocaleString('ar-EG')}
                </span>
              )}
              {decision.team_head_notes && (
                <span className="text-xs text-navy-600 bg-navy-50 rounded-full px-3 py-1">
                  ملاحظات الاعتماد: {decision.team_head_notes}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">المبلغ الموصى به</p>
                <p className="font-bold text-navy-800">{formatAmount(decision.recommended_amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">سعر الفائدة</p>
                <p className="font-bold text-navy-800">{decision.interest_rate ? `${decision.interest_rate}%` : '—'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">المدة الموصى بها</p>
                <p className="font-bold text-navy-800">{decision.recommended_tenor ? `${decision.recommended_tenor} شهر` : '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy-800 text-sm mb-3 flex items-center gap-2">
                <ShieldCheck size={15} /> الضمانات المطلوبة
              </h3>
              {collaterals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {collaterals.map((item, i) => (
                    <span key={i} className="badge bg-navy-50 text-navy-700">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">لم يتم تحديد ضمانات إضافية</p>
              )}
            </div>
            <div className="card p-5">
              <h3 className="font-bold text-navy-800 text-sm mb-3 flex items-center gap-2">
                <CheckCircle size={15} /> الاستيفاءات قبل التوقيع
              </h3>
              {fulfillments.length > 0 ? (
                <ol className="list-decimal list-inside flex flex-col gap-1 text-sm text-gray-700">
                  {fulfillments.map((item, i) => <li key={i}>{item}</li>)}
                </ol>
              ) : (
                <p className="text-sm text-gray-400">لا توجد استيفاءات مسجلة</p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-navy-800 text-sm mb-3 flex items-center gap-2">
              <FileText size={15} /> بيانات جواب الموافقة
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">حق الإدارة والتوقيع</p>
                <p className="font-semibold text-navy-800">{formatValue(creditMemo.signatory)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">الغرض من التمويل</p>
                <p className="font-semibold text-navy-800">{formatValue(creditMemo.purpose || application.purpose)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">المبلغ كتابة</p>
                <p className="font-semibold text-navy-800">{formatValue(creditMemo.approved_amount_text)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">المدة كتابة</p>
                <p className="font-semibold text-navy-800">{formatValue(creditMemo.tenor_text)}</p>
              </div>
            </div>
            {guarantors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">الضامنون</p>
                <div className="flex flex-col gap-2">
                  {guarantors.map((item, i) => (
                    <div key={i} className="text-sm bg-navy-50 text-navy-800 rounded-lg p-3">{item}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Strengths */}
          {decision.strengths && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500"/>
                <h3 className="font-bold text-emerald-800 text-sm">نقاط القوة</h3>
              </div>
              <p className="text-sm text-emerald-900 leading-relaxed">{decision.strengths}</p>
            </div>
          )}

          {/* Weaknesses */}
          {decision.weaknesses && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-amber-500"/>
                <h3 className="font-bold text-amber-800 text-sm">نقاط الضعف</h3>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">{decision.weaknesses}</p>
            </div>
          )}

          {/* Threats */}
          {decision.threats && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-500"/>
                <h3 className="font-bold text-red-800 text-sm">المخاطر والتهديدات</h3>
              </div>
              <p className="text-sm text-red-900 leading-relaxed">{decision.threats}</p>
            </div>
          )}

          {/* Fraud flags */}
          {fraudFlags.length > 0 && (
            <div>
              <h3 className="font-bold text-red-700 text-sm mb-2 flex items-center gap-2">
                <AlertTriangle size={14}/>مؤشرات الاحتيال المرصودة
              </h3>
              <div className="flex flex-col gap-2">
                {fraudFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-sm text-red-700">{flag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing documents */}
          {missingDocs.length > 0 && (
            <div>
              <h3 className="font-bold text-amber-700 text-sm mb-2 flex items-center gap-2">
                <FileX size={14}/>المستندات الناقصة
              </h3>
              <div className="flex flex-col gap-2">
                {missingDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <FileX size={14} className="text-amber-500 flex-shrink-0"/>
                    <p className="text-sm text-amber-700">{doc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing data */}
          {missingData.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-600 text-sm mb-2">بيانات ناقصة أثّرت على التحليل</h3>
              <div className="flex flex-col gap-2">
                {missingData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === 'memo' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button onClick={()=>window.print()} className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 font-medium border border-navy-200 px-3 py-1.5 rounded-lg">
              <Printer size={14}/>طباعة
            </button>
          </div>

          {/* Credit memo */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 font-arabic print:shadow-none" dir="rtl">
            {memoText ? (
              <pre className="whitespace-pre-wrap font-cairo text-sm leading-8 text-navy-800">{memoText}</pre>
            ) : (
              <>

            {/* Header */}
            <div className="text-center mb-6 border-b pb-4">
              <p className="font-bold text-base">جمعية تنمية المجتمعات المحلية والمشروعات الصغيرة (المبادرة)</p>
              <p className="text-sm text-gray-600 mt-1">المشهرة برقم ٤٠٩ لعام ٢٠١٨ — ترخيص الهيئة العامة للرقابة المالية رقم ١٢٤٥</p>
            </div>

            {/* Table */}
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['اسم العميل / العميلة', application.client_name_ar || ''],
                  ['الفرع', application.branch || ''],
                  ['الكود', application.reference_code || ''],
                  ['التاريخ', new Date().toLocaleDateString('ar-EG')],
                  ['قطاع النشاط', 'تجاري'],
                  ['النشاط', application.purpose || ''],
                  ['حق الادارة والتوقيع وفقاً للسجل التجاري', creditMemo.signatory || ''],
                  ['قيمة التمويل المقررة', creditMemo.approved_amount_text || (formatAmount(decision.recommended_amount))],
                  ['مدة التمويل', creditMemo.tenor_text || (decision.recommended_tenor ? decision.recommended_tenor + ' شهر' : '')],
                  ['الغرض من التمويل', creditMemo.purpose || application.purpose || ''],
                ].map(([label, value], i) => (
                  <tr key={i} className="border border-gray-300">
                    <td className="px-3 py-2 bg-gray-50 font-semibold text-gray-700 w-48 border-l border-gray-300">{label}</td>
                    <td className="px-3 py-2 text-gray-800">{value}</td>
                  </tr>
                ))}

                {/* Guarantors */}
                {[
                  ['بيانات ض ١', creditMemo.guarantor1_text || ''],
                  ['بيانات ض ٢', creditMemo.guarantor2_text || ''],
                  ['بيانات ض ٣', creditMemo.guarantor3_text || 'لا يوجد'],
                ].map(([label, value], i) => (
                  <tr key={'g'+i} className="border border-gray-300">
                    <td className="px-3 py-2 bg-gray-50 font-semibold text-gray-700 w-48 border-l border-gray-300 align-top">{label}</td>
                    <td className="px-3 py-2 text-gray-800">{value}</td>
                  </tr>
                ))}

                {/* Fulfillments */}
                <tr className="border border-gray-300">
                  <td className="px-3 py-2 bg-gray-50 font-semibold text-gray-700 w-48 border-l border-gray-300 align-top">
                    الاستيفاءات المطلوبة قبل اخطار العميل والضمان بالتوقيع
                  </td>
                  <td className="px-3 py-2 text-gray-800">
                    {creditMemo.fulfillments && creditMemo.fulfillments.length > 0 ? (
                      <ol className="list-decimal list-inside flex flex-col gap-1">
                        {creditMemo.fulfillments.map((f, i) => (
                          <li key={i} className="text-sm">{f}</li>
                        ))}
                      </ol>
                    ) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t">
              <div className="text-center">
                <p className="font-bold text-gray-700 mb-8">مسؤول المخاطر</p>
                <div className="border-b border-gray-400 w-32 mx-auto mb-2"/>
                <p className="text-sm text-gray-500">التوقيع</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-700 mb-8">مدير الادارة</p>
                <div className="border-b border-gray-400 w-32 mx-auto mb-2"/>
                <p className="text-sm text-gray-500">التوقيع</p>
              </div>
            </div>

              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
