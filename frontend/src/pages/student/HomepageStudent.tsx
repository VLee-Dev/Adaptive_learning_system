import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { courseApi, type CourseSummary, toApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { resolveImageUrl } from '@/lib/api'
import StudentHeader from '@/components/StudentHeader'

// ----- Helpers ---------------------------------------------------------------
function greetingByHour(date = new Date()): { text: string; emoji: string } {
  const h = date.getHours()
  if (h >= 5 && h < 11) return { text: 'Chào buổi sáng', emoji: '☀️' }
  if (h >= 11 && h < 13) return { text: 'Chào buổi trưa', emoji: '🌤️' }
  if (h >= 13 && h < 18) return { text: 'Chào buổi chiều', emoji: '☕' }
  return { text: 'Chào buổi tối', emoji: '🌙' }
}

// ----- Sub-components --------------------------------------------------------

/** Greeting section + "Chuỗi 21 ngày" badge (TODO: lấy từ BE) */
function GreetingSection({ name }: { name: string }) {
  const { text, emoji } = greetingByHour()
  return (
    <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-cream-100/90 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-sm border border-cream-200 relative overflow-hidden">
      <div className="absolute -right-8 -bottom-10 pointer-events-none opacity-10 select-none text-orange-600">
        <span className="material-symbols-outlined text-[180px]">pets</span>
      </div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md">
          <span className="material-symbols-outlined text-[28px]">waving_hand</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 tracking-tight">
            {text}, {name}! {emoji}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
            Chuỗi 21 ngày
          </span>
        </div>
      </div>
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

/** Card lớn primary cho "khóa học đang học" */
function PrimaryCourseCard({ course }: { course: CourseSummary }) {
  const progress = 0
  const totalLessons = 25
  const completedLessons = 0
  return (
    <div className="lg:col-span-8 bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-100/50 via-cream-100/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="inline-block px-2.5 py-0.5 rounded-lg bg-cream-100 text-stone-700 text-xs font-semibold">
              Đang học
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">{course.name}</h3>
            <p className="text-sm text-stone-600">
              {course.description || 'Tiếp tục hành trình học tập của bạn.'}
            </p>
          </div>
          <div className="relative w-36 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm group">
            {course.image_url ? (
              <img
                src={resolveImageUrl(course.image_url) ?? ''}
                alt={course.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-5xl">
                📚
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2 bg-cream-50 rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-stone-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-orange-600 text-[18px]">timelapse</span>
              Tiến độ hoàn thành: <strong className="text-orange-600 font-bold">{progress}%</strong>
            </span>
            <span className="text-stone-500 text-xs">
              {completedLessons}/{totalLessons} bài học (TODO)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-cream-200 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-700 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-6 mt-4 border-t border-cream-200 flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center">
          <Link
            to={`/student/courses/${course.id}`}
            className="px-6 py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all flex items-center gap-2 shadow-md shadow-orange-500/25 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">play_circle</span>
            <span>🐾 Tiếp tục học</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

/** 7-day paw print calendar (TODO: lấy từ BE) */
function WeeklyStreak() {
  const days = [
    { label: 'T2', done: true },
    { label: 'T3', done: true },
    { label: 'T4', done: true },
    { label: 'T5', done: true },
    { label: 'T6', done: true, today: true },
    { label: 'T7', done: true },
    { label: 'CN', done: false, pending: true },
  ]
  return (
    <div className="lg:col-span-4 flex flex-col justify-start">
      <div className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-600 text-[20px]">calendar_month</span>
            <h4 className="text-lg font-bold text-stone-800">Chuỗi 7 ngày</h4>
          </div>
          <span className="text-xs font-bold text-orange-700">Tuần này: 6/7 (TODO)</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {days.map((d) => (
            <div
              key={d.label}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl ${
                d.today
                  ? 'bg-orange-600 text-white shadow-md'
                  : d.done
                    ? 'bg-cream-100'
                    : 'bg-white border border-dashed border-cream-300'
              }`}
            >
              <span className={`text-[10px] font-semibold ${d.today ? 'font-bold' : 'text-stone-500'}`}>
                {d.label}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  d.today
                    ? 'bg-white text-orange-600'
                    : d.done
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-cream-100 text-stone-400'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {d.pending ? 'lock' : 'pets'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500 text-center mt-3">
          Hoàn thành bài học ngày mai để nhận Huy hiệu{' '}
          <strong className="text-orange-700 font-semibold">"Mèo Siêng Năng"</strong>! 🐱
        </p>
      </div>
    </div>
  )
}

/** Card nhỏ cho "Các khóa học nổi bật" (4-card grid) */
function FeaturedCourseCard({ course }: { course: CourseSummary }) {
  const navigate = useNavigate()
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
        <div className="pt-3 border-t border-cream-200 flex items-center justify-between">
          {course.is_enrolled ? (
            <Link
              to={`/student/courses/${course.id}`}
              className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 transition"
            >
              ✓ Đã đăng ký
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/courses/${course.id}`)}
              className="px-4 py-1.5 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition shadow-sm"
            >
              Đăng ký
            </button>
          )}
          <Link
            to={`/courses/${course.id}`}
            className="text-sm font-semibold text-orange-700 hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            Xem chi tiết
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
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

  const primaryCourse = enrolled[0]
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
                  navigate(`/courses/${id}`)
                }}
              />
            </div>
          )}
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 space-y-10 pb-16">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* 1. Greeting */}
          <GreetingSection name={displayName} />

          {/* 2. Đang học + weekly streak */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-orange-600 text-[22px]">auto_stories</span>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Khóa học bạn đang học</h2>
                {primaryCourse && (
                  <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    Đang diễn ra
                  </span>
                )}
              </div>
              <Link
                to="/student/courses"
                className="text-sm font-semibold text-orange-700 hover:text-orange-600 transition-colors flex items-center gap-1"
              >
                Xem tất cả
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {primaryCourse ? (
                <PrimaryCourseCard course={primaryCourse} />
              ) : (
                <div className="lg:col-span-8 bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-6 lg:p-8 shadow-sm flex items-center justify-center min-h-[280px]">
                  <div className="text-center">
                    <div className="text-6xl mb-3">📚</div>
                    <p className="text-stone-600">Bạn chưa đăng ký khóa học nào.</p>
                    <Link
                      to="/student/courses"
                      className="mt-4 inline-block px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
                    >
                      Khám phá khóa học
                    </Link>
                  </div>
                </div>
              )}
              <WeeklyStreak />
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

        <footer className="bg-white/95 backdrop-blur-md border-t border-cream-200 py-6">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center text-xs text-stone-500">
            © 2026 Neko Study Space. Dành cho những giờ học bình yên.
          </div>
        </footer>
      </div>
    </div>
  )
}
