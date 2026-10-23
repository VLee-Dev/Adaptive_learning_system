import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { courseApi, type CourseSummary, toApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { resolveImageUrl } from '@/lib/api'
import StudentHeader from '@/components/StudentHeader'
import MonthlyStreakCalendar from '@/components/MonthlyStreakCalendar'
import EnrolledCoursesSlider from '@/components/EnrolledCoursesSlider'

// ----- Helpers ---------------------------------------------------------------
function greetingByHour(date = new Date()): { text: string; emoji: string } {
  const h = date.getHours()
  if (h >= 5 && h < 11) return { text: 'Chào buổi sáng', emoji: '☀️' }
  if (h >= 11 && h < 13) return { text: 'Chào buổi trưa', emoji: '🌤️' }
  if (h >= 13 && h < 18) return { text: 'Chào buổi chiều', emoji: '☕' }
  return { text: 'Chào buổi tối', emoji: '🌙' }
}

// ----- Sub-components --------------------------------------------------------

/** Greeting section — chào theo giờ trong ngày */
function GreetingSection({ name }: { name: string }) {
  const { text, emoji } = greetingByHour()
  return (
    <section className="flex items-center gap-4 bg-cream-100/90 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-sm border border-cream-200 relative overflow-hidden">
      <div className="absolute -right-8 -bottom-10 pointer-events-none opacity-10 select-none text-orange-600">
        <span className="material-symbols-outlined text-[180px]">pets</span>
      </div>
      <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md relative z-10">
        <span className="material-symbols-outlined text-[28px]">waving_hand</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 tracking-tight relative z-10">
        {text}, {name}! {emoji}
      </h1>
    </section>
  )
}

/** Search autocomplete dropdown (lọc từ list courses public) */
function SearchAutocomplete({
  query,
  results,
  onPick,
}: {
  query: string
  results: CourseSummary[]
  onPick: (id: number) => void
}) {
  if (!query || query.trim().length < 2) return null
  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-cream-200 shadow-lg p-4 z-40">
        <p className="text-sm text-stone-500 text-center">Không tìm thấy khóa học phù hợp.</p>
      </div>
    )
  }
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-cream-200 shadow-lg overflow-hidden z-40 max-h-96 overflow-y-auto">
      {results.slice(0, 6).map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className="w-full flex items-center gap-3 p-3 hover:bg-cream-100 transition text-left"
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-100 shrink-0">
            {c.image_url ? (
              <img
                src={resolveImageUrl(c.image_url) ?? ''}
                alt={c.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 line-clamp-1">{c.name}</p>
            <p className="text-xs text-stone-500 line-clamp-1">
              {c.enrollment_count} học viên · {c.is_enrolled ? '✓ Đã đăng ký' : 'Chưa đăng ký'}
            </p>
          </div>
          <span className="material-symbols-outlined text-stone-400 text-[18px]">arrow_forward</span>
        </button>
      ))}
    </div>
  )
}

/** Card nhỏ cho "Các khóa học nổi bật" (4-card grid) */
function FeaturedCourseCard({ course }: { course: CourseSummary }) {
  return (
    <div className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="relative h-44 w-full overflow-hidden">
          {course.image_url ? (
            <img
              src={resolveImageUrl(course.image_url) ?? ''}
              alt={course.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white text-6xl">
              🎓
            </div>
          )}
          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-0.5 rounded-lg bg-stone-800/75 text-white text-xs font-semibold">
              {course.enrollment_count} học viên
            </span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <h3 className="text-base font-semibold text-stone-800 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
            {course.name}
          </h3>
          <p className="text-xs text-stone-600 line-clamp-2 min-h-[2.5rem]">
            {course.description || 'Khám phá khóa học hấp dẫn này ngay hôm nay.'}
          </p>
        </div>
      </div>
      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-cream-200 flex items-center justify-between gap-2">
          {course.is_enrolled ? (
            <>
              <span
                className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold"
                title="Bạn đã đăng ký khóa học này"
              >
                ✓ Đã đăng ký
              </span>
              <Link
                to={`/student/courses/${course.id}`}
                className="text-sm font-semibold text-orange-700 hover:text-orange-600 flex items-center gap-1 transition-colors"
                title="Vào học ngay"
              >
                Vào học
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to={`/courses/${course.id}`}
                className="px-4 py-1.5 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition shadow-sm"
              >
                Đăng ký
              </Link>
              <Link
                to={`/courses/${course.id}`}
                className="text-sm font-semibold text-orange-700 hover:text-orange-600 flex items-center gap-1 transition-colors"
              >
                Xem chi tiết
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ----- Main page -------------------------------------------------------------
export default function HomepageStudent() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [enrolled, setEnrolled] = useState<CourseSummary[]>([])
  const [allCourses, setAllCourses] = useState<CourseSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const displayName = user?.full_name?.split(' ').slice(-1)[0] || user?.email?.split('@')[0] || 'bạn'

  useEffect(() => {
    setLoading(true)
    courseApi
      .list()
      .then((publicList) => {
        const enrolled = publicList.filter((c) => c.is_enrolled)
        const notEnrolled = publicList.filter((c) => !c.is_enrolled)
        setEnrolled(enrolled)
        setAllCourses(notEnrolled)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return allCourses
      .concat(enrolled)
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [search, allCourses, enrolled])

  const featured = allCourses.slice(0, 4)

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Fixed background (landscaping) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src="/images/landscaping.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cream-50/90 via-cream-50/80 to-cream-50/95 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <div className="relative">
          <StudentHeader search={search} onSearchChange={setSearch} />
          {/* Search dropdown — anchored below header */}
          {search.trim().length >= 2 && (
            <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
              <SearchAutocomplete
                query={search}
                results={searchResults}
                onPick={(id) => {
                  setSearch('')
                  // Tất cả các khóa học đều đi qua trang public trước.
                  // Nếu đã enrolled thì nút mũi tên "Vào học" sẽ đưa vào /student/courses/:id.
                  navigate(`/courses/${id}`)
                }}
              />
            </div>
          )}
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-10 pb-20">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* 1. Greeting */}
          <GreetingSection name={displayName} />

          {/* 2. Đang học + Lịch học tháng (cùng hàng: 2/3 + 1/3) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-orange-600 text-[22px]">auto_stories</span>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Khóa học bạn đang học</h2>
              </div>
              <Link
                to="/student/courses"
                className="text-sm font-semibold text-orange-700 hover:text-orange-600 transition-colors flex items-center gap-1"
              >
                Xem tất cả
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              <div className="lg:col-span-2">
                <EnrolledCoursesSlider />
              </div>
              <div className="lg:col-span-1">
                <MonthlyStreakCalendar />
              </div>
            </div>
          </section>

          {/* 3. Khóa học nổi bật */}
          <section className="space-y-6 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-[22px]">stars</span>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Các khóa học nổi bật</h2>
              </div>
              <p className="text-sm text-stone-600">Những khóa học bạn chưa tham gia — đang chờ bạn khám phá.</p>
            </div>
            {loading ? (
              <div className="text-center text-stone-500 py-12">Đang tải...</div>
            ) : featured.length === 0 ? (
              <div className="text-center text-stone-500 py-12 bg-white/60 rounded-2xl">
                Bạn đã đăng ký tất cả khóa học rồi! 🎉
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featured.map((c) => (
                  <FeaturedCourseCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-cream-200 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center text-xs text-stone-500">
            © 2026 Neko Study Space. Dành cho những giờ học bình yên.
          </div>
        </footer>
      </div>
    </div>
  )
}
