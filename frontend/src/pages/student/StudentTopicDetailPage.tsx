// B5. StudentTopicDetailPage - read lessons, then start practice
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface TopicSummary {
  id: number
  chapter_id: number
  name: string
  description: string | null
  type: string
  order_index: number
}

interface LessonSummary {
  id: number
  topic_id: number
  name: string
  content_type: 'text' | 'image' | 'video'
  order_index: number
}

interface TopicMastery {
  topic_id: number
  mastery: number
  current_level: number
  status: 'in_progress' | 'completed' | 'review_required'
}

const TYPE_LABEL: Record<string, string> = {
  text: '📄',
  image: '🖼️',
  video: '🎥',
}

export default function StudentTopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const topicIdNum = Number(topicId)

  const [topic, setTopic] = useState<TopicSummary | null>(null)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [mastery, setMastery] = useState<TopicMastery | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!topicIdNum) return
    setLoading(true)
    api
      .get<TopicSummary>(`/topics/${topicIdNum}`)
      .then(async (topicRes) => {
        setTopic(topicRes.data)
        const lessonsRes = await api.get<LessonSummary[]>(`/topics/${topicIdNum}/lessons`)
        setLessons(lessonsRes.data)
        try {
          const m = await api.get<TopicMastery>(`/learning/topics/${topicIdNum}/mastery`)
          setMastery(m.data)
        } catch {
          setMastery(null)
        }
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [topicIdNum])

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={topic ? `/student/chapters/${topic.chapter_id}` : '/student/courses'}
          className="px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200"
        >
          ← Quay về chương
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {topic && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-stone-800">{topic.name}</h1>
          {topic.description && <p className="text-sm text-stone-600 mt-2">{topic.description}</p>}
          {mastery && (
            <div className="mt-4 p-3 bg-stone-50 rounded-lg text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-stone-600">Mastery hiện tại</span>
                <span className="font-bold text-orange-600">
                  {Math.round(mastery.mastery * 100)}% · Level {mastery.current_level}
                </span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    mastery.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.round(mastery.mastery * 100)}%` }}
                />
              </div>
              {mastery.status === 'completed' && (
                <div className="mt-2 text-xs text-green-700 font-semibold">
                  ✓ Bạn đã hoàn thành chủ đề này
                </div>
              )}
              {mastery.status === 'review_required' && (
                <div className="mt-2 text-xs text-red-700 font-semibold">
                  ⚠️ Nên ôn lại bài học trước khi luyện tập tiếp
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-cream-900 mb-3">📖 Bài học ({lessons.length})</h2>
        {lessons.length === 0 ? (
          <div className="bg-[#FFFDF9]/80 backdrop-blur border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
            Chưa có bài học nào.
          </div>
        ) : (
          <div className="space-y-2">
            {[...lessons]
              .sort((a, b) => a.order_index - b.order_index)
              .map((l) => (
                <Link
                  key={l.id}
                  to={`/student/lessons/${l.id}`}
                  className="block bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-4 shadow-sm hover:shadow-cozy hover:-translate-y-0.5 hover:border-orange-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TYPE_LABEL[l.content_type] ?? '📄'}</span>
                    <span className="font-semibold text-cream-900 flex-1">{l.name}</span>
                    <span className="text-stone-400 text-sm">→</span>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </section>

      <section className="bg-gradient-to-br from-orange-50 to-cream-100 border border-orange-200 rounded-2xl p-6 shadow-cozy">
        <h2 className="text-lg font-bold text-cream-900 mb-2">✏️ Luyện tập</h2>
        <p className="text-sm text-stone-600 mb-4">
          Hệ thống sẽ chọn câu hỏi phù hợp với trình độ hiện tại (BKT adaptive).
        </p>
        <Link
          to={`/student/topics/${topicIdNum}/practice`}
          className="inline-block px-5 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 shadow-md shadow-orange-500/25"
        >
          {mastery?.status === 'completed' ? 'Luyện tập thêm' : 'Bắt đầu luyện tập'}
        </Link>
      </section>
    </div>
  )
}