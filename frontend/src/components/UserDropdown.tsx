import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function UserDropdown() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  if (!user) return null
  const display = user.full_name || user.email
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-cream-100 hover:bg-cream-200 transition"
      >
        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
        <span className="hidden md:inline-block text-sm font-semibold text-stone-800">
          {display}
        </span>
        <span className="material-symbols-outlined text-stone-500 text-[18px] transition-transform group-hover:rotate-180">
          expand_more
        </span>
      </button>
      <div className="absolute right-0 top-full mt-2 w-52 py-2 bg-white rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50">
        <div className="px-4 py-2 border-b border-cream-200">
          <p className="text-sm font-semibold text-stone-800 truncate">
            {user.full_name || 'Học viên'}
          </p>
          <p className="text-xs text-stone-500 truncate">{user.email}</p>
        </div>
        <Link
          to={user.role === 'admin' ? '/admin/profile' : '/student/profile'}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-cream-100 transition"
        >
          <span className="material-symbols-outlined text-[18px] text-orange-700">
            account_circle
          </span>
          Thông tin cá nhân
        </Link>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Đăng xuất
        </button>
      </div>
    </div>
  )
}
