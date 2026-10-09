import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface LayoutProps {
  /** If true, do not wrap with nav bar (e.g. for auth pages and full-bleed landing) */
  bare?: boolean
}

export default function Layout({ bare = false }: LayoutProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

    if (bare) {
    return <main className="min-h-screen"><Outlet /></main>
  }

  // The landscaping background is reserved for the student learning pages.
  // Admin uses its own AdminLayout (no background) and bare pages (auth, landing)
  // have their own hero styling.
  const isStudent = user?.role === 'student'
  const containerClass = isStudent
    ? 'min-h-screen flex flex-col bg-[#FFFDF9] bg-landscape bg-fixed bg-no-repeat bg-center bg-cover'
    : 'min-h-screen flex flex-col bg-[#FFFDF9]'

  return (
    <div className={containerClass}>
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#FFFDF9]/80 border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} className="flex items-center gap-2 text-xl font-bold text-orange-700">
            <img src="/images/icon.png" alt="Adaptive Learning" className="h-8 w-8 object-contain" />
            <span>Adaptive Learning</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-sm font-semibold">
            {user?.role === 'student' && (
              <NavLink
                to="/student/courses"
                className={({ isActive }) =>
                  isActive ? 'text-orange-700' : 'text-stone-700 hover:text-orange-600 transition'
                }
              >
                Khóa học
              </NavLink>
            )}
            {user ? (
              <>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    isActive ? 'text-orange-700' : 'text-stone-700 hover:text-orange-600 transition'
                  }
                >
                  {user.full_name || user.email}
                </NavLink>
                <button onClick={handleLogout} className="text-sm text-stone-600 hover:text-red-600">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="text-stone-700 hover:text-orange-600 transition">
                  Đăng nhập
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition shadow-sm"
                >
                  Đăng ký
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      <footer className="border-t border-cream-200 py-4 text-center text-xs text-stone-500">
        🐱 Adaptive Learning · {new Date().getFullYear()}
      </footer>
    </div>
  )
}