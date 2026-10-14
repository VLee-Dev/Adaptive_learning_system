import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import StudyTimerBadge from '@/components/StudyTimerBadge'
import UserDropdown from '@/components/UserDropdown'

interface StudentHeaderProps {
  /** Search query controlled by parent. */
  search?: string
  onSearchChange?: (s: string) => void
}

/**
 * Sticky top header dùng chung cho mọi trang student.
 * Logo (icon + Adaptive Learning) + Khóa học + search (optional) + timer + user.
 */
export default function StudentHeader({ search, onSearchChange }: StudentHeaderProps) {
  const user = useAuthStore((s) => s.user)
  const showSearch = search !== undefined && onSearchChange !== undefined

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-cream-200 shadow-sm">
      <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/student/homepage" className="flex items-center gap-2 shrink-0 group">
          <img
            src="/images/icon.png"
            alt="Adaptive Learning"
            className="h-10 w-10 object-contain"
          />
          <span className="text-lg sm:text-xl font-bold text-orange-700 leading-none tracking-tight">
            Adaptive Learning
          </span>
        </Link>

        {/* Search (optional) */}
        {showSearch && (
          <div className="flex-1 max-w-xl mx-4 hidden sm:block">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-stone-400 text-[20px] pointer-events-none">
                search
              </span>
              <input
                className="w-full h-11 pl-11 pr-4 rounded-full bg-cream-100 text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-300 transition-all"
                placeholder="Tìm kiếm khóa học, bài học, chủ đề..."
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Right: timer + user */}
        <div className="flex items-center gap-3 shrink-0">
          {user && <StudyTimerBadge />}
          {user && <UserDropdown />}
        </div>
      </div>
    </header>
  )
}
