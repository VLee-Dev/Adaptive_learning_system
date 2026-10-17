import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { courseApi, type CourseSummary, resolveImageUrl, toApiError } from '@/lib/api'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/stores/authStore'

export default function LandingPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requireAuth = useRequireAuth()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  // Fetch public course list
  useEffect(() => {
    courseApi
      .list()
      .then((res) => setCourses(res))
      .catch((err) => setError(toApiError(err).detail || 'Không tải được danh sách khóa học. Vui lòng thử lại sau.'))
      .finally(() => setLoading(false))
  }, [])

  const handleEnroll = (courseId: number) => {
    // Guest: cần login trước → CourseDetailPublicPage sẽ lo phần này
    // Logged-in: cần là student
    requireAuth(() => {
      navigate(`/courses/${courseId}`)
    })
  }

  const handleViewDetail = (courseId: number) => {
    // Public: ai cũng xem được
    navigate(`/courses/${courseId}`)
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFDF9] text-cream-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#FFFDF9]/80 border-b border-[#F2E4D2]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-orange-700">
            <img src="/images/icon.png" alt="Adaptive Learning" className="h-8 w-8 object-contain" />
            <span>Adaptive Learning</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-sm font-semibold">
            <a href="#courses" className="text-stone-700 hover:text-orange-600 transition">
              Khóa học
            </a>
            {user ? (
              <Link
                to={user.role === 'admin' ? '/admin/courses' : '/student/homepage'}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition shadow-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-stone-700 hover:text-orange-600 transition">
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition shadow-sm"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <img
          src="/images/landscaping.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Tint overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFFDF9]/95 via-[#FFFDF9]/80 to-[#FFFDF9]/40" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 sm:py-24 grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-full">
              🐱 Học tập thích ứng cho mọi chủ đề
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-cream-900 tracking-tight leading-tight">
              Học thông minh hơn,<br />
              <span className="text-orange-600">mỗi ngày cùng bạn.</span>
            </h1>
            <p className="mt-4 text-base text-stone-600 max-w-md">
              Hệ thống học tập thích ứng theo trình độ - tự động điều chỉnh độ khó câu hỏi bằng thuật toán BKT, giúp bạn nắm vững kiến thức nhanh nhất.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#courses"
                className="px-6 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
              >
                Xem khóa học
              </a>
              {!user && (
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-xl border-2 border-orange-200 text-orange-700 font-semibold hover:bg-orange-50 transition"
                >
                  Đăng ký miễn phí
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:flex justify-center" aria-hidden="true">
            {/* Empty hero art - intentionally blank */}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#FAF5EE] border-y border-[#F2E4D2]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-6">
          {[
            { icon: '🎯', title: 'Cá nhân hóa', desc: 'Hệ thống tự chọn câu hỏi phù hợp trình độ của bạn.' },
            { icon: '📈', title: 'Theo dõi tiến bộ', desc: 'Biểu đồ mastery cho từng chủ đề, cập nhật theo thời gian thực.' },
            { icon: '🏆', title: 'Hoàn thành khóa học', desc: 'Làm bài kiểm tra cuối chương để mở khóa nội dung tiếp theo.' },
          ].map((f) => (
            <div key={f.title} className="bg-[#FFFDF9] rounded-2xl border border-[#F2E4D2] p-6 shadow-sm">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-bold text-cream-900">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-cream-900">Khóa học hiện có</h2>
            <p className="text-sm text-stone-600 mt-1">Khám phá các chủ đề đa dạng do Admin tạo.</p>
          </div>
        </div>

        {loading && (
          <div className="text-center text-stone-500 py-12">Đang tải khóa học...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="text-center text-stone-500 py-12 bg-stone-50 rounded-2xl">
            Chưa có khóa học nào được publish. Vui lòng quay lại sau. 🐾
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <article
              key={c.id}
              className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group"
            >
              {/* Thumbnail */}
              <div className="relative h-44 w-full overflow-hidden">
                {c.image_url ? (
                  <img
                    src={resolveImageUrl(c.image_url) ?? ''}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
              {/* Body */}
              <div className="p-5 space-y-3 flex-1">
                <h3 className="text-base font-semibold text-stone-800 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                  {c.name}
                </h3>
                <p className="text-xs text-stone-600 line-clamp-3 min-h-[3rem]">
                  {c.description || 'Chưa có mô tả cho khóa học này.'}
                </p>
              </div>
              {/* Footer */}
              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-cream-200 flex items-center justify-between gap-2">
                  {c.is_enrolled ? (
                    <>
                      <span
                        className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold"
                      >
                        ✓ Đã đăng ký
                      </span>
                      <Link
                        to={`/student/courses/${c.id}`}
                        className="text-sm font-semibold text-orange-700 hover:text-orange-600 flex items-center gap-1"
                      >
                        Vào học
                        <span className="material-symbols-outlined text-[18px]">
                          arrow_forward
                        </span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEnroll(c.id)}
                        className="px-4 py-1.5 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition shadow-sm"
                      >
                        Đăng ký
                      </button>
                      <button
                        onClick={() => handleViewDetail(c.id)}
                        className="text-sm font-semibold text-orange-700 hover:text-orange-600 flex items-center gap-1 transition-colors"
                      >
                        Xem chi tiết
                        <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FAF5EE] border-t border-[#F2E4D2] mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-stone-600">
          🐱 Học tập & làm việc năng suất cùng Pomodoro Neko · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
