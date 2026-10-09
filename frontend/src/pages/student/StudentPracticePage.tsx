// B7. StudentPracticePage - BKT adaptive practice session
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface PracticeQuestion {
  question_id: number
  text: string
  options: string[]
  level: number
}

interface NextResponse {
  is_correct?: boolean
  correct_answer?: string
  explanation?: string | null
  updated_mastery: number
  current_level: number
  status: 'in_progress' | 'completed' | 'review_required'
  next_question: PracticeQuestion | null
}

interface TopicMastery {
  topic_id: number
  topic_name: string
  mastery: number
  current_level: number
  status: 'in_progress' | 'completed' | 'review_required'
}

const STATUS_LABEL: Record<NextResponse['status'], { label: string; color: string; emoji: string }> = {
  in_progress: { label: 'Đang học', color: 'bg-blue-100 text-blue-700', emoji: '📚' },
  completed: { label: 'Hoàn thành!', color: 'bg-green-100 text-green-700', emoji: '🎉' },
  review_required: { label: 'Cần ôn lại', color: 'bg-red-100 text-red-700', emoji: '⚠️' },
}

export default function StudentPracticePage() {
  const { topicId } = useParams<{ topicId: string }>()
  const topicIdNum = Number(topicId)

  const [topic, setTopic] = useState<TopicMastery | null>(null)
  const [question, setQuestion] = useState<PracticeQuestion | null>(null)
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean
    correct: string
    explanation: string | null
    mastery: number
    level: number
    status: NextResponse['status']
  } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initial load: fetch topic info + first question
  useEffect(() => {
    if (!topicIdNum) return
    setLoading(true)
    Promise.all([
      api.get<TopicMastery>(`/learning/topics/${topicIdNum}/mastery`),
      api.get<PracticeQuestion>(`/learning/topics/${topicIdNum}/practice/next`),
    ])
      .then(([mRes, qRes]) => {
        setTopic(mRes.data)
        setQuestion(qRes.data)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [topicIdNum])

  const handleSubmit = async () => {
    if (!question || selected === null) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await api.post<NextResponse>(`/learning/topics/${topicIdNum}/practice/answer`, {
        question_id: question.question_id,
        selected_answer: selected,
      })
      setLastResult({
        isCorrect: r.data.is_correct ?? false,
        correct: r.data.correct_answer ?? '',
        explanation: r.data.explanation ?? null,
        mastery: r.data.updated_mastery,
        level: r.data.current_level,
        status: r.data.status,
      })
      setQuestion(r.data.next_question)
      setSelected(null)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải câu hỏi…</div>

  // No questions at all
  if (!question && !lastResult) {
    return (
      <div className="max-w-2xl mx-auto bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-8 text-center shadow-cozy">
        <div className="text-3xl mb-2">🤔</div>
        <h2 className="text-xl font-bold text-cream-900 mb-2">Chưa có câu hỏi</h2>
        <p className="text-stone-600">Chủ đề này hiện chưa có câu hỏi luyện tập.</p>
        <Link
          to={`/student/topics/${topicIdNum}`}
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
        >
          ← Quay lại
        </Link>
      </div>
    )
  }

  // Practice finished (status: completed or no more questions)
  if (!question && lastResult) {
    const meta = STATUS_LABEL[lastResult.status]
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className={`p-6 rounded-2xl border ${meta.color} shadow-cozy`}>
          <div className="text-4xl mb-2">{meta.emoji}</div>
          <h2 className="text-2xl font-bold">{meta.label}</h2>
          <p className="mt-2 text-sm">
            Mastery: {Math.round(lastResult.mastery * 100)}% · Level {lastResult.level}
          </p>
          {lastResult.status === 'completed' && (
            <p className="mt-2 text-sm">
              Bạn đã hoàn thành chủ đề này! Hãy thử làm các chủ đề khác.
            </p>
          )}
          {lastResult.status === 'review_required' && (
            <p className="mt-2 text-sm">
              Bạn nên xem lại bài giảng trước khi tiếp tục.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            to={`/student/topics/${topicIdNum}`}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
          >
            ← Quay lại chủ đề
          </Link>
          <Link
            to={`/student/topics/${topicIdNum}/practice`}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 shadow-md shadow-orange-500/25"
          >
            Làm tiếp
          </Link>
        </div>
      </div>
    )
  }

  const masteryPct = lastResult ? Math.round(lastResult.mastery * 100) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/student/topics/${topicIdNum}`}
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200"
        >
          ← Thoát
        </Link>
        {topic && (
          <div className="text-right">
            <div className="text-xs text-stone-500">{topic.topic_name}</div>
            <div className="text-sm font-bold text-stone-700">
              Level {lastResult ? lastResult.level : topic.current_level}
              {lastResult && ` · ${masteryPct}%`}
            </div>
          </div>
        )}
      </div>

      {/* Mastery bar (after first answer) */}
      {lastResult && (
        <div className="w-full bg-stone-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              lastResult.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${masteryPct}%` }}
          />
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Last result feedback */}
      {lastResult && (
        <div
          className={`p-4 rounded-2xl border ${
            lastResult.isCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="font-bold text-sm mb-1">
            {lastResult.isCorrect ? '✓ Chính xác!' : '✗ Sai rồi'}
          </div>
          {!lastResult.isCorrect && (
            <div className="text-sm text-stone-700">
              Đáp án đúng: <span className="font-bold">{lastResult.correct}</span>
            </div>
          )}
          {lastResult.explanation && (
            <div className="text-sm text-stone-600 mt-1">💡 {lastResult.explanation}</div>
          )}
        </div>
      )}

      {/* Current question */}
      {question && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
          <div className="text-xs text-stone-500 mb-2">Level {question.level}</div>
          <h2 className="text-lg font-bold text-cream-900 mb-4">{question.text}</h2>
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const isSelected = selected === opt
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(opt)}
                  disabled={submitting}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-cream-200 hover:border-orange-300 bg-[#FFFDF9]'
                  }`}
                >
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            className="mt-4 w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/25"
          >
            {submitting ? 'Đang chấm…' : 'Nộp câu trả lời'}
          </button>
        </div>
      )}
    </div>
  )
}