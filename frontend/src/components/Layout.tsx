import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface LayoutProps {
  children: React.ReactNode
  /** If true, do not wrap with nav bar (e.g. for auth pages) */
  bare?: boolean
}

export default function Layout({ children, bare = false }: LayoutProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (bare) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link to={user?.role === 'admin' ? '/admin/courses' : '/student/dashboard'} className="text-xl font-bold text-brand-700">
          Adaptive Learning
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <NavLink
                to={user.role === 'admin' ? '/admin/courses' : '/student/dashboard'}
                className={({ isActive }) => (isActive ? 'text-brand-700 font-semibold' : 'text-gray-700 hover:text-brand-700')}
              >
                {user.role === 'admin' ? 'Admin' : 'Học tập'}
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => (isActive ? 'text-brand-700 font-semibold' : 'text-gray-700 hover:text-brand-700')}
              >
                {user.full_name || user.email}
              </NavLink>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-red-600">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="text-gray-700 hover:text-brand-700">
                Đăng nhập
              </NavLink>
              <NavLink to="/register" className="text-gray-700 hover:text-brand-700">
                Đăng ký
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  )
}
