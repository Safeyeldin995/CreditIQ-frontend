import { useState, useEffect } from 'react'
import { supabase, formatAmount } from '../../supabase'
import { Printer, X } from 'lucide-react'

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

const FINAL_STATUS_LABELS = {
  approved: 'اعتماد',
  approved_with_conditions: 'اعتماد بشروط',
  rejected: 'رفض',
  pending_review: 'بانتظار القرار النهائي',
}

function calcCheques(amount, tenorMonths, interestRate, adminFee = 0.015) {
  const principal = Number(amount) || 0
  const months = Number(tenorMonths) || 12
  const rate = Number(interestRate) / 100 || 0.225
  const totalInterest = principal * rate * (months / 12)
  const adminAmount = principal * adminFee
  const totalAmount = principal + totalInterest + adminAmount
  const years = Math.ceil(months / 12)
  const cheques = []
  for (let y = 1; y <= years; y++) {
    const monthsInYear = y < years ? 12 : months - (years - 1) * 12
    const yearlyPrincipal = (principal / months) * monthsInYear
    cheques.push({
      label: `شيك السنة ${y === 1 ? 'الأولى' : y === 2 ? 'الثانية' : 'الثالثة'}`,
      months: monthsInYear,
      amount: Math.round(yearlyPrincipal)
    })
  }
  cheques.push({
    label: 'شيك الإجمالي (أصل + فائدة + رسوم)',
    months: months,
    amount: Math.round(totalAmount)
  })
  return { cheques, totalAmount, totalInterest, adminAmount, monthlyInstallment: Math.round(totalAmount / months) }
}

function getInterestRate(amount) {
  const a = Number(amount) || 0
  if (a <= 1000000) return 22.5
  if (a <= 5000000) return 21
  return 20
}

export default function CreditMemo({ application, onClose }) {
  const [assessment, setAssessment] = useState(null)
  const [decision, setDecision] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [application.id])

  async function loadData() {
    const [{ data: assessmentData }, { data: decisionData }, { data: documentsData }] = await Promise.all([
      supabase
        .from('analyst_assessments')
        .select('*')
        .eq('application_id', application.id)
        .maybeSingle(),
      supabase
        .from('risk_decision')
        .select('*')
        .eq('application_id', application.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('documents')
        .select('*')
        .eq('application_id', application.id)
        .order('uploaded_at', { ascending: false }),
    ])
    if (assessmentData) setAssessment(assessmentData)
    if (decisionData) setDecision(decisionData)
    if (documentsData) setDocuments(documentsData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <p className="text-gray-400">جاري تحميل البيانات...</p>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">لم يتم إتمام تقييم الملف بعد</p>
        <button onClick={onClose} className="btn-ghost">إغلاق</button>
      </div>
    )
  }

  const amount = assessment.recommended_amount || application.requested_amount
  const rate = getInterestRate(amount)
  const { cheques, totalAmount, monthlyInstallment } = calcCheques(amount, application.tenor_months, rate)
  const fulfillments = assessment.fulfillments ? assessment.fulfillments.split('||').filter(Boolean) : []
  const collaterals = assessment.collaterals ? assessment.collaterals.split(',').filter(Boolean) : []
  const details = parseJson(assessment.five_cs_details, {}) || {}
  const aiMemo = parseJson(decision?.credit_memo_data, {}) || {}
  const aiSummary = aiMemo.ai_summary || {}
  const riskFlags = [...parseList(details.risk_flags), ...parseList(aiMemo.risk_flags)]
  const legalReview = aiMemo.legal_review || {
    register_valid: details.legal_register_valid,
    tax_card_valid: details.legal_tax_card_valid,
    license_valid: details.legal_license_valid,
    collateral_reviewed: details.legal_collateral_reviewed,
    litigation: details.legal_litigation,
    notes: details.legal_review_notes,
  }
  const aiRisks = parseList(aiSummary.risks || decision?.threats)
  const aiConditions = parseList(aiSummary.conditions || aiMemo.conditions || aiMemo.fulfillments)
  const aiConfidence = aiSummary.confidence_score || decision?.confidence_score
  const finalDecision = aiMemo.final_decision || {}
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-auto" dir="rtl">
      {/* Toolbar - hidden on print */}
      <div className="no-print sticky top-0 bg-navy-900 text-white px-6 py-3 flex items-center justify-between z-10">
        <h2 className="font-bold">جواب الموافقة — {application.client_name_ar}</h2>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm py-2">
            <Printer size={14} />
            طباعة
          </button>
          <button onClick={onClose} className="text-navy-300 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Memo Content */}
      <div className="max-w-4xl mx-auto my-6 bg-white shadow-lg print:shadow-none print:my-0 print:max-w-full">
        <div className="p-10 font-cairo" style={{ direction: 'rtl' }}>

          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-navy-900 pb-6">
            <div className="text-4xl mb-2">🌍</div>
            <h1 className="text-xl font-black text-navy-900">جمعية تنمية المجتمعات المحلية والمشروعات الصغيرة (المبادرة)</h1>
            <p className="text-sm text-gray-600 mt-1">المشهرة برقم 409 لسنة 2018 — ترخيص هيئة الرقابة المالية رقم 1245</p>
          </div>

          {/* Basic Info Table */}
          <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
            <tbody>
              {[
                ['اسم العميل / العميلة', application.client_name_ar],
                ['الفرع', application.branch || '—'],
                ['الكود', application.reference_code],
                ['التاريخ', today],
                ['قطاع النشاط', 'تجاري'],
                ['النشاط', application.purpose || '—'],
                ['حق الإدارة والتوقيع وفقاً للسجل التجاري', 'العميل منفرداً'],
                ['قيمة التمويل المقررة', `${Number(amount).toLocaleString('ar-EG')} جنيه`],
                ['مدة التمويل', `${application.tenor_months} شهر`],
                ['الغرض من التمويل', application.purpose || '—'],
              ].map(([label, value]) => (
                <tr key={label} className="border border-gray-300">
                  <td className="font-bold bg-gray-50 px-4 py-2 w-48 border-l border-gray-300">{label}</td>
                  <td className="px-4 py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Guarantors */}
          {[1, 2].map(n => {
            const name = assessment[`g${n}_name`]
            if (!name) return null
            return (
              <table key={n} className="w-full border-collapse border border-gray-300 mb-4 text-sm">
                <tbody>
                  <tr className="border border-gray-300">
                    <td className="font-bold bg-gray-50 px-4 py-2 w-48 border-l border-gray-300">بيانات ض{n}</td>
                    <td className="px-4 py-2">
                      {name} — السن {assessment[`g${n}_age`]} سنة —{' '}
                      {assessment[`g${n}_job`]} — {assessment[`g${n}_relation`]} — {assessment[`g${n}_residence`]}
                    </td>
                  </tr>
                </tbody>
              </table>
            )
          })}

          {/* Cheques */}
          <div className="mb-6">
            <h3 className="font-bold text-navy-800 mb-3 text-sm">جدول الشيكات</h3>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-4 py-2 text-right">البيان</th>
                  <th className="px-4 py-2 text-right">المدة</th>
                  <th className="px-4 py-2 text-right">القيمة (جنيه)</th>
                </tr>
              </thead>
              <tbody>
                {cheques.map((c, i) => (
                  <tr key={i} className={`border border-gray-300 ${i === cheques.length - 1 ? 'bg-amber-50 font-bold' : ''}`}>
                    <td className="px-4 py-2">{c.label}</td>
                    <td className="px-4 py-2">{c.months} شهر</td>
                    <td className="px-4 py-2">{c.amount.toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">
              القسط الشهري التقريبي: {monthlyInstallment.toLocaleString('ar-EG')} جنيه |
              سعر الفائدة: {rate}% سنوياً | رسوم إدارية: 1.5% مرة واحدة
            </p>
          </div>

          {/* Fulfillments */}
          {fulfillments.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-navy-800 mb-3 text-sm border-b pb-1">الاستيفاءات المطلوبة قبل إخطار العميل والضامنين</h3>
              <ul className="space-y-1 text-sm">
                {fulfillments.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-navy-700">{i + 1}/</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collateral */}
          {collaterals.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-navy-800 mb-2 text-sm">الضمانات المطلوبة</h3>
              <p className="text-sm">{collaterals.join(' — ')}</p>
            </div>
          )}

          {/* Attachments metadata */}
          <div className="mb-6">
            <h3 className="font-bold text-navy-800 mb-3 text-sm border-b pb-1">المرفقات</h3>
            {documents.length > 0 ? (
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  {documents.map((doc, i) => (
                    <tr key={doc.id || i} className="border border-gray-300">
                      <td className="font-bold bg-gray-50 px-4 py-2 w-12 border-l border-gray-300">{i + 1}</td>
                      <td className="px-4 py-2">{doc.file_path ? (doc.file_path.split('/').pop() || '').replace(/^\d+_/, '').replace(/_/g, ' ') : 'مرفق'}</td>
                      <td className="px-4 py-2">{doc.document_type || 'other'}</td>
                      <td className="px-4 py-2">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('ar-EG') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500">لا توجد مرفقات مسجلة.</p>
            )}
          </div>

          {/* Notes */}
          {assessment.analyst_notes && (
            <div className="mb-6 bg-gray-50 rounded p-3 text-sm">
              <p className="font-bold mb-1">ملاحظات:</p>
              <p className="whitespace-pre-wrap">{assessment.analyst_notes}</p>
            </div>
          )}

          {/* Risk Flags */}
          <div className="mb-6">
            <h3 className="font-bold text-navy-800 mb-3 text-sm border-b pb-1">مؤشرات المخاطر</h3>
            {riskFlags.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {riskFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-red-600">{i + 1}/</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">لا توجد مؤشرات مخاطر مسجلة.</p>
            )}
            {details.risk_flag_notes && (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{details.risk_flag_notes}</p>
            )}
          </div>

          {/* Legal Review */}
          <div className="mb-6">
            <h3 className="font-bold text-navy-800 mb-3 text-sm border-b pb-1">المراجعة القانونية</h3>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <tbody>
                {[
                  ['السجل التجاري ساري ومطابق', legalReview.register_valid ? 'نعم' : 'لا'],
                  ['البطاقة الضريبية سارية', legalReview.tax_card_valid ? 'نعم' : 'لا'],
                  ['التراخيص متوفرة', legalReview.license_valid ? 'نعم' : 'لا'],
                  ['قابلية تنفيذ الضمانات مراجعة', legalReview.collateral_reviewed ? 'نعم' : 'لا'],
                  ['توجد دعاوى أو نزاعات', legalReview.litigation ? 'نعم' : 'لا'],
                ].map(([label, value]) => (
                  <tr key={label} className="border border-gray-300">
                    <td className="font-bold bg-gray-50 px-4 py-2 w-56 border-l border-gray-300">{label}</td>
                    <td className="px-4 py-2">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {legalReview.notes && (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{legalReview.notes}</p>
            )}
          </div>

          {/* AI Recommendation Summary */}
          <div className="mb-6">
            <h3 className="font-bold text-navy-800 mb-3 text-sm border-b pb-1">ملخص توصية AI الاستشارية</h3>
            <p className="text-xs text-gray-500 mb-3">توصية AI استشارية فقط ولا تمثل قرار اعتماد أو رفض.</p>
            {aiSummary.summary && (
              <p className="text-sm whitespace-pre-wrap mb-3"><span className="font-bold">الملخص: </span>{aiSummary.summary}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="font-bold mb-1">التوصية الاستشارية</p>
                <p>{aiSummary.advisory_recommendation || decision?.recommendation || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="font-bold mb-1">درجة الثقة</p>
                <p>{aiConfidence ? Math.round(Number(aiConfidence) <= 1 ? Number(aiConfidence) * 100 : Number(aiConfidence)) + '%' : 'غير متاح'}</p>
              </div>
            </div>
            {(aiSummary.strengths || decision?.strengths) && <p className="text-sm whitespace-pre-wrap mb-2"><span className="font-bold">نقاط القوة: </span>{Array.isArray(aiSummary.strengths) ? aiSummary.strengths.join('\n') : (aiSummary.strengths || decision.strengths)}</p>}
            {(aiSummary.weaknesses || decision?.weaknesses) && <p className="text-sm whitespace-pre-wrap mb-2"><span className="font-bold">نقاط الضعف: </span>{Array.isArray(aiSummary.weaknesses) ? aiSummary.weaknesses.join('\n') : (aiSummary.weaknesses || decision.weaknesses)}</p>}
            {aiRisks.length > 0 && <p className="text-sm whitespace-pre-wrap mb-2"><span className="font-bold">المخاطر: </span>{aiRisks.join('\n')}</p>}
            {aiConditions.length > 0 && (
              <div className="text-sm">
                <p className="font-bold mb-1">الشروط المقترحة:</p>
                <ul className="list-disc list-inside">
                  {aiConditions.map((condition, i) => <li key={i}>{condition}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Final Decision */}
          <div className="mb-6">
            <h3 className="font-bold text-navy-800 mb-3 text-sm border-b pb-1">القرار النهائي</h3>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p><span className="font-bold">القرار البشري النهائي: </span>{FINAL_STATUS_LABELS[decision?.status] || 'بانتظار القرار النهائي'}</p>
              <p className="mt-2"><span className="font-bold">المبلغ المعتمد: </span>{finalDecision.approved_amount ? formatAmount(finalDecision.approved_amount) : '—'}</p>
              <p className="mt-2"><span className="font-bold">المدة المعتمدة: </span>{finalDecision.approved_tenor ? `${finalDecision.approved_tenor} شهر` : '—'}</p>
              <p className="mt-2 whitespace-pre-wrap"><span className="font-bold">الضمانات النهائية: </span>{finalDecision.final_guarantees || '—'}</p>
              <p className="mt-2 whitespace-pre-wrap"><span className="font-bold">الشروط النهائية: </span>{finalDecision.final_conditions || '—'}</p>
              <p className="mt-2"><span className="font-bold">صاحب القرار: </span>{finalDecision.decision_maker || '—'}</p>
              <p className="mt-2"><span className="font-bold">تاريخ القرار: </span>{finalDecision.decision_date || '—'}</p>
              {decision?.team_head_notes && (
                <p className="mt-2 whitespace-pre-wrap"><span className="font-bold">ملاحظات القرار: </span>{decision.team_head_notes}</p>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 grid grid-cols-2 gap-12">
            <div className="text-center">
              <p className="font-bold text-navy-800 mb-2">مسؤول المخاطر</p>
              <p className="text-sm text-gray-600 mb-8">أ/ {assessment.analyst_name || '........................'}</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-500">التوقيع/</p>
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-navy-800 mb-2">مدير الإدارة</p>
              <p className="text-sm text-gray-600 mb-8">أ/ ........................</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-500">التوقيع/</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
