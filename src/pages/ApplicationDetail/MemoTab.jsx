import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Printer, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react'

export default function MemoTab({ application, lang, onStatusChange }) {
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(null) // 'approve' | 'reject'
  const toast = useToast()
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

  const handleDecision = async (type) => {
    if (notes.trim().length < 10) {
      toast(lang === 'ar' ? 'يجب كتابة ملاحظات (10 أحرف على الأقل)' : 'Notes required (min 10 characters)', 'error')
      return
    }
    setApproving(true)
    const newStatus = type === 'approve' ? 'approved' : 'rejected'
    await Promise.all([
      supabase.from('applications').update({ status: newStatus }).eq('id', application.id),
      supabase.from('risk_decision').update({ status: newStatus, team_head_notes: notes }).eq('id', decision.id),
    ])
    toast(
      lang === 'ar'
        ? (type === 'approve' ? 'تم اعتماد القرار بنجاح ✓' : 'تم رفض الطلب')
        : (type === 'approve' ? 'Decision approved ✓' : 'Application rejected'),
      type === 'approve' ? 'success' : 'warning'
    )
    setShowConfirm(null)
    setApproving(false)
    onStatusChange?.()
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-navy-400 mr-3" />
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText size={48} className="text-gray-200 mb-4" />
        <p className="text-gray-400">{lang === 'ar' ? 'لم يتم توليد جواب المخاطر بعد' : 'Risk memo not generated yet'}</p>
        <button onClick={fetchDecision} className="btn-ghost mt-4 flex items-center gap-2">
          <RefreshCw size={14} />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Print header - only visible when printing */}
      <div className="hidden print-only">
        <div className="text-center mb-6 border-b-2 border-navy-900 pb-4">
          <div className="text-4xl mb-2">🌍</div>
          <h1 className="text-2xl font-black">جمعية المبادرة لتنمية المجتمعات المحلية والمشروعات الصغيرة</h1>
          <p className="text-sm">المشهرة برقم 409 لسنة 2018 — ترخيص هيئة الرقابة المالية رقم 1245</p>
          <p className="text-sm mt-1">رقم الملف: {application.reference_code} — التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      {/* Action bar - hidden when printing */}
      <div className="flex items-center justify-between no-print">
        <h3 className="section-title">
          {lang === 'ar' ? 'جواب المخاطر الرسمي' : 'Official Risk Memo'}
        </h3>
        <button onClick={handlePrint} className="btn-ghost flex items-center gap-2">
          <Printer size={16} />
          {lang === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      {/* Memo content */}
      <div className="card p-8 memo-content" dir="rtl">
        <pre className="whitespace-pre-wrap font-cairo text-sm leading-8 text-navy-800">
          {decision.generated_memo || lang === 'ar' ? 'لا يوجد محتوى' : 'No content'}
        </pre>
      </div>

      {/* Approval section - hidden when printing */}
      {decision.status === 'pending_review' && (
        <div className="card p-6 no-print">
          <h4 className="font-bold text-navy-800 mb-3">
            {lang === 'ar' ? 'قرار الاعتماد' : 'Approval Decision'}
          </h4>
          <textarea
            className="input-field mb-4 min-h-24 resize-none"
            placeholder={lang === 'ar' ? 'اكتب ملاحظاتك هنا... (مطلوب — 10 أحرف على الأقل)' : 'Write your notes here... (required, min 10 characters)'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            dir="rtl"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm('approve')}
              disabled={notes.trim().length < 10}
              className="btn-success flex items-center gap-2 flex-1 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={18} />
              {lang === 'ar' ? 'اعتماد القرار' : 'Approve Decision'}
            </button>
            <button
              onClick={() => setShowConfirm('reject')}
              disabled={notes.trim().length < 10}
              className="btn-danger flex items-center gap-2 flex-1 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={18} />
              {lang === 'ar' ? 'رفض الطلب' : 'Reject Application'}
            </button>
          </div>
        </div>
      )}

      {/* Status badge if already decided */}
      {decision.status !== 'pending_review' && (
        <div className={`card p-4 no-print flex items-center gap-3 ${decision.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {decision.status === 'approved'
            ? <CheckCircle size={20} className="text-emerald-600" />
            : <XCircle size={20} className="text-red-600" />
          }
          <div>
            <p className={`font-bold ${decision.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
              {lang === 'ar'
                ? (decision.status === 'approved' ? 'تم اعتماد القرار' : 'تم رفض الطلب')
                : (decision.status === 'approved' ? 'Decision Approved' : 'Application Rejected')
              }
            </p>
            {decision.team_head_notes && (
              <p className="text-sm text-gray-600 mt-1">{decision.team_head_notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" dir="rtl">
            <h3 className="text-xl font-bold text-navy-800 mb-3">
              {showConfirm === 'approve'
                ? (lang === 'ar' ? 'تأكيد الاعتماد' : 'Confirm Approval')
                : (lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection')
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {lang === 'ar' ? 'الملاحظات: ' : 'Notes: '}{notes}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision(showConfirm)}
                disabled={approving}
                className={showConfirm === 'approve' ? 'btn-success flex-1' : 'btn-danger flex-1'}
              >
                {approving ? '...' : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
              <button onClick={() => setShowConfirm(null)} className="btn-ghost flex-1">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
