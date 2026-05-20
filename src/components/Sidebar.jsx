import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, FilePlus, Briefcase, Settings, LogOut, Globe2 } from 'lucide-react'
import { supabase } from '../supabase'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, ar: 'لوحة التحكم', en: 'Dashboard' },
  { path: '/new-application', icon: FilePlus, ar: 'طلب جديد', en: 'New Application' },
  { path: '/portfolio', icon: Briefcase, ar: 'المحفظة', en: 'Portfolio' },
  { path: '/settings', icon: Settings, ar: 'الإعدادات', en: 'Settings' },
]

export default function Sidebar({ lang, onToggleLang, user }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="fixed top-0 right-0 h-screen w-60 bg-navy-950 flex flex-col z-40 no-print" dir="rtl">
      {/* Logo */}
      <div className="p-6 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center text-lg">
            🌍
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">المبادرة</div>
            <div className="text-navy-400 text-xs">El-Mobadara</div>
          </div>
        </div>
        <div className="mt-2 text-navy-500 text-xs">ترخيص FRA رقم 1245</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`sidebar-link w-full text-right ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              <item.icon size={18} />
              <span>{lang === 'ar' ? item.ar : item.en}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-navy-800 flex flex-col gap-2">
        <button
          onClick={onToggleLang}
          className="sidebar-link sidebar-link-inactive w-full text-right"
        >
          <Globe2 size={18} />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>
        <div className="text-navy-400 text-xs px-4 py-1 truncate">{user?.email}</div>
        <button
          onClick={handleSignOut}
          className="sidebar-link sidebar-link-inactive w-full text-right text-red-400 hover:bg-red-900/30"
        >
          <LogOut size={18} />
          <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  )
}
