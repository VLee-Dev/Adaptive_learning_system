// B3. StudentCourseDetailPage - course detail with chapters + completion progress
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface CourseDetail {
  id: number
  name: string
  description: string | null
  is_published: boolean
  created_at: string
}

interface ChapterSummary {
  id: number
  course_id: number
  title: string
  description: string | null
  order_index: number
}

interface Completion {
  is_completed: boolean
  test_score_percent: number | null
  completed_at: string | null
}

export default function StudentCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseIdNum = Number(courseId)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [completions, setCompletions] = useState<Record<number, Completion>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseIdNum) return
    setLoading(true)
    Promise.all([
      api.get<CourseDetail>(`/courses/${courseIdNum}`),
      api.get<ChapterSummary[]>(`/courses/${courseIdNum}/chapters`),
    ])
      .then(async ([courseRes, chaptersRes]) => {
        setCourse(courseRes.data)
        setChapters(chaptersRes.data)
        // Fetch completion for each chapter in parallel
        const results = await Promise.allSettled(
          chaptersRes.data.map((c) =>
            api.get<Completion>(`/learning/chapters/${c.id}/completion`).then((r) => [c.id, r.data] as const),
          ),
        )
        const map: Record<number, Completion> = {}
        for (const r of results) {
          if (r.status === 'fulfilled') map[r.value[0]] = r.value[1]
        }
        setCompletions(map)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [courseIdNum])

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  const completedCount = Object.values(completions).filter((c) => c.is_completed).length
  const totalChapters = chapters.length
  const progressPct = totalChapters === 0 ? 0 : Math.round((completedCount / totalChapters) * 100)

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/student/courses"
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200"
        >
          ← Khóa học
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {course && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
          <h1 className="text-3xl font-bold text-cream-900">{course.name}</h1>
          {course.description && (
            <p className="text-sm text-stone-600 mt-2">{course.description}</p>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
              <span>Tiến độ: {completedCount}/{totalChapters} chương</span>
              <span className="font-bold text-orange-600">{progressPct}%</span>
            </div>
            <div className="w-full bg-cream-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-cream-900 mb-3">📑 Các chương</h2>
        {chapters.length === 0 ? (
          <div className="bg-[#FFFDF9]/80 backdrop-blur border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
            Chưa có chương nào.
          </div>
        ) : (
          <div className="space-y-3">
            {[...chapters]
              .sort((a, b) => a.order_index - b.order_index)
              .map((ch, idx) => {
                const done = completions[ch.id]?.is_completed
                return (
                  <Link
                    key={ch.id}
                    to={`/student/chapters/${ch.id}`}
                    className="block bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-5 shadow-sm hover:shadow-cozy hover:-translate-y-0.5 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          done
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {done ? '✓' : idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-cream-900">{ch.title}</h3>
                        {ch.description && (
                          <p className="text-sm text-stone-500 line-clamp-1">{ch.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-stone-400">
                        {done
                          ? `Đạt ${completions[ch.id]?.test_score_percent?.toFixed(0)}%`
                          : 'Chưa hoàn thành'}
                      </div>
                    </div>
                  </Link>
                )
              })}
          </div>
        )}
      </section>
    </div>
  )
}