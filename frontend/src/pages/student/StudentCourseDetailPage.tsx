// B3. StudentCourseDetailPage - course detail with image, enrollment info & chapters
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { courseApi, resolveImageUrl, toApiError, type CourseDetail } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

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
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = user !== null

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [completions, setCompletions] = useState<Record<number, Completion>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    if (!courseIdNum) return
    setLoading(true)
    Promise.all([
      courseApi.detail(courseIdNum),
      fetch(`/api/courses/${courseIdNum}/chapters`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(async ([courseData, chaptersData]) => {
        setCourse(courseData)
        setChapters(chaptersData as ChapterSummary[])

        // If not enrolled, skip completion fetch
        if (!courseData.is_enrolled) {
          setCompletions({})
          return
        }

        // Fetch completion for each chapter
        const results = await Promise.allSettled(
          (chaptersData as ChapterSummary[]).map((c) =>
            fetch(`/api/learning/chapters/${c.id}/completion`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
              },
            })
              .then(async (r) => {
                if (!r.ok) throw new Error('not enrolled')
                return [c.id, (await r.json()) as Completion] as const
              }),
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

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setEnrolling(true)
    setError(null)
    try {
      await courseApi.enroll(courseIdNum)
      // Reload to flip the button
      const data = await courseApi.detail(courseIdNum)
      setCourse(data)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  const completedCount = Object.values(completions).filter((c) => c.is_completed).length
  const totalChapters = chapters.length
  const progressPct =
    totalChapters === 0 ? 0 : Math.round((completedCount / totalChapters) * 100)
  const locked = course && !course.is_enrolled

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/student/homepage')}
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {course && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl shadow-cozy overflow-hidden">
          {/* Hero image */}
          <div className="h-48 sm:h-64 bg-gradient-to-br from-orange-300 to-orange-500 relative">
            {resolveImageUrl(course.image_url) ? (
              <img
                src={resolveImageUrl(course.image_url) ?? ''}
                alt={course.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">📚</div>
            )}
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-sm font-semibold">
              👥 {course.enrollment_count} học viên
            </div>
          </div>

          <div className="p-6 space-y-4">
            <h1 className="text-3xl font-bold text-cream-900">{course.name}</h1>
            {course.description && (
              <p className="text-stone-700 leading-relaxed">{course.description}</p>
            )}

            {/* Enroll / status row */}
            {course.is_enrolled ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                  ✓ Đã đăng ký
                </span>
                {totalChapters > 0 && (
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span>
                        Tiến độ: {completedCount}/{totalChapters} chương
                      </span>
                      <span className="font-bold text-orange-600">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-cream-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-6 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition disabled:opacity-50 shadow-md shadow-orange-500/25"
              >
                {enrolling ? 'Đang đăng ký…' : '🎓 Đăng ký học miễn phí'}
              </button>
            )}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-cream-900 mb-3">📑 Các chương</h2>
        {chapters.length === 0 ? (
          <div className="bg-[#FFFDF9]/80 backdrop-blur border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
            Chưa có chương nào.
          </div>
        ) : locked ? (
          // Locked chapters: still list them but visually disabled
          <div className="space-y-3">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className="flex items-center gap-3 bg-cream-50/80 border border-cream-200 rounded-2xl p-5 opacity-60"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-stone-200 text-stone-500">
                  🔒
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-700">{ch.title}</h3>
                  <p className="text-xs text-stone-500">Đăng ký để mở khóa nội dung</p>
                </div>
                <div className="text-xs text-stone-400">Chương {idx + 1}</div>
              </div>
            ))}
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
