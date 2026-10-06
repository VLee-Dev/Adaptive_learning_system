import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * AdminLayout: sidebar nav + top header for admin pages.
 * Mounted at /admin/* routes via <Route element={<AdminLayout/>}>.
 */
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const navItems = [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: '📊' },
    { to: '/admin/courses', label: 'Khóa học', icon: '📚' },
  ]

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-stone-200 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-200">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <img src="/images/icon.png" alt="logo" className="h-8 w-8" />
            <span className="font-bold text-stone-800">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-stone-700 hover:bg-stone-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-200 text-xs text-stone-500">
          <div className="font-semibold text-stone-700 mb-1">{user?.full_name || user?.email}</div>
          <div>Quản trị viên</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-stone-500">
            Xin chào, <span className="font-semibold text-stone-800">{user?.full_name || user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-stone-600 hover:text-orange-600">
              ← Về trang chính
            </Link>
            <button
              onClick={() => {
                logout()
                window.location.href = '/login'
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}