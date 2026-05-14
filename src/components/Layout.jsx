import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout({ children, title, lang, onToggleLang, user }) {
  return (
    <div className={`min-h-screen bg-gray-50`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar lang={lang} onToggleLang={onToggleLang} user={user} />
      <div className={lang === 'ar' ? 'mr-60' : 'ml-60'}>
        <TopBar title={title} lang={lang} />
        <main className="p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
