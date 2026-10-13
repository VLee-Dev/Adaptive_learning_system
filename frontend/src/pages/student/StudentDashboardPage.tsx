import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface CourseSummary {
  id: number
  name: string
  description: string | null
  created_at: string
}

interface EnrollmentSummary {
  course_id: number
  course_name: string
  progress: number
  completed: boolean
  last_accessed: string | null
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrollmentSummary[]>([])
  const [allCourses, setAllCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<EnrollmentSummary[]>('/learning/enrollments').catch(() => ({ data: [] })),
      api.get<CourseSummary[]>('/courses').catch(() => ({ data: [] })),
    ])
      .then(([enrollRes, coursesRes]) => {
        setEnrolledCourses(enrollRes.data)
        setAllCourses(coursesRes.data)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [])

  const recommendedCourses = allCourses.filter(
    (c) => !enrolledCourses.some((e) => e.course_id === c.id),
  )

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">
            Xin chào{user?.full_name ? `, ${user.full_name}` : ''}! 👋
          </h1>
          <p className="text-orange-100 text-lg">
            Tiếp tục hành trình học tập của bạn ngày hôm nay
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-stone-500 py-12">Đang tải...</div>
        ) : (
          <>
            {/* In Progress / My Courses */}
            {enrolledCourses.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-cream-900">Khóa học của tôi</h2>
                    <p className="text-stone-600 text-sm mt-1">
                      Tiếp tục từ nơi bạn để lại
                    </p>
                  </div>
                  <Link
                    to="/student/courses"
                    className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                  >
                    Xem tất cả →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledCourses.map((enrollment) => (
                    <Link
                      key={enrollment.course_id}
                      to={`/student/courses/${enrollment.course_id}`}
                      className="group bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl overflow-hidden hover:shadow-cozy hover:border-orange-300 transition duration-200"
                    >
                      {/* Card Header */}
                      <div className="h-32 bg-gradient-to-br from-orange-400 to-orange-600 relative">
                        <div className="absolute inset-0 flex items-center justify-center text-white text-4xl opacity-30">
                          📚
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-cream-900 group-hover:text-orange-600 transition">
                          {enrollment.course_name}
                        </h3>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-stone-600">
                              {Math.round(enrollment.progress)}% hoàn thành
                            </span>
                            {enrollment.completed && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                                ✓ Xong
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-cream-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                        </div>

                        {enrollment.last_accessed && (
                          <p className="text-xs text-stone-500 mt-2">
                            Truy cập lần cuối: {new Date(enrollment.last_accessed).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-3 bg-cream-50 border-t border-cream-200">
                        <p className="text-orange-600 text-sm font-semibold group-hover:text-orange-700">
                          Tiếp tục học →
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recommended Courses */}
            {recommendedCourses.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-cream-900">Gợi ý cho bạn</h2>
                    <p className="text-stone-600 text-sm mt-1">
                      Những khóa học bạn chưa tham gia
                    </p>
                  </div>
                  <Link
                    to="/student/courses"
                    className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                  >
                    Khám phá thêm →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recommendedCourses.slice(0, 4).map((course) => (
                    <Link
                      key={course.id}
                      to={`/student/courses/${course.id}`}
                      className="group bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl overflow-hidden hover:shadow-cozy hover:border-orange-300 transition duration-200"
                    >
                      <div className="h-24 bg-gradient-to-br from-cream-400 to-orange-500 flex items-center justify-center text-white text-3xl">
                        🎓
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-cream-900 text-sm group-hover:text-orange-600 line-clamp-2">
                          {course.name}
                        </h3>
                        <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                          {course.description || 'Bắt đầu khóa học này'}
                        </p>
                        <p className="text-orange-600 text-xs font-semibold mt-2 group-hover:text-orange-700">
                          Tìm hiểu →
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {enrolledCourses.length === 0 && recommendedCourses.length === 0 && (
              <div className="text-center py-16">
                <p className="text-stone-500 text-lg mb-4">Bạn chưa tham gia khóa học nào</p>
                <Link
                  to="/student/courses"
                  className="inline-block bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
                >
                  Khám phá khóa học
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}