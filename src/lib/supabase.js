import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tegpyrhhvxffdteslpdr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3B5cmhodnhmZmR0ZXNscGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzY0MDksImV4cCI6MjA5NDA1MjQwOX0.eWOmAZXreCPqoXt4PADtPF3XG1orR8V2Aa7Nrb5gigk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const N8N_WEBHOOK = 'https://primary-production-82778.up.railway.app/webhook/creditiq-upload'

export function detectDocType(filename) {
  const f = filename.toLowerCase()
  if (f.includes('iscore') || f.includes('ايسكور') || f.includes('ايسكر') || f.includes('i-score') || f.includes('score') || f.includes('سكور')) return 'iscore_client'
  if (f.includes('bank') || f.includes('بنك') || f.includes('حساب') || f.includes('statement') || f.includes('كشف') || f.includes('رصيد') || f.includes('بنكي')) return 'bank_statement_business'
  if (f.includes('field') || f.includes('استعلام') || f.includes('ميداني') || f.includes('زيارة') || f.includes('معاينة')) return 'field_investigation'
  if (f.includes('credit') || f.includes('ائتمانية') || f.includes('دراسة') || f.includes('ائتمان')) return 'credit_study'
  if (f.includes('register') || f.includes('سجل') || f.includes('تجاري')) return 'commercial_register'
  if (f.includes('tax') || f.includes('ضريب') || f.includes('ضرائب')) return 'tax_card'
  if (f.includes('invoice') || f.includes('فاتور') || f.includes('فواتير') || f.includes('مبيعات')) return 'invoices'
  if (f.includes('financial') || f.includes('مالية') || f.includes('قوائم') || f.includes('ميزانية') || f.includes('ارباح') || f.includes('خسائر')) return 'financial_statements'
  if (f.includes('protest') || f.includes('بروتستو')) return 'protest_certificate'
  if (f.includes('bankrupt') || f.includes('افلاس') || f.includes('إفلاس')) return 'bankruptcy_declaration'
  if (f.includes('pledge') || f.includes('رهن') || f.includes('حيازي')) return 'possessory_pledge'
  return 'other'
}

export const DOC_TYPE_LABELS = {
  iscore_client: { ar: 'الايسكور — العميل', en: 'I-Score Client' },
  bank_statement_business: { ar: 'كشف الحساب البنكي للنشاط', en: 'Business Bank Statement' },
  field_investigation: { ar: 'تقرير الاستعلام الميداني', en: 'Field Investigation' },
  credit_study: { ar: 'الدراسة الائتمانية', en: 'Credit Study' },
  commercial_register: { ar: 'السجل التجاري', en: 'Commercial Register' },
  tax_card: { ar: 'البطاقة الضريبية', en: 'Tax Card' },
  invoices: { ar: 'الفواتير وما يفيد المبيعات', en: 'Invoices & Sales' },
  financial_statements: { ar: 'القوائم المالية', en: 'Financial Statements' },
  protest_certificate: { ar: 'شهادة بروتستو', en: 'Protest Certificate' },
  bankruptcy_declaration: { ar: 'بيان عدم الإفلاس', en: 'Bankruptcy Declaration' },
  possessory_pledge: { ar: 'عقد الرهن الحيازي', en: 'Possessory Pledge' },
  other: { ar: 'مستند آخر', en: 'Other Document' },
}

export const STATUS_LABELS = {
  draft: { ar: 'مسودة', en: 'Draft', color: 'bg-gray-100 text-gray-700' },
  under_review: { ar: 'قيد الدراسة', en: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  pending_approval: { ar: 'بانتظار الاعتماد', en: 'Pending Approval', color: 'bg-amber-100 text-amber-700' },
  approved: { ar: 'معتمد', en: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: 'bg-red-100 text-red-700' },
}

export const GRADE_COLORS = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-green-500 text-white',
  C: 'bg-yellow-400 text-gray-900',
  D: 'bg-orange-500 text-white',
  E: 'bg-red-500 text-white',
  F: 'bg-red-900 text-white',
}

export function formatAmount(amount) {
  if (!amount) return '—'
  return Number(amount).toLocaleString('ar-EG') + ' جنيه'
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function generateReferenceCode() {
  const year = new Date().getFullYear()
  const num = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `MBI-${year}-${num}`
}
