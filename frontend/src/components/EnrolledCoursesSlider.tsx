import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { learningApi, type EnrollmentProgress, toApiError } from '@/lib/api'
import { courseApi, type CourseSummary } from '@/lib/api'
import { resolveImageUrl } from '@/lib/api'

/** Khoảng thời gian tự trượt giữa các slide (ms). */
const AUTOSCROLL_MS = 6000

interface EnrolledCourse extends EnrollmentProgress {
  image_url: string | null
  description: string | null
}

/** Card khóa học đang học — 1 slide. */
function CourseSlide({ course }: { course: EnrolledCourse }) {
  const progress = Math.round(course.progress)
  const done = course.completed

  return (
    <div className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-100/50 via-cream-100/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      <div className="space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            {done ? (
              <div className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
                ✓ Đã hoàn thành
              </div>
            ) : (
              <div className="inline-block px-2.5 py-0.5 rounded-lg bg-cream-100 text-stone-700 text-xs font-semibold">
                Đang học
              </div>
            )}
            <h3 className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">
              {course.course_name}
            </h3>
            {course.description && (
              <p className="text-sm text-stone-600 line-clamp-2">
                {course.description}
              </p>
            )}
          </div>
          <div className="relative w-36 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm group">
            {course.image_url ? (
              <img
                src={resolveImageUrl(course.image_url) ?? ''}
                alt={course.course_name}
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
              <span className="material-symbols-outlined text-orange-600 text-[18px]">
                timelapse
              </span>
              Tiến độ hoàn thành:{' '}
              <strong className="text-orange-600 font-bold">{progress}%</strong>
            </span>
            <span className="text-stone-500 text-xs">
              {done ? 'Đã xong toàn bộ chương' : `${progress}% số chương`}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-cream-200 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-700 relative"
              style={{ width: `${progress}%` }}
            >
              {progress > 0 && progress < 100 && (
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 mt-4 border-t border-cream-200 flex flex-wrap items-center justify-between gap-4 relative z-10">
        <Link
          to={`/student/courses/${course.course_id}`}
          className="px-6 py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all flex items-center gap-2 shadow-md shadow-orange-500/25 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            {done ? 'replay' : 'play_circle'}
          </span>
          <span>{done ? '🐾 Ôn lại' : '🐾 Tiếp tục học'}</span>
        </Link>
      </div>
    </div>
  )
}

/**
 * Slider "Khóa học bạn đang học".
 *
 * - Chỉ hiện khóa CHƯA hoàn thành (completed === true bị loại khỏi danh sách).
 * - Sắp theo lần học gần nhất; khóa chưa từng mở thì xếp cuối.
 * - Tự trượt mỗi AUTOSWITCH_MS, dừng khi chuột đang ở trên slider hoặc khi
 *   tab ẩn, và tạm dừng sau khi user tương tác để không cướp thao tác.
 */
export default function EnrolledCoursesSlider() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  // Ref để interval không cần restart khi index đổi.
  const indexRef = useRef(0)
  indexRef.current = index

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Tiến độ thật từ /learning/enrollments (đã loại khóa hoàn thành).
    // Ảnh + mô tả lấy từ /courses để tái dùng courseApi.
    Promise.all([learningApi.getEnrollments(), courseApi.list()])
      .then(([enrollments, allCourses]) => {
        if (cancelled) return

        const byId = new Map(allCourses.map((c) => [c.id, c]))
        const active = enrollments
          .filter((e) => !e.completed)
          .map((e) => {
            const meta = byId.get(e.course_id)
            return {
              ...e,
              image_url: meta?.image_url ?? null,
              description: meta?.description ?? null,
            } satisfies EnrolledCourse
          })
          .sort((a, b) => {
            // Có last_accessed thì xếp trước, mới nhất trước.
            if (a.last_accessed && b.last_accessed) {
              return b.last_accessed.localeCompare(a.last_accessed)
            }
            if (a.last_accessed) return -1
            if (b.last_accessed) return 1
            return 0
          })

        setCourses(active)
      })
      .catch((e) => {
        if (!cancelled) setError(toApiError(e).detail)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Khi danh sách rút ngắn (vd bỏ 1 khóa vừa hoàn thành), kẹp index lại.
  useEffect(() => {
    setIndex((i) => (courses.length === 0 ? 0 : Math.min(i, courses.length - 1)))
  }, [courses.length])

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % courses.length) + courses.length) % courses.length)
    },
    [courses.length],
  )

  // Autoplay: dừng khi hover, khi tab ẩn, và khi danh sách chỉ có 1 phần tử.
  useEffect(() => {
    if (paused || courses.length <= 1) return

    const timer = setInterval(() => {
      if (document.hidden) return
      setIndex((i) => (i + 1) % courses.length)
    }, AUTOSCROLL_MS)

    return () => clearInterval(timer)
  }, [paused, courses.length])

  const showDots = courses.length > 1

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-8 shadow-sm flex items-center justify-center min-h-[280px]">
        <p className="text-stone-500 text-sm">Đang tải khóa học...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-red-200 rounded-3xl p-8 shadow-sm flex items-center justify-center min-h-[280px]">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-6 lg:p-8 shadow-sm flex items-center justify-center min-h-[280px]">
        <div className="text-center">
          <div className="text-6xl mb-3">📚</div>
          <p className="text-stone-600">
            {error
              ? 'Không tải được khóa học.'
              : 'Bạn chưa đăng ký khóa học nào.'}
          </p>
          <Link
            to="/student/courses"
            className="mt-4 inline-block px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
          >
            Khám phá khóa học
          </Link>
        </div>
      </div>
    )
  }

  const current = courses[index]

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide hiện tại — key theo id để chạy lại animation khi chuyển */}
      <div key={current.course_id} className="animate-fade-in">
        <CourseSlide course={current} />
      </div>

      {/* Chỉ báo chấm tròn — chỉ hiện khi có từ 2 khóa trở lên */}
      {showDots && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {courses.map((c, i) => (
            <button
              key={c.course_id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Xem khóa học ${c.course_name}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-7 bg-orange-600'
                  : 'w-2.5 bg-cream-200 hover:bg-stone-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Nút trượt nhanh (chỉ khi > 1 khóa) */}
      {showDots && (
        <div className="absolute top-1/2 -translate-y-1/2 inset-y-8 flex items-center pointer-events-none">
          <button
            type="button"
            onClick={() => goTo(indexRef.current - 1)}
            aria-label="Khóa học trước"
            className="pointer-events-auto -ml-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur border border-cream-200 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-orange-600 transition"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => goTo(indexRef.current + 1)}
            aria-label="Khóa học tiếp theo"
            className="pointer-events-auto -mr-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur border border-cream-200 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-orange-600 transition"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>
      )}
    </div>
  )
}