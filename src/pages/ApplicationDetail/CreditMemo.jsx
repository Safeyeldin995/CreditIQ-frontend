import { useState, useEffect } from 'react'
import { supabase, formatAmount } from '../../supabase'
import { Printer, X } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [application.id])

  async function loadData() {
    const { data } = await supabase
      .from('analyst_assessments')
      .select('*')
      .eq('application_id', application.id)
      .single()
    if (data) setAssessment(data)
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

          {/* Notes */}
          {assessment.analyst_notes && (
            <div className="mb-6 bg-gray-50 rounded p-3 text-sm">
              <p className="font-bold mb-1">ملاحظات:</p>
              <p className="whitespace-pre-wrap">{assessment.analyst_notes}</p>
            </div>
          )}

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
