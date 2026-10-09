import { NavLink, Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

/**
 * AdminLayout: sidebar nav + minimal top bar for admin pages.
 * Mounted at /admin/* routes via <Route element={<AdminLayout/>}>.
 *
 * - No "back to main site" link: admin only lives here.
 * - No "Quản trị" duplicate nav: the sidebar already shows it.
 * - No extra "Dashboard" link in the top bar: the brand logo + sidebar handle it.
 * - Responsive: sidebar collapses into a slide-out drawer on <md.
 */
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: '📊' },
    { to: '/admin/courses', label: 'Khóa học', icon: '📚' },
  ]

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (drawer on mobile, fixed on >=md) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-stone-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto
        `}
      >
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <Link
            to="/admin/dashboard"
            onClick={closeDrawer}
            className="flex items-center gap-2"
          >
            <img src="/images/icon.png" alt="logo" className="h-8 w-8" />
            <span className="font-bold text-stone-800">Admin Panel</span>
          </Link>
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={closeDrawer}
            className="md:hidden p-1 text-stone-500 hover:text-stone-800"
            aria-label="Đóng menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
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
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
              aria-label="Mở menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="text-sm text-stone-500 truncate">
              Xin chào,{' '}
              <span className="font-semibold text-stone-800">
                {user?.full_name || user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              window.location.href = '/login'
            }}
            className="text-sm text-stone-600 hover:text-red-600 px-2 py-1 rounded hover:bg-stone-100"
          >
            Đăng xuất
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}