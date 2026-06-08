import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, DOC_TYPE_LABELS } from '../../supabase'
import { useToast } from '../../components/Toast'
import { Upload, FileText, XCircle, Eye, RefreshCw } from 'lucide-react'

export default function DocumentsTab({ application, lang }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

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
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')
        const storagePath = `${application.id}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file, { upsert: true })
        if (uploadError) throw new Error('Storage: ' + uploadError.message)

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath)

        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            application_id: application.id,
            document_type: 'other',
            file_url: urlData.publicUrl,
            file_path: storagePath,
            uploaded_at: new Date().toISOString(),
          })
        if (insertError) throw new Error(insertError.message)

        toast(lang === 'ar' ? `تم إرفاق ${file.name}` : `Attached ${file.name}`, 'success')
      } catch (err) {
        toast(`فشل رفع ${file.name}: ${err.message}`, 'error')
      }
    }

    await fetchDocuments()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleDeleteDoc = async (doc) => {
    await supabase.from('documents').delete().eq('id', doc.id)
    if (doc.file_path) await supabase.storage.from('documents').remove([doc.file_path])
    fetchDocuments()
    toast(lang === 'ar' ? 'تم حذف المرفق' : 'Attachment removed', 'success')
  }

  const handleChangeType = async (doc, newType) => {
    await supabase.from('documents').update({ document_type: newType }).eq('id', doc.id)
    fetchDocuments()
  }

  const handleViewDoc = (doc) => {
    if (!doc.file_url) return
    const a = document.createElement('a')
    a.href = doc.file_url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const getDisplayName = (doc) => {
    if (!doc.file_path) return 'attachment'
    const fileName = doc.file_path.split('/').pop() || ''
    const withoutTimestamp = fileName.replace(/^\d+_/, '').replace(/_/g, ' ').trim()
    return withoutTimestamp || fileName
  }

  return (
    <div className="flex flex-col gap-6">
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
              {lang === 'ar' ? 'اسحب وأفلت المرفقات هنا أو اضغط للاختيار' : 'Drop attachments here or click to select'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {lang === 'ar' ? 'المستندات مرفقات فقط للرجوع إليها' : 'Documents are reference attachments only'}
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

      {documents.length > 0 && (
        <div className="bg-navy-50 rounded-xl px-5 py-3 text-sm text-navy-600">
          {lang === 'ar' ? `${documents.length} مرفق` : `${documents.length} attachments`}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>{lang === 'ar' ? 'لا توجد مرفقات بعد' : 'No attachments yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {documents.map(doc => {
            const typeLabel = DOC_TYPE_LABELS[doc.document_type] || DOC_TYPE_LABELS.other
            const displayName = getDisplayName(doc)
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
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={doc.document_type || 'other'}
                      onChange={e => handleChangeType(doc, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white flex-1"
                    >
                      {Object.entries(DOC_TYPE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{lang === 'ar' ? val.ar : val.en}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewDoc(doc) }}
                      className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0 p-1 rounded"
                      title={lang === 'ar' ? 'عرض المرفق' : 'View attachment'}
                    >
                      <Eye size={15} />
                    </button>
                  </div>
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
