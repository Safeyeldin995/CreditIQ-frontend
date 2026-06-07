import { useState, useEffect, useRef } from 'react'
import { supabase, GRADE_COLORS, formatAmount } from '../../supabase'
import { AlertTriangle, FileX, RefreshCw, Printer } from 'lucide-react'

const RECOMMENDATION_STYLES = {
  'موافقة': 'bg-emerald-600 text-white',
  'موافقة بشروط': 'bg-blue-600 text-white',
  'رفض': 'bg-red-600 text-white',
  'إحالة للجنة': 'bg-amber-500 text-white',
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

  const fraudFlags = (() => {
    try { return typeof decision.fraud_flags === 'string' ? JSON.parse(decision.fraud_flags) : (decision.fraud_flags || []) }
    catch { return [] }
  })()

  const missingDocs = (() => {
    try { return typeof decision.missing_documents === 'string' ? JSON.parse(decision.missing_documents) : (decision.missing_documents || []) }
    catch { return [] }
  })()

  const missingData = (() => {
    try { return typeof decision.missing_data === 'string' ? JSON.parse(decision.missing_data) : (decision.missing_data || []) }
    catch { return [] }
  })()

  const creditMemo = (() => {
    try { return typeof decision.credit_memo_data === 'string' ? JSON.parse(decision.credit_memo_data) : (decision.credit_memo_data || {}) }
    catch { return {} }
  })()

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

          </div>
        </div>
      )}

    </div>
  )
}
