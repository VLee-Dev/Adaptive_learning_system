// B2. StudentCourseCatalogPage - list published courses
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface CourseSummary {
  id: number
  name: string
  description: string | null
  created_at: string
}

export default function StudentCourseCatalogPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .get<CourseSummary[]>('/courses')
      .then((r) => setCourses(r.data))
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-5xl space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Link
              key={c.id}
              to={`/student/courses/${c.id}`}
              className="block bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-5 shadow-sm hover:shadow-cozy hover:-translate-y-1 hover:border-orange-300 transition"
            >
              <div className="text-3xl mb-3">📖</div>
              <h2 className="text-lg font-bold text-cream-900 mb-2">{c.name}</h2>
              <p className="text-sm text-stone-600 line-clamp-3">
                {c.description || 'Chưa có mô tả.'}
              </p>
              <div className="mt-3 text-xs text-orange-600 font-semibold">
                Xem chi tiết →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}