// B8. StudentChapterTestPage - chapter final test
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'

interface TestQuestion {
  question_id: number
  slot_index: number
  text: string
  options: string[]
}

interface TestStart {
  test_session_id: string
  chapter_id: number
  total_questions: number
  pass_percent: number
  questions: TestQuestion[]
}

interface TestResult {
  slot_index: number
  question_id: number
  selected_answer: string
  correct_answer: string
  is_correct: boolean
  explanation: string | null
}

interface TestSubmit {
  passed: boolean
  score_percent: number
  pass_percent: number
  correct_count: number
  total_questions: number
  chapter_completed: boolean
  detailed_results: TestResult[]
}

export default function StudentChapterTestPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const chapterIdNum = Number(chapterId)

  const [session, setSession] = useState<TestStart | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentSlot, setCurrentSlot] = useState(1)
  const [result, setResult] = useState<TestSubmit | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start test on mount
  useEffect(() => {
    if (!chapterIdNum) return
    setLoading(true)
    api
      .post<TestStart>(`/learning/chapters/${chapterIdNum}/test/start`)
      .then((r) => {
        setSession(r.data)
        // Pre-fill answers with empty string for all slots
        const initial: Record<number, string> = {}
        r.data.questions.forEach((q) => {
          initial[q.slot_index] = ''
        })
        setAnswers(initial)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [chapterIdNum])

  const handleSubmitTest = async () => {
    if (!session) return
    setSubmitting(true)
    setError(null)
    try {
      // Only send answers for slots that have been answered
      const filled = Object.fromEntries(
        Object.entries(answers).filter(([_, v]) => v && v.length > 0),
      )
      const r = await api.post<TestSubmit>('/learning/chapters/test/submit', {
        test_session_id: session.test_session_id,
        answers: filled,
      })
      setResult(r.data)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tạo bài kiểm tra…</div>

  if (error) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
        <Link
          to={`/student/chapters/${chapterIdNum}`}
          className="inline-block px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
        >
          ← Quay lại chương
        </Link>
      </div>
    )
  }

  // Result screen
  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div
          className={`p-6 rounded-2xl border shadow-cozy ${
            result.passed
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="text-4xl mb-2">{result.passed ? '🎉' : '😢'}</div>
          <h2 className="text-2xl font-bold">
            {result.passed ? 'Chúc mừng! Bạn đã vượt qua' : 'Chưa đạt, hãy thử lại'}
          </h2>
          <div className="mt-3 text-lg">
            Điểm: <span className="font-bold">{result.score_percent.toFixed(0)}%</span>
            {' '}
            <span className="text-stone-600">
              ({result.correct_count}/{result.total_questions} câu đúng)
            </span>
          </div>
          <div className="text-sm text-stone-600 mt-1">
            Yêu cầu: {result.pass_percent}% ·{' '}
            {result.passed ? '✓ Đạt' : '✗ Chưa đạt'}
          </div>
          {result.chapter_completed && (
            <div className="mt-3 p-3 bg-white rounded-lg text-sm font-semibold text-green-800">
              ✓ Chương này đã được đánh dấu hoàn thành!
            </div>
          )}
        </div>

        <section className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-5">
          <h3 className="font-bold text-cream-900 mb-3">📋 Chi tiết từng câu</h3>
          <div className="space-y-3">
            {result.detailed_results
              .sort((a, b) => a.slot_index - b.slot_index)
              .map((r) => (
                <div
                  key={r.slot_index}
                  className={`p-3 rounded-xl border ${
                    r.is_correct
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-stone-500">Câu {r.slot_index}</span>
                    <span className={r.is_correct ? 'text-green-700' : 'text-red-700'}>
                      {r.is_correct ? '✓ Đúng' : '✗ Sai'}
                    </span>
                  </div>
                  <div className="text-sm text-stone-700">
                    Bạn chọn: <span className="font-semibold">{r.selected_answer || '(bỏ trống)'}</span>
                  </div>
                  {!r.is_correct && (
                    <div className="text-sm text-stone-700">
                      Đáp án đúng: <span className="font-semibold text-green-700">{r.correct_answer}</span>
                    </div>
                  )}
                  {r.explanation && (
                    <div className="text-sm text-stone-600 mt-1">💡 {r.explanation}</div>
                  )}
                </div>
              ))}
          </div>
        </section>

        <div className="flex gap-3">
          <Link
            to={`/student/chapters/${chapterIdNum}`}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
          >
            ← Quay lại chương
          </Link>
          {!result.passed && (
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 shadow-md shadow-orange-500/25"
            >
              Làm lại
            </button>
          )}
        </div>
      </div>
    )
  }

  // Test in progress
  if (!session) return null

  const currentQ = session.questions.find((q) => q.slot_index === currentSlot)
  const totalAnswered = Object.values(answers).filter((v) => v && v.length > 0).length
  const allAnswered = totalAnswered === session.total_questions

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={`/student/chapters/${chapterIdNum}`}
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200"
        >
          ← Thoát
        </Link>
        <div className="text-sm text-stone-600">
          Câu <span className="font-bold">{currentSlot}</span> / {session.total_questions} ·{' '}
          Đã làm: <span className="font-bold">{totalAnswered}</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex flex-wrap gap-2 justify-center">
        {session.questions.map((q) => (
          <button
            key={q.slot_index}
            onClick={() => setCurrentSlot(q.slot_index)}
            className={`w-9 h-9 rounded-full text-sm font-bold transition ${
              currentSlot === q.slot_index
                ? 'bg-orange-600 text-white'
                : answers[q.slot_index]
                ? 'bg-green-200 text-green-800'
                : 'bg-stone-200 text-stone-600'
            }`}
          >
            {q.slot_index}
          </button>
        ))}
      </div>

      {currentQ && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
          <h2 className="text-lg font-bold text-cream-900 mb-4">
            Câu {currentQ.slot_index}: {currentQ.text}
          </h2>
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [currentQ.slot_index]: opt }))
                }
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                  answers[currentQ.slot_index] === opt
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-cream-200 hover:border-orange-300 bg-[#FFFDF9]'
                }`}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentSlot((s) => Math.max(1, s - 1))}
              disabled={currentSlot === 1}
              className="px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200 disabled:opacity-50"
            >
              ← Câu trước
            </button>
            {currentSlot < session.total_questions ? (
              <button
                onClick={() => setCurrentSlot((s) => Math.min(session.total_questions, s + 1))}
                className="px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
              >
                Câu tiếp →
              </button>
            ) : (
              <button
                onClick={handleSubmitTest}
                disabled={!allAnswered || submitting}
                className="px-5 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-500/25"
              >
                {submitting ? 'Đang nộp bài…' : allAnswered ? 'Nộp bài' : `Còn ${session.total_questions - totalAnswered} câu`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}