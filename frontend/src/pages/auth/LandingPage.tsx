import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

interface Course {
  id: number
  name: string
  description: string | null
  created_at: string
}

export default function LandingPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requireAuth = useRequireAuth()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  // Fetch public course list
  useEffect(() => {
    api
      .get<Course[]>('/courses')
      .then((res) => setCourses(res.data))
      .catch((err) => {
        setError(
          (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
            'Không tải được danh sách khóa học. Vui lòng thử lại sau.',
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const handleEnroll = (courseId: number) => {
    requireAuth(() => {
      navigate(`/student/courses/${courseId}`)
    })
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
            <a href="#features" className="hidden sm:inline text-stone-700 hover:text-orange-600 transition">
              Tính năng
            </a>
            {user ? (
              <Link
                to={user.role === 'admin' ? '/admin/courses' : '/student/dashboard'}
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
              className="bg-[#FFFDF9] rounded-2xl border border-[#F2E4D2] p-6 shadow-sm hover:shadow-cozy hover:-translate-y-1 transition"
            >
              <div className="text-3xl mb-3">📚</div>
              <h3 className="text-lg font-bold text-cream-900 line-clamp-2">{c.name}</h3>
              <p className="mt-2 text-sm text-stone-600 line-clamp-3 min-h-[3.5rem]">
                {c.description || 'Chưa có mô tả cho khóa học này.'}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  Tạo: {new Date(c.created_at).toLocaleDateString('vi-VN')}
                </span>
                <button
                  onClick={() => handleEnroll(c.id)}
                  className="text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline"
                >
                  Xem chi tiết →
                </button>
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
