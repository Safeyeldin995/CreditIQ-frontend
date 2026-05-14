import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, detectDocType, DOC_TYPE_LABELS, N8N_WEBHOOK } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Upload, FileText, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw, Zap } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'بانتظار المعالجة', labelEn: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-600' },
  processing: { label: 'جاري المعالجة', labelEn: 'Processing', icon: Clock, color: 'bg-yellow-100 text-yellow-700', pulse: true },
  completed: { label: 'تم الاستخراج', labelEn: 'Extracted', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'فشل', labelEn: 'Failed', icon: XCircle, color: 'bg-red-100 text-red-700' },
}

export default function DocumentsTab({ application, lang }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const fileInputRef = useRef(null)
  const toast = useToast()
  const pollingRef = useRef(null)

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', application.id)
      .order('uploaded_at', { ascending: false })
    if (data) setDocuments(data)
  }, [application.id])

  useEffect(() => {
    fetchDocuments()
    pollingRef.current = setInterval(fetchDocuments, 5000)
    return () => clearInterval(pollingRef.current)
  }, [fetchDocuments])

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return

    const ALLOWED = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp']
    const validFiles = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!ALLOWED.includes(ext)) {
        toast(lang === 'ar' ? 'لا يمكن رفع ' + f.name + ' — يُقبل PDF والصور فقط' : 'Cannot upload ' + f.name + ' — PDF and images only', 'error')
        return false
      }
      return true
    })
    if (validFiles.length === 0) return
    setUploading(true)

    for (const file of validFiles) {
      const fileId = `${Date.now()}_${file.name}`
      setUploadProgress(p => ({ ...p, [fileId]: 'uploading' }))

      try {
        // Use timestamp-only path to avoid Arabic/special characters in storage
        const ext = file.name.split('.').pop().toLowerCase() || 'pdf'
        const storagePath = `${application.id}/${Date.now()}.${ext}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file, { upsert: true })

        if (uploadError) throw new Error('Storage: ' + uploadError.message)

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath)

        const docType = detectDocType(file.name)

        // Insert document record
        const { data: docData, error: insertError } = await supabase
          .from('documents')
          .insert({
            application_id: application.id,
            document_type: docType,
            file_url: urlData.publicUrl,
            file_path: storagePath,
            ocr_status: 'pending',
            uploaded_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (insertError) throw new Error(insertError.message)

        // Fire n8n webhook (non-blocking)
        fetch(N8N_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: application.id,
            document_id: docData.id,
            file_path: storagePath,
            document_type: docType,
          }),
        }).catch(() => {})

        setUploadProgress(p => ({ ...p, [fileId]: 'done' }))
        toast(
          lang === 'ar'
            ? `تم رفع ${file.name} وبدأ التحليل`
            : `Uploaded ${file.name} — analysis started`,
          'success'
        )
      } catch (err) {
        setUploadProgress(p => ({ ...p, [fileId]: 'error' }))
        toast(`فشل رفع ${file.name}: ${err.message}`, 'error')
      }
    }

    await fetchDocuments()
    setUploading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleAnalyzeAll = async () => {
    const completedDocs = documents.filter(d => d.ocr_status === 'completed')
    if (completedDocs.length === 0) return

    for (const doc of completedDocs) {
      fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: application.id,
          document_id: doc.id,
          file_path: doc.file_path,
          document_type: doc.document_type,
        }),
      }).catch(() => {})
    }

    // Update application status
    await supabase
      .from('applications')
      .update({ status: 'under_review' })
      .eq('id', application.id)

    toast(
      lang === 'ar' ? 'تم إرسال الملفات للتحليل — سيظهر القرار في تبويب التحليل' : 'Files sent for AI analysis',
      'success'
    )
  }

  const handleDeleteDoc = async (doc) => {
    await supabase.from('documents').delete().eq('id', doc.id)
    if (doc.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path])
    }
    fetchDocuments()
    toast(lang === 'ar' ? 'تم حذف المستند' : 'Document removed', 'success')
  }

  const handleChangeType = async (doc, newType) => {
    await supabase.from('documents').update({ document_type: newType }).eq('id', doc.id)
    fetchDocuments()
  }

  const completedCount = documents.filter(d => d.ocr_status === 'completed').length
  const processingCount = documents.filter(d => d.ocr_status === 'pending' || d.ocr_status === 'processing').length

  return (
    <div className="flex flex-col gap-6">
      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-navy-200 rounded-xl p-10 text-center cursor-pointer hover:border-gold-500 hover:bg-amber-50 transition-all duration-200 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-navy-100 group-hover:bg-gold-100 flex items-center justify-center transition-colors">
            <Upload size={24} className="text-navy-500 group-hover:text-gold-600" />
          </div>
          <div>
            <p className="font-bold text-navy-700 text-base">
              {lang === 'ar' ? 'اسحب وأفلت المستندات هنا أو اضغط للاختيار' : 'Drop documents here or click to select'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {lang === 'ar' ? 'يقبل ملفات PDF والصور — يمكن رفع عدة ملفات دفعة واحدة' : 'Accepts PDF and images — multiple files supported'}
            </p>
            <p className="text-amber-600 text-xs mt-1 font-medium">
              {lang === 'ar' ? '✓ يدعم الأسماء بالعربي والمسافات' : '✓ Supports Arabic names and spaces'}
            </p>
          </div>
        </div>
        {uploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">{lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
          </div>
        )}
      </div>

      {/* Status summary */}
      {documents.length > 0 && (
        <div className="flex items-center justify-between bg-navy-50 rounded-xl px-5 py-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy-600">
              {lang === 'ar' ? `${documents.length} مستند مرفوع` : `${documents.length} documents`}
            </span>
            {completedCount > 0 && (
              <span className="text-emerald-600 font-semibold">
                {lang === 'ar' ? `${completedCount} تم تحليله` : `${completedCount} analyzed`}
              </span>
            )}
            {processingCount > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                {lang === 'ar' ? `${processingCount} قيد المعالجة` : `${processingCount} processing`}
              </span>
            )}
          </div>
          {completedCount > 0 && (
            <button onClick={handleAnalyzeAll} className="btn-primary flex items-center gap-2 text-xs py-2">
              <Zap size={14} />
              {lang === 'ar' ? 'توليد التحليل الائتماني' : 'Generate AI Analysis'}
            </button>
          )}
        </div>
      )}

      {/* Document cards */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>{lang === 'ar' ? 'لم يتم رفع أي مستندات بعد' : 'No documents uploaded yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {documents.map(doc => {
            const typeLabel = DOC_TYPE_LABELS[doc.document_type] || DOC_TYPE_LABELS.other
            const statusCfg = STATUS_CONFIG[doc.ocr_status] || STATUS_CONFIG.pending
            const StatusIcon = statusCfg.icon
            const displayName = doc.file_path?.split('/').pop()?.replace(/^\d+_/, '').replace(/_/g, ' ') || 'document'

            return (
              <div key={doc.id} className="card p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-800 text-sm">
                    {lang === 'ar' ? typeLabel.ar : typeLabel.en}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5 truncate" title={displayName}>
                    {displayName}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`badge flex items-center gap-1 ${statusCfg.color} ${statusCfg.pulse ? 'animate-pulse-slow' : ''}`}>
                      <StatusIcon size={10} />
                      {lang === 'ar' ? statusCfg.label : statusCfg.labelEn}
                    </span>
                    {doc.confidence_score && (
                      <span className="text-xs text-gray-400">
                        {Math.round(doc.confidence_score * 100)}%
                      </span>
                    )}
                  </div>
                  <select
                    value={doc.document_type}
                    onChange={e => handleChangeType(doc, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="mt-2 text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white w-full"
                  >
                    {Object.entries(DOC_TYPE_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>{lang === 'ar' ? val.ar : val.en}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc) }}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded"
                  title={lang === 'ar' ? 'حذف' : 'Delete'}
                >
                  <XCircle size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

