import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import StudentHeader from '@/components/StudentHeader'

interface LayoutProps {
  /** If true, do not wrap with nav bar (e.g. for auth pages and full-bleed landing) */
  bare?: boolean
}

export default function Layout({ bare = false }: LayoutProps) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (bare) {
    return <main className="min-h-screen"><Outlet /></main>
  }

  // Admin uses its own AdminLayout. Bare pages (auth, landing) have their own hero.
  // Student pages get the shared StudentHeader (logo + search + timer + user).
  // HomepageStudent tự render StudentHeader (vì có searchAutocomplete) → ẩn header chung.
  const isStudent = user?.role === 'student'
  const isHomepage =
    location.pathname === '/student/homepage'
  const showStudentHeader = isStudent && !isHomepage

  const containerClass = isStudent
    ? 'min-h-screen flex flex-col bg-[#FFFDF9] bg-landscape bg-fixed bg-no-repeat bg-center bg-cover'
    : 'min-h-screen flex flex-col bg-[#FFFDF9]'

  return (
    <div className={containerClass}>
      {showStudentHeader && <StudentHeader />}
      <main className="flex-1 w-full pb-16">
        <Outlet />
      </main>
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-cream-200 py-3 text-center text-xs text-stone-500 bg-white/95 backdrop-blur-md shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        🐱 Adaptive Learning · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
