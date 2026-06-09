import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tegpyrhhvxffdteslpdr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3B5cmhodnhmZmR0ZXNscGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzY0MDksImV4cCI6MjA5NDA1MjQwOX0.eWOmAZXreCPqoXt4PADtPF3XG1orR8V2Aa7Nrb5gigk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const N8N_ANALYZE_WEBHOOK = 'https://primary-production-82778.up.railway.app/webhook/creditiq-analyze'

export const DOC_TYPE_LABELS = {
  national_id: { ar: 'بطاقة الرقم القومي', en: 'National ID' },
  iscore_client: { ar: 'تقرير الايسكور', en: 'I-Score Report' },
  bank_statement_business: { ar: 'كشف الحساب البنكي', en: 'Bank Statement' },
  field_investigation: { ar: 'تقرير الزيارة الميدانية', en: 'Site Visit Report' },
  credit_study: { ar: 'ملف الدراسة', en: 'Assessment File' },
  commercial_register: { ar: 'السجل التجاري', en: 'Commercial Register' },
  tax_card: { ar: 'البطاقة الضريبية', en: 'Tax Card' },
  guarantor_documents: { ar: 'مستندات الضامنين', en: 'Guarantor Documents' },
  invoices: { ar: 'فواتير ومستندات مبيعات', en: 'Invoices & Sales Documents' },
  financial_statements: { ar: 'مستندات مالية', en: 'Financial Documents' },
  ownership_documents: { ar: 'مستندات ملكية', en: 'Ownership Documents' },
  collateral_documents: { ar: 'مستندات ضمان', en: 'Collateral Documents' },
  protest_certificate: { ar: 'شهادة بروتستو', en: 'Protest Certificate' },
  bankruptcy_declaration: { ar: 'بيان عدم الإفلاس', en: 'Bankruptcy Declaration' },
  possessory_pledge: { ar: 'عقد الرهن الحيازي', en: 'Possessory Pledge' },
  other: { ar: 'مرفق آخر', en: 'Other Attachment' },
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
