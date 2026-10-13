// B2. StudentCourseCatalogPage - list published courses with images & enrollment info
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseApi, resolveImageUrl, toApiError, type CourseSummary } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function StudentCourseCatalogPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = user !== null
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
      // Re-fetch so the card now shows "Đã đăng ký" + bumped count
      await load()
    } catch (err) {
      setError(toApiError(err).detail)
    } finally {
      setEnrollingId(null)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cream-900">📚 Danh sách khóa học</h1>
          <p className="text-sm text-stone-600 mt-1">
            Khám phá các khóa học được thiết kế cho trình độ của bạn.
          </p>
        </div>
        <Link
          to="/student/dashboard"
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200"
        >
          ← Dashboard
        </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <div
              key={c.id}
              className="group bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-cozy hover:-translate-y-1 hover:border-orange-300 transition flex flex-col"
            >
              {/* Image */}
              <div className="h-40 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400 relative overflow-hidden">
                {resolveImageUrl(c.image_url) ? (
                  <img
                    src={resolveImageUrl(c.image_url) ?? ''}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      // Fallback to gradient if image fails
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    📖
                  </div>
                )}
                {/* Enrollment count badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold">
                  👥 {c.enrollment_count}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h2 className="text-lg font-bold text-cream-900 mb-1 line-clamp-2">{c.name}</h2>
                <p className="text-sm text-stone-600 line-clamp-3 flex-1">
                  {c.description || 'Chưa có mô tả.'}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {c.enrollment_count} học viên đã đăng ký
                </p>

                {/* Action */}
                <div className="mt-3 pt-3 border-t border-cream-200">
                  {c.is_enrolled ? (
                    <Link
                      to={`/student/courses/${c.id}`}
                      className="block text-center w-full px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition"
                    >
                      ✓ Vào học →
                    </Link>
                  ) : (
                    <button
                      onClick={(e) => handleEnroll(e, c.id)}
                      disabled={enrollingId === c.id}
                      className="w-full px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition disabled:opacity-50"
                    >
                      {enrollingId === c.id ? 'Đang đăng ký…' : 'Đăng ký học'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
