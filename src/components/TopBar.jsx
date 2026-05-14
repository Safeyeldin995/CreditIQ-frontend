import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase, GRADE_COLORS, formatDate } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function TopBar({ title, lang }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  async function markAsRead(notification) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
    setShowDropdown(false)
    if (notification.application_id) {
      navigate(`/application/${notification.application_id}`)
    }
    fetchNotifications()
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)
    fetchNotifications()
  }

  return (
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 no-print" dir="rtl">
      <h1 className="page-title">{title}</h1>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell size={20} className="text-navy-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-bold text-navy-800 text-sm">
                {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                    {lang === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                  </button>
                )}
                <button onClick={() => setShowDropdown(false)}>
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  {lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n)}
                    className={`w-full text-right p-4 border-b border-gray-50 hover:bg-amber-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-navy-800 leading-relaxed">{n.message}</p>
                        {n.risk_grade && (
                          <span className={`badge mt-1 ${GRADE_COLORS[n.risk_grade] || 'bg-gray-100 text-gray-700'}`}>
                            {lang === 'ar' ? 'درجة المخاطر' : 'Grade'}: {n.risk_grade}
                          </span>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
