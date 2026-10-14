// B2. StudentCourseCatalogPage - list published courses with images & enrollment info
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { courseApi, resolveImageUrl, toApiError, type CourseSummary } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function StudentCourseCatalogPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = user !== null
  const navigate = useNavigate()
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await courseApi.list()
      setCourses(data)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleEnroll = async (e: React.MouseEvent, courseId: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setEnrollingId(courseId)
    setError(null)
    try {
      await courseApi.enroll(courseId)
      await load()
    } catch (err) {
      setError(toApiError(err).detail)
    } finally {
      setEnrollingId(null)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-0 py-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate('/student/homepage')}
        className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200 flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Quay lại
      </button>

      <div>
        <h1 className="text-3xl font-bold text-cream-900">📚 Danh sách khóa học</h1>
        <p className="text-sm text-stone-600 mt-1">
          Khám phá các khóa học được thiết kế cho trình độ của bạn.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-[#FFFDF9]/80 backdrop-blur border border-cream-200 rounded-2xl p-8 text-center text-stone-500">
          Chưa có khóa học nào được mở.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden">
                  {resolveImageUrl(c.image_url) ? (
                    <img
                      src={resolveImageUrl(c.image_url) ?? ''}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white text-6xl">
                      🎓
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-0.5 rounded-lg bg-stone-800/75 text-white text-xs font-semibold">
                      {c.enrollment_count} học viên
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="text-base font-semibold text-stone-800 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                    {c.name}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 min-h-[2.5rem]">
                    {c.description || 'Khám phá khóa học hấp dẫn này ngay hôm nay.'}
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-cream-200 flex items-center justify-between">
                  {c.is_enrolled ? (
                    <Link
                      to={`/student/courses/${c.id}`}
                      className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 transition"
                    >
                      ✓ Đã đăng ký
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleEnroll(e, c.id)}
                      disabled={enrollingId === c.id}
                      className="px-4 py-1.5 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition disabled:opacity-50"
                    >
                      {enrollingId === c.id ? 'Đang đăng ký…' : 'Đăng ký'}
                    </button>
                  )}
                  <Link
                    to={`/student/courses/${c.id}`}
                    className="text-stone-400 hover:text-orange-600 transition"
                    aria-label="Xem chi tiết"
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
