import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { AlertTriangle, CheckCircle, FileX, RefreshCw, ShieldAlert } from 'lucide-react'

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

function TextBlock({ title, children, tone = 'navy', icon: Icon = CheckCircle }) {
  const styles = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    navy: 'border-navy-100 bg-navy-50 text-navy-900',
  }
  return (
    <div className={`rounded-xl border p-5 ${styles[tone]}`}>
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
        <Icon size={15} /> {title}
      </h3>
      <div className="text-sm leading-7 whitespace-pre-wrap">{children || '—'}</div>
    </div>
  )
}

function ListBlock({ title, items, tone = 'navy', icon: Icon = CheckCircle }) {
  return (
    <TextBlock title={title} tone={tone} icon={Icon}>
      {items.length > 0 ? (
        <ul className="list-disc list-inside flex flex-col gap-1">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : '—'}
    </TextBlock>
  )
}

function confidenceValue(decision, creditMemo) {
  const summary = creditMemo.ai_summary || {}
  const raw = summary.confidence_score ?? decision.confidence_score ?? decision.confidence ?? creditMemo.confidence_score ?? creditMemo.confidence
  if (raw === null || raw === undefined || raw === '') return 'غير متاح'
  const num = Number(raw)
  if (Number.isNaN(num)) return raw
  return `${Math.round(num <= 1 ? num * 100 : num)}%`
}

export default function AnalysisTab({ application }) {
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
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
        <p className="text-gray-400 font-medium">لم يتم توليد توصية AI بعد</p>
        <p className="text-gray-300 text-sm mt-1">أكمل التقييم واضغط حفظ وتوليد التحليل</p>
        <button onClick={fetchDecision} className="btn-ghost mt-4 flex items-center gap-2">
          <RefreshCw size={14} />تحديث
        </button>
      </div>
    )
  }

  const creditMemo = parseJson(decision.credit_memo_data, {}) || {}
  const aiSummary = creditMemo.ai_summary || {}
  const summary = aiSummary.summary || decision.summary || '—'
  const strengths = aiSummary.strengths || decision.strengths
  const weaknesses = aiSummary.weaknesses || decision.weaknesses
  const risks = parseList(aiSummary.risks || decision.threats)
  const conditions = parseList(aiSummary.conditions || creditMemo.conditions || decision.conditions)
  const advisoryRecommendation = aiSummary.advisory_recommendation || decision.recommendation || '—'

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 text-sm">توصية AI استشارية فقط</h3>
            <p className="text-sm text-blue-800 mt-1 leading-7">
              الذكاء الاصطناعي لا يعتمد ولا يرفض. القرار النهائي دائماً قرار بشري من مسؤول أو مدير الائتمان.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">التوصية الاستشارية</p>
            <p className="font-bold text-navy-900">{advisoryRecommendation}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">درجة الثقة</p>
            <p className="font-bold text-navy-900">{confidenceValue(decision, creditMemo)}</p>
          </div>
        </div>
      </div>

      <TextBlock title="الملخص" tone="navy">
        {summary}
      </TextBlock>

      <TextBlock title="نقاط القوة" tone="emerald">
        {Array.isArray(strengths) ? strengths.join('\n') : strengths}
      </TextBlock>

      <TextBlock title="نقاط الضعف" tone="amber" icon={AlertTriangle}>
        {Array.isArray(weaknesses) ? weaknesses.join('\n') : weaknesses}
      </TextBlock>

      <ListBlock title="المخاطر" items={risks} tone="red" icon={AlertTriangle} />

      <ListBlock title="الشروط والاستيفاءات المقترحة" items={conditions} tone="navy" icon={CheckCircle} />
    </div>
  )
}
