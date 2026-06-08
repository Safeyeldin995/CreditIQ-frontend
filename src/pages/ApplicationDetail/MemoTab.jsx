import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useToast } from '../../components/Toast'
import { CheckCircle, XCircle, RefreshCw, FileText, AlertTriangle } from 'lucide-react'

const FINAL_DECISIONS = [
  { key: 'approved', label: 'اعتماد', appStatus: 'approved', icon: CheckCircle, className: 'btn-success' },
  { key: 'approved_with_conditions', label: 'اعتماد بشروط', appStatus: 'approved', icon: AlertTriangle, className: 'btn-primary' },
  { key: 'rejected', label: 'رفض', appStatus: 'rejected', icon: XCircle, className: 'btn-danger' },
]

const STATUS_LABELS = {
  approved: 'تم الاعتماد',
  approved_with_conditions: 'تم الاعتماد بشروط',
  rejected: 'تم الرفض',
  pending_review: 'بانتظار القرار النهائي',
}

export default function MemoTab({ application, lang, onStatusChange }) {
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDecision, setConfirmDecision] = useState(null)
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
      .maybeSingle()
    if (data) {
      setDecision(data)
      clearInterval(pollingRef.current)
    }
    setLoading(false)
  }

  const handleFinalDecision = async () => {
    if (!confirmDecision) return
    if (notes.trim().length < 10) {
      toast(lang === 'ar' ? 'يجب كتابة ملاحظات القرار النهائي (10 أحرف على الأقل)' : 'Final decision notes required', 'error')
      return
    }
    setSaving(true)
    const [applicationResult, decisionResult] = await Promise.all([
      supabase.from('applications').update({ status: confirmDecision.appStatus }).eq('id', application.id),
      supabase.from('risk_decision').update({ status: confirmDecision.key, team_head_notes: notes }).eq('id', decision.id),
    ])
    if (applicationResult.error || decisionResult.error) {
      toast(lang === 'ar' ? 'تعذر حفظ القرار النهائي' : 'Unable to save final decision', 'error')
      setSaving(false)
      return
    }
    toast(lang === 'ar' ? 'تم حفظ القرار النهائي' : 'Final decision saved', 'success')
    setConfirmDecision(null)
    setSaving(false)
    await fetchDecision()
    onStatusChange?.()
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
        <p className="text-gray-400">{lang === 'ar' ? 'لم يتم توليد توصية AI بعد' : 'AI recommendation not generated yet'}</p>
        <button onClick={fetchDecision} className="btn-ghost mt-4 flex items-center gap-2">
          <RefreshCw size={14} />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>
    )
  }

  const isFinal = ['approved', 'approved_with_conditions', 'rejected'].includes(decision.status)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="font-bold text-blue-900 mb-2">
          {lang === 'ar' ? 'القرار النهائي بشري فقط' : 'Human final decision only'}
        </h3>
        <p className="text-sm text-blue-800 leading-7">
          {lang === 'ar'
            ? 'توصية AI استشارية ولا تمثل موافقة أو رفض. مسؤول أو مدير الائتمان هو صاحب القرار النهائي.'
            : 'AI output is advisory and is not an approval or rejection. The credit analyst or manager owns the final decision.'}
        </p>
      </div>

      <div className="card p-6">
        <h4 className="font-bold text-navy-800 mb-3">
          {lang === 'ar' ? 'ملاحظات القرار' : 'Decision Notes'}
        </h4>
        <textarea
          className="input-field mb-4 min-h-32 resize-none"
          placeholder={lang === 'ar' ? 'اكتب أسباب القرار النهائي والشروط إن وجدت... (مطلوب)' : 'Write final decision rationale and conditions if any... (required)'}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          dir="rtl"
          disabled={isFinal}
        />

        {!isFinal ? (
          <div className="grid grid-cols-3 gap-3">
            {FINAL_DECISIONS.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  onClick={() => setConfirmDecision(item)}
                  disabled={notes.trim().length < 10}
                  className={`${item.className} flex items-center gap-2 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className={`rounded-xl p-4 flex items-start gap-3 ${decision.status === 'rejected' ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            {decision.status === 'rejected'
              ? <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              : <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className={`font-bold ${decision.status === 'rejected' ? 'text-red-700' : 'text-emerald-700'}`}>
                {STATUS_LABELS[decision.status] || decision.status}
              </p>
              {decision.team_head_notes && <p className="text-sm text-gray-600 mt-1">{decision.team_head_notes}</p>}
            </div>
          </div>
        )}
      </div>

      {confirmDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" dir="rtl">
            <h3 className="text-xl font-bold text-navy-800 mb-3">تأكيد القرار النهائي</h3>
            <p className="text-gray-600 mb-2">القرار: {confirmDecision.label}</p>
            <p className="text-gray-600 mb-4">الملاحظات: {notes}</p>
            <div className="flex gap-3">
              <button onClick={handleFinalDecision} disabled={saving} className={`${confirmDecision.className} flex-1`}>
                {saving ? '...' : 'تأكيد'}
              </button>
              <button onClick={() => setConfirmDecision(null)} className="btn-ghost flex-1">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
