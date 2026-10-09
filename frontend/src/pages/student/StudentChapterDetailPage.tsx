// B4. StudentChapterDetailPage - list topics with mastery + final test button
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface ChapterSummary {
  id: number
  course_id: number
  title: string
  description: string | null
  order_index: number
}

interface TopicSummary {
  id: number
  chapter_id: number
  name: string
  description: string | null
  type: string
  order_index: number
}

interface TopicMastery {
  topic_id: number
  topic_name: string
  mastery: number
  current_level: number
  practice_attempts: number
  status: 'in_progress' | 'completed' | 'review_required'
}

interface Completion {
  is_completed: boolean
  test_score_percent: number | null
  completed_at: string | null
}

const STATUS_LABEL: Record<TopicMastery['status'], { label: string; color: string }> = {
  in_progress: { label: 'Đang học', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
  review_required: { label: 'Cần ôn lại', color: 'bg-red-100 text-red-700' },
}

export default function StudentChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const chapterIdNum = Number(chapterId)

  const [chapter, setChapter] = useState<ChapterSummary | null>(null)
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [masteries, setMasteries] = useState<Record<number, TopicMastery>>({})
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chapterIdNum) return
    setLoading(true)
    api
      .get<ChapterSummary>(`/chapters/${chapterIdNum}`)
      .then(async (chapterRes) => {
        setChapter(chapterRes.data)
        const topicsRes = await api.get<TopicSummary[]>(`/chapters/${chapterIdNum}/topics`)
        setTopics(topicsRes.data)
        // Fetch mastery for each topic
        const mResults = await Promise.allSettled(
          topicsRes.data.map((t) =>
            api
              .get<TopicMastery>(`/learning/topics/${t.id}/mastery`)
              .then((r) => [t.id, r.data] as const),
          ),
        )
        const m: Record<number, TopicMastery> = {}
        for (const r of mResults) {
          if (r.status === 'fulfilled') m[r.value[0]] = r.value[1]
        }
        setMasteries(m)
        // Chapter completion
        try {
          const c = await api.get<Completion>(`/learning/chapters/${chapterIdNum}/completion`)
          setCompletion(c.data)
        } catch {
          setCompletion({ is_completed: false, test_score_percent: null, completed_at: null })
        }
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [chapterIdNum])

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  const allTopicsDone = topics.length > 0 && topics.every((t) => masteries[t.id]?.status === 'completed')

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={chapter ? `/student/courses/${chapter.course_id}` : '/student/courses'}
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200"
        >
          ← Quay về khóa học
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {chapter && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
          <h1 className="text-3xl font-bold text-cream-900">{chapter.title}</h1>
          {chapter.description && (
            <p className="text-sm text-stone-600 mt-2">{chapter.description}</p>
          )}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-cream-900 mb-3">📚 Các chủ đề</h2>
        {topics.length === 0 ? (
          <div className="bg-[#FFFDF9]/80 backdrop-blur border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
            Chưa có chủ đề nào.
          </div>
        ) : (
          <div className="space-y-3">
            {[...topics]
              .sort((a, b) => a.order_index - b.order_index)
              .map((t, idx) => {
                const m = masteries[t.id]
                const status = m?.status ?? 'in_progress'
                const meta = STATUS_LABEL[status]
                const masteryPct = m ? Math.round(m.mastery * 100) : 0
                return (
                  <Link
                    key={t.id}
                    to={`/student/topics/${t.id}`}
                    className="block bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-5 shadow-sm hover:shadow-cozy hover:-translate-y-0.5 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <h3 className="font-bold text-stone-800 flex-1">{t.name}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    {m && (
                      <div className="ml-11">
                        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                          <span>Mastery: {masteryPct}%</span>
                          <span>Level {m.current_level} · {m.practice_attempts} lượt</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              status === 'completed' ? 'bg-green-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${masteryPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
          </div>
        )}
      </section>

      <section className="bg-gradient-to-br from-orange-50 to-cream-100 border border-orange-200 rounded-2xl p-6 shadow-cozy">
        <h2 className="text-lg font-bold text-cream-900 mb-2">🎯 Bài kiểm tra cuối chương</h2>
        <p className="text-sm text-stone-600 mb-4">
          Hoàn thành tất cả chủ đề trước khi mở bài kiểm tra cuối chương.
        </p>
        {completion?.is_completed ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="font-bold text-green-800">✓ Bạn đã hoàn thành chương này</div>
            <div className="text-sm text-green-700 mt-1">
              Điểm: {completion.test_score_percent?.toFixed(0)}% · {completion.completed_at}
            </div>
            <Link
              to={`/student/chapters/${chapterIdNum}/test`}
              className="mt-3 inline-block px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
            >
              Làm lại
            </Link>
          </div>
        ) : (
          <Link
            to={`/student/chapters/${chapterIdNum}/test`}
            className={`inline-block px-5 py-2 rounded-xl text-white font-semibold ${
              allTopicsDone
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-stone-300 cursor-not-allowed'
            }`}
            onClick={(e) => {
              if (!allTopicsDone) e.preventDefault()
            }}
          >
            {allTopicsDone ? 'Bắt đầu làm bài' : '🔒 Hoàn thành tất cả chủ đề trước'}
          </Link>
        )}
      </section>
    </div>
  )
}