import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, generateReferenceCode } from '../supabase'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'

const PRODUCT_TYPES = ['تمويل صغير', 'تمويل سمارت', 'تمويل متوسط']
const TENORS = [6, 12, 18, 24, 36]
const PURPOSES = ['شراء أصول ثابتة', 'تغطية تكاليف تشغيل ثابتة', 'شراء بضائع وخامات']

function getInterestRate(amount) {
  if (!amount) return null
  if (Number(amount) <= 1000000) return { rate: '23.5%', label: 'تمويل صغير' }
  return { rate: '22%', label: 'تمويل متوسط/سمارت' }
}

// Field wrapper defined OUTSIDE component to prevent focus loss on re-render
function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function NewApplication({ lang, onToggleLang, user }) {
  const [form, setForm] = useState({
    client_name_ar: '', client_name_en: '', national_id: '', date_of_birth: '',
    product_type: 'تمويل صغير', requested_amount: '', tenor_months: '12',
    branch: '', purpose: 'شراء بضائع وخامات', client_type: 'جديد'
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const interestInfo = getInterestRate(form.requested_amount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.national_id.length !== 14 || !/^\d+$/.test(form.national_id)) {
      toast(lang === 'ar' ? 'رقم البطاقة القومية يجب أن يكون 14 رقماً' : 'National ID must be 14 digits', 'error')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('applications').insert({
      ...form,
      requested_amount: Number(form.requested_amount),
      tenor_months: Number(form.tenor_months),
      reference_code: generateReferenceCode(),
      status: 'draft',
    }).select().single()

    if (error) {
      toast(lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving application', 'error')
    } else {
      toast(lang === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Application created successfully', 'success')
      navigate(`/application/${data.id}`)
    }
    setLoading(false)
  }

  const t = { title: lang === 'ar' ? 'طلب تمويل جديد' : 'New Application' }

  return (
    <Layout title={t.title} lang={lang} onToggleLang={onToggleLang} user={user}>
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
          <h2 className="section-title border-b border-gray-100 pb-4">
            {lang === 'ar' ? 'بيانات العميل' : 'Client Information'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label={lang === 'ar' ? 'اسم العميل بالعربي *' : 'Client Name (Arabic) *'}>
              <input className="input-field" required value={form.client_name_ar}
                onChange={e => set('client_name_ar', e.target.value)}
                placeholder={lang === 'ar' ? 'الاسم بالعربي' : 'Arabic name'} />
            </Field>
            <Field label={lang === 'ar' ? 'اسم العميل بالإنجليزي' : 'Client Name (English)'}>
              <input className="input-field" value={form.client_name_en}
                onChange={e => set('client_name_en', e.target.value)}
                placeholder="English name" dir="ltr" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={lang === 'ar' ? 'رقم البطاقة القومية *' : 'National ID *'}>
              <input className="input-field" required value={form.national_id}
                onChange={e => set('national_id', e.target.value.replace(/\D/g, '').slice(0, 14))}
                placeholder="14 رقم" dir="ltr" maxLength={14} />
              {form.national_id && form.national_id.length !== 14 && (
                <p className="text-red-500 text-xs mt-1">
                  {lang === 'ar' ? `${14 - form.national_id.length} رقم متبقي` : `${14 - form.national_id.length} digits remaining`}
                </p>
              )}
            </Field>
            <Field label={lang === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}>
              <input type="date" className="input-field" value={form.date_of_birth}
                onChange={e => set('date_of_birth', e.target.value)} dir="ltr" />
            </Field>
          </div>

          <h2 className="section-title border-b border-gray-100 pb-4 mt-2">
            {lang === 'ar' ? 'تفاصيل التمويل' : 'Financing Details'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label={lang === 'ar' ? 'نوع التمويل *' : 'Product Type *'}>
              <select className="input-field" value={form.product_type}
                onChange={e => set('product_type', e.target.value)}>
                {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label={lang === 'ar' ? 'نوع العميل' : 'Client Type'}>
              <select className="input-field" value={form.client_type}
                onChange={e => set('client_type', e.target.value)}>
                <option value="جديد">{lang === 'ar' ? 'جديد' : 'New'}</option>
                <option value="تجديد">{lang === 'ar' ? 'تجديد' : 'Renewal'}</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Field label={lang === 'ar' ? 'المبلغ المطلوب بالجنيه *' : 'Requested Amount (EGP) *'}>
                <input type="number" className="input-field" required value={form.requested_amount}
                  onChange={e => set('requested_amount', e.target.value)}
                  placeholder="0" min="1" />
              </Field>
              {interestInfo && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                  <span className="text-amber-800 font-semibold">
                    {lang === 'ar' ? `سعر الفائدة: ${interestInfo.rate} سنوياً` : `Interest Rate: ${interestInfo.rate} annually`}
                  </span>
                  <span className="text-amber-600 mx-2">|</span>
                  <span className="text-amber-700">
                    {lang === 'ar' ? 'الرسوم الإدارية: 1.5%' : 'Admin Fees: 1.5%'}
                  </span>
                </div>
              )}
            </div>
            <Field label={lang === 'ar' ? 'المدة بالشهور *' : 'Tenor (Months) *'}>
              <select className="input-field" value={form.tenor_months}
                onChange={e => set('tenor_months', e.target.value)}>
                {TENORS.map(t => <option key={t} value={t}>{t} {lang === 'ar' ? 'شهر' : 'months'}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={lang === 'ar' ? 'الفرع *' : 'Branch *'}>
              <input className="input-field" required value={form.branch}
                onChange={e => set('branch', e.target.value)}
                placeholder={lang === 'ar' ? 'اسم الفرع' : 'Branch name'} />
            </Field>
            <Field label={lang === 'ar' ? 'الغرض من التمويل' : 'Purpose'}>
              <select className="input-field" value={form.purpose}
                onChange={e => set('purpose', e.target.value)}>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex gap-3 mt-2 border-t border-gray-100 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading
                ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (lang === 'ar' ? 'إنشاء الطلب ورفع المستندات ←' : 'Create Application & Upload Documents →')
              }
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost px-6">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
