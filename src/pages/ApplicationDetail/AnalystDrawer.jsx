import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { X, ChevronRight, ChevronLeft, Save, FileText, CheckCircle } from 'lucide-react'

// ===================== CONSTANTS =====================

const RELATIONS = ['زوجة', 'زوج', 'أخ', 'أخت', 'ابن', 'ابنة', 'صديق', 'شريك', 'جار', 'أخرى']
const JOBS = ['موظف حكومي', 'موظف قطاع خاص', 'عمل حر / تجارة', 'مهنة حرة', 'معلم / مدرس', 'طبيب', 'محاسب', 'مهندس', 'بدون عمل', 'متقاعد', 'أخرى']
const CALL_RESULTS = ['إيجابي', 'سلبي', 'لم يرد', 'وعد بالإعادة', 'رفض التحدث']
const DECISIONS = ['موافقة', 'موافقة بشروط', 'رفض', 'إحالة للجنة']
const COLLATERAL_OPTIONS = ['شيكات بنكية', 'شيكات بريدية', 'رهن حيازي', 'رهن عقاري', 'كفيل شخصي', 'عباءات مالية']

const FIXED_FULFILLMENTS = [
  'توقيع جميع العقود والشيكات على الشيكات وفقاً لقرار العام رقم 93',
  'التوقيع خلال 7 أيام عمل بحد أقصى من تاريخ الإخطار',
  'تقديم صورة البطاقة القومية للعميل والضامنين',
  'تسليم كشف حساب بنكي محدث',
  'استخراج مستخرج السجل التجاري',
  'توقيع الزوج/الزوجة على عقد الرهن الحيازي',
  'إرسال بطاقة شقيق/قريب العميل للاستعلام',
  'إزالة السمة التجارية لعدم وجودها بالسجل التجاري',
  'كتابة اسم الشركات المنتجة للبضاعة الموجودة بالكشف',
  'عمل رهن بسجل الضمانات المنقولة وفقاً لملحق عقد الضمان',
]

// 5Cs scoring items
const FIVE_CS = {
  character: {
    label: 'شخصية العميل',
    max: 5,
    items: [
      { key: 'c_education', label: 'المؤهل', max: 1, options: [{ label: 'مؤهل عالي', val: 1 }, { label: 'مؤهل متوسط', val: 0.5 }, { label: 'بدون مؤهل', val: 0 }] },
      { key: 'c_trust', label: 'الثقة بعد مكالمة العميل', max: 1, options: [{ label: 'ثقة عالية', val: 1 }, { label: 'ثقة متوسطة', val: 0.5 }, { label: 'ثقة ضعيفة', val: 0 }] },
      { key: 'c_job', label: 'الوظيفة', max: 1, options: [{ label: 'صاحب نشاط مستقر', val: 1 }, { label: 'موظف مع نشاط', val: 0.5 }, { label: 'بدون عمل ثابت', val: 0 }] },
      { key: 'c_residence', label: 'سنوات استقرار السكن', max: 1, options: [{ label: 'أكثر من 3 سنوات', val: 1 }, { label: '1 إلى 3 سنوات', val: 0.5 }, { label: 'أقل من سنة', val: 0 }] },
      { key: 'c_business_stability', label: 'سنوات استقرار النشاط', max: 1, options: [{ label: 'أكثر من 3 سنوات', val: 1 }, { label: '1 إلى 3 سنوات', val: 0.5 }, { label: 'أقل من سنة', val: 0 }] },
    ]
  },
  credit_history: {
    label: 'التاريخ الائتماني',
    max: 5,
    items: [
      { key: 'cr_personal_banks', label: 'تمويلات شخصية ببنوك', max: 1, options: [{ label: 'منتظم', val: 1 }, { label: 'تأخر بسيط', val: 0.5 }, { label: 'متعثر', val: 0 }] },
      { key: 'cr_business_banks', label: 'تمويلات أنشطة ببنوك', max: 1, options: [{ label: 'منتظم', val: 1 }, { label: 'تأخر بسيط', val: 0.5 }, { label: 'متعثر أو لا يوجد', val: 0 }] },
      { key: 'cr_companies', label: 'تمويلات أنشطة شركات', max: 0.5, options: [{ label: 'منتظم', val: 0.5 }, { label: 'تأخر بسيط', val: 0.25 }, { label: 'متعثر أو لا يوجد', val: 0 }] },
      { key: 'cr_bank_regularity', label: 'انتظام العميل بالبنوك', max: 1, options: [{ label: 'منتظم جداً', val: 1 }, { label: 'متوسط', val: 0.5 }, { label: 'غير منتظم', val: 0 }] },
      { key: 'cr_companies_regularity', label: 'انتظام العميل بالشركات', max: 0.5, options: [{ label: 'منتظم', val: 0.5 }, { label: 'متوسط', val: 0.25 }, { label: 'غير منتظم', val: 0 }] },
      { key: 'cr_current_loans', label: 'قيمة التمويلات الجارية مقارنة بالمطلوب', max: 0.5, options: [{ label: 'أقل من 50% من المطلوب', val: 0.5 }, { label: 'من 50-80%', val: 0.25 }, { label: 'أكثر من 80%', val: 0 }] },
      { key: 'cr_inquiries', label: 'عدد الاستعلامات والتقييم الرقمي', max: 0.5, options: [{ label: 'أقل من 5 استعلامات', val: 0.5 }, { label: '5 إلى 10', val: 0.25 }, { label: 'أكثر من 10', val: 0 }] },
    ]
  },
  collateral: {
    label: 'الضمانات',
    max: 4.5,
    items: [
      { key: 'col_guarantors', label: 'ضمان أفراد', max: 1, options: [{ label: 'ضامن مليء بوظيفة ثابتة', val: 1 }, { label: 'ضامن بعمل حر', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'col_ecr', label: 'رهن حيازي أول يد', max: 1, options: [{ label: 'يوجد بقيمة كافية', val: 1 }, { label: 'يوجد بقيمة جزئية', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'col_bank_cheques', label: 'شيكات بنكية / بريدية للعميل', max: 1, options: [{ label: 'يوجد', val: 1 }, { label: 'جزئي', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'col_guarantee_cheques', label: 'شيكات ضمان بنكي / بريدي', max: 0.5, options: [{ label: 'يوجد', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'col_client_insurance', label: 'عباءات مالية للعميل', max: 0.5, options: [{ label: 'يوجد', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'col_guarantor_insurance', label: 'عباءات مالية للضمان', max: 0.5, options: [{ label: 'يوجد', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
    ]
  },
  capital: {
    label: 'رأس المال',
    max: 5,
    items: [
      { key: 'cap_leverage', label: 'الرافعة المالية', max: 1, options: [{ label: 'يوجد وكافية', val: 1 }, { label: 'يوجد جزئياً', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'cap_business_ownership', label: 'ملكية محل النشاط', max: 2, options: [{ label: 'ملك تام', val: 2 }, { label: 'إيجار موثق', val: 1 }, { label: 'إيجار غير موثق', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
      { key: 'cap_residence', label: 'ملكية السكن', max: 1, options: [{ label: 'ملك', val: 1 }, { label: 'إيجار', val: 0.5 }, { label: 'مع العائلة', val: 0 }] },
      { key: 'cap_tools', label: 'أدوات تخدم النشاط', max: 1, options: [{ label: 'يوجد بقيمة جيدة', val: 1 }, { label: 'يوجد جزئياً', val: 0.5 }, { label: 'لا يوجد', val: 0 }] },
    ]
  },
  conditions: {
    label: 'الظروف المحيطة',
    max: 5,
    items: [
      { key: 'cond_operation', label: 'انتظام التشغيل', max: 1, options: [{ label: 'منتظم جداً', val: 1 }, { label: 'متوسط', val: 0.5 }, { label: 'غير منتظم', val: 0 }] },
      { key: 'cond_employees', label: 'عدد العمالة', max: 1, options: [{ label: 'أكثر من 5', val: 1 }, { label: '2 إلى 5', val: 0.5 }, { label: 'بدون عمالة', val: 0 }] },
      { key: 'cond_legal', label: 'الوضع القانوني للنشاط', max: 3, options: [{ label: 'مرخص بالكامل', val: 3 }, { label: 'مرخص جزئياً', val: 1.5 }, { label: 'قيد الاستخراج', val: 0.5 }, { label: 'غير مرخص', val: 0 }] },
    ]
  }
}

// ===================== HELPER COMPONENTS =====================

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-navy-700 bg-navy-50 px-3 py-2 rounded-lg mb-3 border-r-4 border-gold-500">
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options, placeholder = 'اختر...' }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
    />
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-gray-200'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

// ===================== MAIN COMPONENT =====================

export default function AnalystDrawer({ application, lang, onClose, onSaved }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [existingId, setExistingId] = useState(null)
  const toast = useToast()

  const [data, setData] = useState({
    // Business
    operation_rating: '', employee_count: '', legal_status: '',
    business_ownership: '', residence_ownership: '',
    has_tools: false, has_leverage: false,
    // Sales
    sales_specialist: '', sales_investigator: '', sales_manager: '',
    sales_proof: '', purchases_proof: '', monthly_expenses: '',
    // Capital
    capital_specialist: '', capital_investigator: '', capital_manager: '',
    // Guarantor 1
    g1_name: '', g1_age: '', g1_relation: '', g1_job: '',
    g1_employer: '', g1_residence: '', g1_has_debts: false,
    // Guarantor 2
    g2_name: '', g2_age: '', g2_relation: '', g2_job: '',
    g2_employer: '', g2_residence: '', g2_has_debts: false,
    // Calls
    client_called: false, client_call_result: '', client_call_notes: '',
    g1_called: false, g1_call_result: '', g1_call_notes: '',
    g2_called: false, g2_call_result: '', g2_call_notes: '',
    suppliers_called: false, suppliers_notes: '',
    // 5Cs scores
    c_education: 0, c_trust: 0, c_job: 0, c_residence: 0, c_business_stability: 0,
    cr_personal_banks: 0, cr_business_banks: 0, cr_companies: 0,
    cr_bank_regularity: 0, cr_companies_regularity: 0,
    cr_current_loans: 0, cr_inquiries: 0,
    col_guarantors: 0, col_ecr: 0, col_bank_cheques: 0,
    col_guarantee_cheques: 0, col_client_insurance: 0, col_guarantor_insurance: 0,
    cap_leverage: 0, cap_business_ownership: 0, cap_residence: 0, cap_tools: 0,
    cond_operation: 0, cond_employees: 0, cond_legal: 0,
    // Decision
    analyst_decision: '', recommended_amount: '',
    collaterals: [], fulfillments: [], analyst_notes: '',
    analyst_name: '',
    // AI pre-filled
    ai_iscore_grade: '', ai_iscore_score: '', ai_outstanding_loans: '',
    ai_avg_balance: '', ai_returned_cheques: false, ai_ecr_value: '',
    ai_monthly_sales: '', ai_monthly_purchases: '',
  })

  useEffect(() => {
    loadExisting()
    loadAIData()
  }, [application.id])

  async function loadExisting() {
    const { data: existing } = await supabase
      .from('analyst_assessments')
      .select('*')
      .eq('application_id', application.id)
      .single()
    if (existing) {
      setExistingId(existing.id)
      setData(prev => ({
        ...prev,
        ...existing,
        collaterals: existing.collaterals ? existing.collaterals.split(',').filter(Boolean) : [],
        fulfillments: existing.fulfillments ? existing.fulfillments.split('||').filter(Boolean) : [],
      }))
    }
  }

  async function loadAIData() {
    const { data: rd } = await supabase
      .from('risk_decision')
      .select('*')
      .eq('application_id', application.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
    if (rd) {
      const six = typeof rd.six_cs_scores === 'string' ? JSON.parse(rd.six_cs_scores || '{}') : (rd.six_cs_scores || {})
      setData(prev => ({
        ...prev,
        ai_iscore_grade: rd.risk_grade || '',
        ai_iscore_score: rd.risk_score || '',
        ai_monthly_sales: six?.capacity?.findings?.match(/(\d[\d,]+)/)?.[0]?.replace(/,/g, '') || '',
      }))
    }
  }

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }))

  function calcScores() {
    const char = data.c_education + data.c_trust + data.c_job + data.c_residence + data.c_business_stability
    const credit = data.cr_personal_banks + data.cr_business_banks + data.cr_companies +
      data.cr_bank_regularity + data.cr_companies_regularity + data.cr_current_loans + data.cr_inquiries
    const col = data.col_guarantors + data.col_ecr + data.col_bank_cheques +
      data.col_guarantee_cheques + data.col_client_insurance + data.col_guarantor_insurance
    const cap = data.cap_leverage + data.cap_business_ownership + data.cap_residence + data.cap_tools
    const cond = data.cond_operation + data.cond_employees + data.cond_legal
    const total = char + credit + col + cap + cond
    return { char, credit, col, cap, cond, total }
  }

  function getRecommendedAmountFromScore(total) {
    const requested = Number(application.requested_amount) || 0
    if (total >= 20) return requested
    if (total >= 15) return Math.round(requested * 0.75)
    if (total >= 10) return Math.round(requested * 0.5)
    return 0
  }

  function toggleCollateral(item) {
    setData(prev => ({
      ...prev,
      collaterals: prev.collaterals.includes(item)
        ? prev.collaterals.filter(c => c !== item)
        : [...prev.collaterals, item]
    }))
  }

  function toggleFulfillment(item) {
    setData(prev => ({
      ...prev,
      fulfillments: prev.fulfillments.includes(item)
        ? prev.fulfillments.filter(f => f !== item)
        : [...prev.fulfillments, item]
    }))
  }

  async function handleSave() {
    setSaving(true)
    const scores = calcScores()
    const payload = {
      application_id: application.id,
      ...data,
      score_character: scores.char,
      score_credit_history: scores.credit,
      score_collateral: scores.col,
      score_capital: scores.cap,
      score_conditions: scores.cond,
      total_score: scores.total,
      collaterals: data.collaterals.join(','),
      fulfillments: data.fulfillments.join('||'),
      recommended_amount: data.recommended_amount || getRecommendedAmountFromScore(scores.total),
      updated_at: new Date().toISOString(),
    }

    let error
    if (existingId) {
      const res = await supabase.from('analyst_assessments').update(payload).eq('id', existingId)
      error = res.error
    } else {
      const res = await supabase.from('analyst_assessments').insert(payload).select().single()
      error = res.error
      if (res.data) setExistingId(res.data.id)
    }

    if (error) {
      toast('حدث خطأ أثناء الحفظ: ' + error.message, 'error')
    } else {
      toast('تم حفظ التقييم بنجاح ✓', 'success')
      onSaved?.()
    }
    setSaving(false)
  }

  const scores = calcScores()
  const autoAmount = getRecommendedAmountFromScore(scores.total)

  const STEPS = [
    'البيانات من الـ AI',
    'الزيارة الميدانية',
    'الضامنون',
    'المكالمات',
    'التقييم 5Cs',
    'القرار',
  ]

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[520px] bg-white h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-navy-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-base">تقييم الملف الائتماني</h2>
            <p className="text-navy-300 text-xs mt-0.5">{application.client_name_ar} — {application.reference_code}</p>
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto flex-shrink-0 bg-gray-50">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                step === i ? 'border-gold-500 text-navy-800' : 'border-transparent text-gray-400 hover:text-navy-600'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* STEP 0: AI Data */}
          {step === 0 && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-blue-700 text-xs font-semibold">
                  البيانات دي استخرجها الذكاء الاصطناعي من المستندات المرفوعة. راجعها وعدّل لو في حاجة غلط.
                </p>
              </div>
              <Section title="من الايسكور">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="درجة الايسكور التصنيفية">
                    <Input value={data.ai_iscore_grade} onChange={v => set('ai_iscore_grade', v)} placeholder="A / B / C" />
                  </Field>
                  <Field label="الدرجة الرقمية">
                    <Input type="number" value={data.ai_iscore_score} onChange={v => set('ai_iscore_score', v)} placeholder="750" />
                  </Field>
                  <Field label="إجمالي الالتزامات القائمة (جنيه)">
                    <Input type="number" value={data.ai_outstanding_loans} onChange={v => set('ai_outstanding_loans', v)} />
                  </Field>
                  <Field label="هل يوجد شيكات مرتجعة">
                    <Toggle label="" value={data.ai_returned_cheques} onChange={v => set('ai_returned_cheques', v)} />
                  </Field>
                </div>
              </Section>
              <Section title="من كشف الحساب البنكي">
                <Field label="متوسط الرصيد الشهري (جنيه)">
                  <Input type="number" value={data.ai_avg_balance} onChange={v => set('ai_avg_balance', v)} />
                </Field>
              </Section>
              <Section title="من عقد الرهن الحيازي (ECR)">
                <Field label="قيمة الرهن الحيازي الإجمالية (جنيه)">
                  <Input type="number" value={data.ai_ecr_value} onChange={v => set('ai_ecr_value', v)} />
                </Field>
              </Section>
              <Section title="من الدراسة الائتمانية والاستعلام">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="المبيعات الشهرية المثبتة (جنيه)">
                    <Input type="number" value={data.ai_monthly_sales} onChange={v => set('ai_monthly_sales', v)} />
                  </Field>
                  <Field label="المشتريات الشهرية (جنيه)">
                    <Input type="number" value={data.ai_monthly_purchases} onChange={v => set('ai_monthly_purchases', v)} />
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {/* STEP 1: Site Visit */}
          {step === 1 && (
            <div>
              <Section title="بيانات النشاط من الزيارة الميدانية">
                <Field label="انتظام التشغيل">
                  <Select value={data.operation_rating} onChange={v => set('operation_rating', v)}
                    options={['ممتاز', 'جيد', 'متوسط', 'ضعيف']} />
                </Field>
                <Field label="عدد العمالة">
                  <Select value={data.employee_count} onChange={v => set('employee_count', v)}
                    options={['1 إلى 5', '6 إلى 10', 'أكثر من 10', 'بدون عمالة']} />
                </Field>
                <Field label="الوضع القانوني للنشاط">
                  <Select value={data.legal_status} onChange={v => set('legal_status', v)}
                    options={['مرخص بالكامل', 'مرخص جزئياً', 'قيد الاستخراج', 'غير مرخص']} />
                </Field>
                <Field label="ملكية محل النشاط">
                  <Select value={data.business_ownership} onChange={v => set('business_ownership', v)}
                    options={['ملك تام', 'إيجار موثق', 'إيجار غير موثق']} />
                </Field>
                <Field label="ملكية السكن">
                  <Select value={data.residence_ownership} onChange={v => set('residence_ownership', v)}
                    options={['ملك', 'إيجار', 'مع العائلة']} />
                </Field>
                <Toggle label="يوجد أدوات تخدم النشاط" value={data.has_tools} onChange={v => set('has_tools', v)} />
                <Toggle label="يوجد رافعة مالية" value={data.has_leverage} onChange={v => set('has_leverage', v)} />
              </Section>

              <Section title="تقدير المبيعات الشهرية (جنيه)">
                <Field label="تقدير الاخصائي"><Input type="number" value={data.sales_specialist} onChange={v => set('sales_specialist', v)} /></Field>
                <Field label="تقدير المستعلم"><Input type="number" value={data.sales_investigator} onChange={v => set('sales_investigator', v)} /></Field>
                <Field label="تقدير مدير المشروعات"><Input type="number" value={data.sales_manager} onChange={v => set('sales_manager', v)} /></Field>
                <Field label="نوع إثبات المبيعات">
                  <Select value={data.sales_proof} onChange={v => set('sales_proof', v)}
                    options={['فواتير ورقية', 'فواتير إلكترونية', 'فواتير جزئية', 'لا يوجد']} />
                </Field>
                <Field label="نوع إثبات المشتريات">
                  <Select value={data.purchases_proof} onChange={v => set('purchases_proof', v)}
                    options={['فواتير ورقية', 'فواتير إلكترونية', 'فواتير جزئية', 'لا يوجد']} />
                </Field>
                <Field label="المصروفات الشهرية الإجمالية (جنيه)">
                  <Input type="number" value={data.monthly_expenses} onChange={v => set('monthly_expenses', v)} />
                </Field>
              </Section>

              <Section title="تقدير رأس المال (جنيه)">
                <Field label="تقدير الاخصائي"><Input type="number" value={data.capital_specialist} onChange={v => set('capital_specialist', v)} /></Field>
                <Field label="تقدير المستعلم"><Input type="number" value={data.capital_investigator} onChange={v => set('capital_investigator', v)} /></Field>
                <Field label="تقدير مدير المشروعات"><Input type="number" value={data.capital_manager} onChange={v => set('capital_manager', v)} /></Field>
              </Section>
            </div>
          )}

          {/* STEP 2: Guarantors */}
          {step === 2 && (
            <div>
              {[1, 2].map(n => (
                <Section key={n} title={`الضامن ${n === 1 ? 'الأول (ض١)' : 'الثاني (ض٢)'}`}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="الاسم"><Input value={data[`g${n}_name`]} onChange={v => set(`g${n}_name`, v)} /></Field>
                    <Field label="السن"><Input type="number" value={data[`g${n}_age`]} onChange={v => set(`g${n}_age`, v)} /></Field>
                    <Field label="الصلة بالعميل">
                      <Select value={data[`g${n}_relation`]} onChange={v => set(`g${n}_relation`, v)} options={RELATIONS} />
                    </Field>
                    <Field label="الوظيفة">
                      <Select value={data[`g${n}_job`]} onChange={v => set(`g${n}_job`, v)} options={JOBS} />
                    </Field>
                    <Field label="جهة العمل" >
                      <Input value={data[`g${n}_employer`]} onChange={v => set(`g${n}_employer`, v)} />
                    </Field>
                    <Field label="ملكية السكن">
                      <Select value={data[`g${n}_residence`]} onChange={v => set(`g${n}_residence`, v)}
                        options={['ملك', 'إيجار', 'مع العائلة']} />
                    </Field>
                  </div>
                  <Toggle label="لديه مديونيات قائمة" value={data[`g${n}_has_debts`]} onChange={v => set(`g${n}_has_debts`, v)} />
                </Section>
              ))}
            </div>
          )}

          {/* STEP 3: Phone Calls */}
          {step === 3 && (
            <div>
              {[
                { key: 'client', label: 'مكالمة العميل' },
                { key: 'g1', label: 'مكالمة الضامن الأول' },
                { key: 'g2', label: 'مكالمة الضامن الثاني' },
              ].map(({ key, label }) => (
                <Section key={key} title={label}>
                  <Toggle label="تم الاتصال" value={data[`${key}_called`]} onChange={v => set(`${key}_called`, v)} />
                  {data[`${key}_called`] && (
                    <>
                      <Field label="نتيجة المكالمة">
                        <Select value={data[`${key}_call_result`]} onChange={v => set(`${key}_call_result`, v)} options={CALL_RESULTS} />
                      </Field>
                      <Field label="ملاحظات">
                        <textarea
                          value={data[`${key}_call_notes`] || ''}
                          onChange={e => set(`${key}_call_notes`, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
                          rows={3}
                        />
                      </Field>
                    </>
                  )}
                </Section>
              ))}
              <Section title="مكالمة الموردين">
                <Toggle label="تم الاتصال بالموردين" value={data.suppliers_called} onChange={v => set('suppliers_called', v)} />
                {data.suppliers_called && (
                  <Field label="ملاحظات">
                    <textarea
                      value={data.suppliers_notes || ''}
                      onChange={e => set('suppliers_notes', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
                      rows={3}
                    />
                  </Field>
                )}
              </Section>
            </div>
          )}

          {/* STEP 4: 5Cs Scoring */}
          {step === 4 && (
            <div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm font-bold">
                  <span>إجمالي الدرجات الحالية</span>
                  <span className={`text-lg ${scores.total >= 20 ? 'text-emerald-600' : scores.total >= 15 ? 'text-amber-600' : scores.total >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                    {scores.total.toFixed(1)} / 24.5
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  {scores.total >= 20 ? 'موافقة بنفس المبلغ المطلوب' :
                   scores.total >= 15 ? 'موافقة بتخفيض 25%' :
                   scores.total >= 10 ? 'موافقة بتخفيض 50% — ينصح بالرفض' :
                   'رفض قطعاً'}
                </p>
              </div>

              {Object.entries(FIVE_CS).map(([cKey, c]) => (
                <Section key={cKey} title={`${c.label} — ${(Object.entries(FIVE_CS).indexOf([cKey, c]) >= 0 ? (cKey === 'character' ? scores.char : cKey === 'credit_history' ? scores.credit : cKey === 'collateral' ? scores.col : cKey === 'capital' ? scores.cap : scores.cond) : 0).toFixed(1)} / ${c.max}`}>
                  {c.items.map(item => (
                    <Field key={item.key} label={`${item.label} (حد أقصى ${item.max})`}>
                      <Select
                        value={String(data[item.key])}
                        onChange={v => set(item.key, Number(v))}
                        options={item.options.map(o => ({ value: String(o.val), label: `${o.label} (${o.val})` }))}
                        placeholder="اختر التقييم..."
                      />
                    </Field>
                  ))}
                </Section>
              ))}
            </div>
          )}

          {/* STEP 5: Decision */}
          {step === 5 && (
            <div>
              <div className="bg-navy-50 rounded-xl p-4 mb-4 border border-navy-100">
                <p className="text-sm font-bold text-navy-800 mb-2">ملخص الدرجات</p>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { label: 'الشخصية', val: scores.char, max: 5 },
                    { label: 'الائتمان', val: scores.credit, max: 5 },
                    { label: 'الضمانات', val: scores.col, max: 4.5 },
                    { label: 'رأس المال', val: scores.cap, max: 5 },
                    { label: 'الظروف', val: scores.cond, max: 5 },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="font-bold text-navy-800">{s.val.toFixed(1)}</div>
                      <div className="text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center font-bold text-navy-800">
                  الإجمالي: {scores.total.toFixed(1)} — المبلغ الموصى به: {autoAmount.toLocaleString('ar-EG')} جنيه
                </div>
              </div>

              <Section title="قرار المحلل">
                <Field label="القرار النهائي">
                  <Select value={data.analyst_decision} onChange={v => set('analyst_decision', v)} options={DECISIONS} />
                </Field>
                <Field label="المبلغ الموصى به (جنيه)">
                  <Input type="number" value={data.recommended_amount || autoAmount}
                    onChange={v => set('recommended_amount', v)} />
                </Field>
                <Field label="اسم المحلل / مسؤول المخاطر">
                  <Input value={data.analyst_name} onChange={v => set('analyst_name', v)} placeholder="الاسم بالكامل" />
                </Field>
              </Section>

              <Section title="الضمانات المطلوبة">
                <div className="grid grid-cols-2 gap-2">
                  {COLLATERAL_OPTIONS.map(item => (
                    <button
                      key={item}
                      onClick={() => toggleCollateral(item)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-colors text-right ${
                        data.collaterals.includes(item)
                          ? 'bg-navy-800 text-white border-navy-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-navy-400'
                      }`}
                    >
                      {data.collaterals.includes(item) ? '✓ ' : ''}{item}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="الاستيفاءات المطلوبة">
                <div className="space-y-2">
                  {FIXED_FULFILLMENTS.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => toggleFulfillment(item)}
                      className={`w-full text-sm px-3 py-2 rounded-lg border transition-colors text-right flex items-start gap-2 ${
                        data.fulfillments.includes(item)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <span className="flex-shrink-0 mt-0.5">{data.fulfillments.includes(item) ? '✓' : '○'}</span>
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="ملاحظات إضافية">
                <textarea
                  value={data.analyst_notes || ''}
                  onChange={e => set('analyst_notes', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
                  rows={4}
                  placeholder="أي ملاحظات إضافية من المحلل..."
                />
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex items-center gap-1 text-sm py-2 px-3">
                <ChevronRight size={14} />
                السابق
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary flex items-center gap-1 text-sm py-2 px-3">
                التالي
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-success flex items-center gap-2 text-sm"
          >
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
          </button>
        </div>
      </div>
    </div>
  )
}
