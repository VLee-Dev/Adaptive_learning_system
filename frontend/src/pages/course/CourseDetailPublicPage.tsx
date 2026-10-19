import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { courseApi, type CourseDetail, resolveImageUrl, toApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function CourseDetailPublicPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseIdNum = Number(courseId)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseIdNum) return
    setLoading(true)
    courseApi
      .detail(courseIdNum)
      .then(setCourse)
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [courseIdNum])

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/login?return=/courses/${courseIdNum}`)
      return
    }
    if (user.role !== 'student') {
      setError('Chỉ học viên mới có thể đăng ký khóa học.')
      return
    }
    if (!course) return
    setEnrolling(true)
    setError(null)
    try {
      await courseApi.enroll(course.id)
      const updated = await courseApi.detail(course.id)
      setCourse(updated)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setEnrolling(false)
    }
  }

  const backHref = user?.role === 'student' ? '/student/homepage' : '/'
  const backLabel = user?.role === 'student' ? 'Quay lại' : 'Trang chủ'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <p className="text-stone-500">Đang tải thông tin khóa học…</p>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">😿</div>
          <p className="text-stone-700">{error || 'Không tìm thấy khóa học.'}</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
          >
            ← Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src="/images/landscaping.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cream-50/90 via-cream-50/80 to-cream-50/95 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10">
        {/* Top bar — minimal cho guest */}
        <header className="bg-white/85 backdrop-blur-md border-b border-cream-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/images/icon.png"
                alt="Adaptive Learning"
                className="h-8 w-8 object-contain"
              />
              <span className="text-lg sm:text-xl font-bold text-orange-700">
                Adaptive Learning
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-12 py-8 space-y-6 w-full">
          {/* Back link — thay cho breadcrumb */}
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-cream-200 text-stone-700 text-sm font-semibold hover:bg-white hover:border-orange-300 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {backLabel}
          </Link>

          {/* Hero */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">pets</span>
                  Lộ trình Chuyên sâu
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cream-100 text-stone-700 text-xs font-semibold">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                  Cập nhật 2026
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream-100 text-orange-700 text-xs font-semibold">
                  <span className="material-symbols-outlined text-[15px]">spa</span>
                  Học không áp lực
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 tracking-tight leading-tight">
                {course.name}
              </h1>

              {/* Description */}
              <p className="text-base text-stone-600 leading-relaxed">
                {course.description || 'Khóa học được thiết kế tỉ mỉ giúp bạn nắm vững kiến thức trong không gian ấm cúng, thư thái.'}
              </p>

              {/* Metrics */}
              <div className="p-5 rounded-2xl bg-white shadow-sm flex items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-stone-800">4.9</span>
                      <span className="text-xs text-stone-500">(đánh giá từ học viên)</span>
                    </div>
                    <span className="text-xs text-stone-500">
                      {course.enrollment_count} học viên đã tham gia
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky enrollment card */}
            <div className="lg:col-span-5 relative">
              <div className="sticky top-24 rounded-3xl bg-white p-6 shadow-md flex flex-col gap-6">
                <div className="relative w-full h-56 rounded-2xl overflow-hidden">
                  {course.image_url ? (
                    <img
                      src={resolveImageUrl(course.image_url) ?? ''}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white text-7xl">
                      🎓
                    </div>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold text-orange-600 tracking-tight">Miễn phí</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    Tài trợ 100%
                  </span>
                </div>

                {course.is_enrolled ? (
                  <>
                    <div className="w-full py-4 px-6 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-[22px]">check_circle</span>
                      Đã đăng ký
                    </div>
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="w-full py-3 px-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      Vào học ngay
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-4 px-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[22px]">pets</span>
                    {enrolling
                      ? 'Đang đăng ký…'
                      : !user
                        ? 'Đăng ký (cần đăng nhập)'
                        : 'Đăng ký miễn phí'}
                  </button>
                )}

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-white/95 backdrop-blur-md border-t border-cream-200 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center text-xs text-stone-500">
            © 2026 Neko Study Space. Dành cho những giờ học bình yên.
          </div>
        </footer>
      </div>
    </div>
  )
}
