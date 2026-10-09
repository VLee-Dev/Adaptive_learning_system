import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface LessonDetail {
  id: number
  topic_id: number
  name: string
  content_type: 'text' | 'image' | 'video'
  content: string
  content_url: string | null
  order_index: number
  created_at: string
}

interface Topic {
  id: number
  chapter_id: number
  name: string
  description: string | null
}

interface LessonSummary {
  id: number
  topic_id: number
  name: string
  content_type: string
  order_index: number
}

const TYPE_ICON: Record<string, string> = {
  text: '📄',
  image: '🖼️',
  video: '🎥',
}

export default function StudentLessonViewPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const lessonIdNum = Number(lessonId)
  const navigate = useNavigate()

  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [allLessons, setAllLessons] = useState<LessonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lessonIdNum) return
    setLoading(true)

    api
      .get<LessonDetail>(`/lessons/${lessonIdNum}`)
      .then(async (r) => {
        setLesson(r.data)

        // Fetch topic info
        const topicRes = await api.get<Topic>(`/topics/${r.data.topic_id}`)
        setTopic(topicRes.data)

        // Fetch all lessons in this topic
        const lessonsRes = await api.get<LessonSummary[]>(`/topics/${r.data.topic_id}/lessons`)
        setAllLessons(lessonsRes.data)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [lessonIdNum])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-stone-500">Đang tải...</div>
      </div>
    )
  }

  if (error || !lesson || !topic) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error || 'Không tìm thấy bài học'}
        </div>
      </div>
    )
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lessonIdNum)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Top Navigation Bar */}
      <div className="bg-[#FFFDF9]/90 backdrop-blur border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to={`/student/topics/${topic.id}`}
            className="flex items-center gap-2 text-stone-700 hover:text-orange-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Quay về chủ đề</span>
          </Link>

          <div className="text-sm text-stone-600">
            Bài {currentIndex + 1} / {allLessons.length}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-0">
        {/* Main Content */}
        <div className="bg-[#FFFDF9]/90 backdrop-blur">
          {/* Lesson Title */}
          <div className="border-b border-cream-200 px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
              <span>{TYPE_ICON[lesson.content_type]}</span>
              <span>{topic.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-cream-900">{lesson.name}</h1>
          </div>

          {/* Lesson Content */}
          <div className="p-6">
            {lesson.content_type === 'video' && (
              <div className="bg-stone-900 rounded-xl overflow-hidden mb-6 shadow-lg">
                <video
                  src={lesson.content_url ?? lesson.content}
                  controls
                  className="w-full aspect-video"
                  controlsList="nodownload"
                />
              </div>
            )}

            {lesson.content_type === 'image' && (
              <div className="mb-6">
                <img
                  src={lesson.content_url ?? lesson.content}
                  alt={lesson.name}
                  className="w-full rounded-xl shadow-md"
                />
              </div>
            )}

            {lesson.content_type === 'text' && (
              <div className="prose prose-lg max-w-none text-stone-800 leading-relaxed whitespace-pre-wrap">
                {lesson.content}
              </div>
            )}

            {lesson.content && lesson.content_type !== 'text' && (
              <div className="mt-4 text-stone-700 whitespace-pre-wrap">
                {lesson.content}
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="border-t border-cream-200 px-6 py-4 flex items-center justify-between bg-cream-50">
            {prevLesson ? (
              <button
                onClick={() => navigate(`/student/lessons/${prevLesson.id}`)}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Bài trước
              </button>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <button
                onClick={() => navigate(`/student/lessons/${nextLesson.id}`)}
                className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-xl hover:bg-orange-700 font-medium transition shadow-md shadow-orange-500/25"
              >
                Bài tiếp theo
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <Link
                to={`/student/topics/${topic.id}/practice`}
                className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700 font-medium transition shadow-md shadow-green-500/25"
              >
                Luyện tập chủ đề này →
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar - Lesson List */}
        <div className="bg-[#FFFDF9]/90 backdrop-blur border-l border-cream-200 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-4 border-b border-cream-200 bg-cream-50">
            <h2 className="font-bold text-cream-900">Nội dung chủ đề</h2>
            <p className="text-sm text-stone-600 mt-1">{allLessons.length} bài học</p>
          </div>

          <div className="divide-y divide-cream-100">
            {allLessons.map((l, idx) => (
              <Link
                key={l.id}
                to={`/student/lessons/${l.id}`}
                className={`block p-4 hover:bg-orange-50 transition ${
                  l.id === lessonIdNum ? 'bg-orange-50 border-l-4 border-orange-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-sm font-medium text-stone-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{TYPE_ICON[l.content_type]}</span>
                      {l.id === lessonIdNum && (
                        <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded-lg">
                          Đang học
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm font-medium ${
                      l.id === lessonIdNum ? 'text-orange-600' : 'text-cream-900'
                    }`}>
                      {l.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Practice Button in Sidebar */}
          <div className="p-4 border-t border-cream-200">
            <Link
              to={`/student/topics/${topic.id}/practice`}
              className="block w-full bg-orange-600 text-white text-center py-3 rounded-xl hover:bg-orange-700 font-medium transition shadow-md shadow-orange-500/25"
            >
              🎯 Luyện tập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
