// StudentPracticePage - luyện tập theo BKT (luật tối giản 2026-10-23)
//
// Thay đổi so với bản trước:
// - "Cần ôn lại" KHÔNG còn là trạng thái → giờ là *thông báo* `warning` kèm
//   link về bài giảng. Người học vẫn làm tiếp được.
// - Mỗi lượt thi tối đa 20 câu. Đủ 20 câu + ≥10 đúng → pass.
// - Sau khi pass, bấm luyện lại → không tính BKT, chỉ ghi thống kê câu đúng/sai.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { toApiError } from '@/lib/api'
import { useStudySession } from '@/hooks/useStudySession'

interface PracticeQuestion {
  question_id: number
  text: string
  options: string[]
  level: number
  // C2: vì sao chọn câu này
  selection_reason?: string | null
  // true nếu đang ôn lại câu đã làm trước đó
  is_retry?: boolean
}

/** Kết quả 1 câu trong lượt luyện lại (sau khi đã pass). */
interface PracticeAnswerResult {
  question_id: number
  is_correct: boolean
  correct_answer: string
}

/** Tổng kết lượt luyện tập. */
interface PracticeSummary {
  total: number
  correct: number
  wrong: number
  accuracy: number
  /** Chi tiết câu đúng/sai (chỉ có ở lượt luyện lại). */
  results?: PracticeAnswerResult[]
}

/**
 * GET /practice/next trả 200 kèm `question: null` + `note` khi hết câu phù hợp.
 * Trước đây endpoint trả 404, khiến trang hiện màn lỗi "Chưa có câu hỏi" dù
 * thực ra chỉ là đã ôn xong chủ đề.
 */
interface NextQuestionResponse {
  question: PracticeQuestion | null
  note?: string | null
  /** Topic đã pass → lượt luyện lại (không tính BKT). */
  passed?: boolean
  is_extra_practice?: boolean
  attempts_used?: number
  attempts_limit?: number
}

interface NextResponse {
  is_correct?: boolean
  correct_answer?: string
  explanation?: string | null
  updated_mastery: number
  current_level: number
  status: 'in_progress' | 'completed'
  next_question: PracticeQuestion | null
  // C2: lý do không có câu tiếp theo (hết câu phù hợp / đủ 20 câu)
  selection_note?: string | null
  // Thông báo "hãy học kỹ hơn" (KHÔNG phải trạng thái)
  warning?: string | null
  lesson_url?: string | null
  suggested_lesson_id?: number | null
  // Lượt thi
  attempts_used?: number
  attempts_limit?: number
  passed?: boolean
  is_extra_practice?: boolean
  summary?: PracticeSummary
}

interface TopicMastery {
  topic_id: number
  topic_name: string
  mastery: number
  current_level: number
  status: 'in_progress' | 'completed'
  practice_attempts?: number
  passed?: boolean
}

type Status = NextResponse['status']

const STATUS_LABEL: Record<Status, { label: string; color: string; emoji: string }> = {
  in_progress: { label: 'Đang học', color: 'bg-blue-100 text-blue-700', emoji: '📚' },
  completed: { label: 'Hoàn thành!', color: 'bg-green-100 text-green-700', emoji: '🎉' },
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
    status: Status
    warning?: string | null
    lessonUrl?: string | null
    passed?: boolean
    isExtraPractice?: boolean
  } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  // C2: ghi chú khi không có câu hỏi phù hợp
  const [selectionNote, setSelectionNote] = useState<string | null>(null)
  // Thông báo "hãy học kỹ hơn" + link về bài giảng
  const [warning, setWarning] = useState<string | null>(null)
  const [lessonUrl, setLessonUrl] = useState<string | null>(null)
  // Số câu đã làm / tổng số câu của lượt thi
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [attemptsLimit, setAttemptsLimit] = useState(20)
  // Lượt luyện lại sau khi đã pass (không tính BKT)
  const [extraPractice, setExtraPractice] = useState(false)
  const [extraSummary, setExtraSummary] = useState<PracticeSummary | null>(null)

  // Đo thời gian học thực tế → cập nhật calendar "Lịch học của bạn"
  useStudySession({
    kind: 'practice',
    referenceId: Number.isFinite(topicIdNum) ? topicIdNum : null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initial load: fetch topic info + first question
  useEffect(() => {
    if (!topicIdNum) return
    setLoading(true)
    Promise.all([
      api.get<TopicMastery>(`/learning/topics/${topicIdNum}/mastery`),
      api.get<NextQuestionResponse>(`/learning/topics/${topicIdNum}/practice/next`),
    ])
      .then(([mRes, qRes]) => {
        setTopic(mRes.data)
        setQuestion(qRes.data.question)
        setSelectionNote(qRes.data.note ?? null)
        setExtraPractice(qRes.data.is_extra_practice ?? false)
        setAttemptsUsed(qRes.data.attempts_used ?? 0)
        setAttemptsLimit(qRes.data.attempts_limit ?? 20)
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
        warning: r.data.warning ?? null,
        lessonUrl: r.data.lesson_url ?? null,
        passed: r.data.passed ?? false,
        isExtraPractice: r.data.is_extra_practice ?? false,
      })
      setQuestion(r.data.next_question)
      setSelectionNote(r.data.selection_note ?? null)
      setWarning(r.data.warning ?? null)
      setLessonUrl(r.data.lesson_url ?? null)
      setAttemptsUsed(r.data.attempts_used ?? 0)
      setAttemptsLimit(r.data.attempts_limit ?? 20)
      setExtraPractice(r.data.is_extra_practice ?? false)
      // Lượt luyện lại sau khi đã pass: chỉ ghi thống kê câu đúng/sai.
      setExtraSummary(r.data.is_extra_practice ? (r.data.summary ?? null) : null)
      setSelected(null)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải câu hỏi…</div>

  // --- Màn tổng kết lượt luyện lại (sau khi đã pass) ---
  if (extraPractice && extraSummary && !question) {
    const pct = Math.round(extraSummary.accuracy * 100)
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border bg-green-50 border-green-200 text-center shadow-cozy">
          <div className="text-4xl mb-2">📝</div>
          <h2 className="text-2xl font-bold text-green-800">Kết quả lượt ôn thêm</h2>
          <p className="mt-2 text-sm text-stone-700">
            {extraSummary.total} câu · Đúng {extraSummary.correct} · Sai {extraSummary.wrong} ·{' '}
            <span className="font-bold">{pct}%</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Lượt này không tính lại độ chắc — chủ đề đã hoàn thành.
          </p>
        </div>

        {extraSummary.results && extraSummary.results.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-stone-700 mb-2">Chi tiết từng câu</h3>
            <div className="space-y-1">
              {extraSummary.results.map((r, i) => (
                <div
                  key={`${r.question_id}-${i}`}
                  className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-stone-50"
                >
                  <span className="text-stone-600">Câu {i + 1}</span>
                  <span
                    className={`font-semibold ${r.is_correct ? 'text-green-700' : 'text-red-600'}`}
                  >
                    {r.is_correct ? '✓ Đúng' : '✗ Sai'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            to={`/student/topics/${topicIdNum}`}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
          >
            ← Quay lại chủ đề
          </Link>
        </div>
      </div>
    )
  }

  // --- Kết thúc lượt thi: đủ 20 câu hoặc đã pass ---
  if (!question && lastResult) {
    const meta = STATUS_LABEL[lastResult.status]
    const pct = Math.round(lastResult.mastery * 100)
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className={`p-6 rounded-2xl border text-center ${meta.color} shadow-cozy`}>
          <div className="text-4xl mb-2">{meta.emoji}</div>
          <h2 className="text-2xl font-bold">{meta.label}</h2>
          <p className="mt-2 text-sm">
            Mastery: {pct}% · Level {lastResult.level}
          </p>
          {lastResult.status === 'completed' ? (
            <p className="mt-2 text-sm font-semibold">
              🎉 Bạn đã hoàn thành chủ đề này! Hãy thử làm các chủ đề khác.
            </p>
          ) : (
            <p className="mt-2 text-sm">
              Bạn đã làm đủ {attemptsLimit} câu. Quay lại để ôn thêm nếu muốn.
            </p>
          )}
        </div>

        {warning && (
          <WarningBanner message={warning} lessonUrl={lessonUrl ?? lastResult.lessonUrl ?? null} />
        )}

        <div className="flex gap-3">
          <Link
            to={`/student/topics/${topicIdNum}`}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
          >
            ← Quay lại chủ đề
          </Link>
          {lastResult.status !== 'completed' && (
            <Link
              to={`/student/topics/${topicIdNum}/practice`}
              className="flex-1 text-center px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 shadow-md shadow-orange-500/25"
            >
              Làm tiếp
            </Link>
          )}
        </div>
      </div>
    )
  }

  // Hết câu hỏi. Phân biệt rõ 3 trường hợp thay vì hiện chung "Chưa có câu hỏi":
  // topic rỗng / đã ôn hết / chưa bắt đầu.
  if (!question) {
    const isEmptyTopic = selectionNote?.includes('chưa có câu hỏi')
    return (
      <div className="max-w-2xl mx-auto bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-8 text-center shadow-cozy">
        <div className="text-3xl mb-2">{isEmptyTopic ? '🤔' : '✅'}</div>
        <h2 className="text-xl font-bold text-cream-900 mb-2">
          {isEmptyTopic ? 'Chủ đề chưa có câu hỏi' : 'Đã ôn hết chủ đề này'}
        </h2>
        <p className="text-stone-600">
          {selectionNote ?? 'Bạn đã làm hết các câu hỏi luyện tập của chủ đề này.'}
        </p>
        <Link
          to={`/student/topics/${topicIdNum}`}
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
        >
          ← Quay lại
        </Link>
      </div>
    )
  }

  const masteryPct = lastResult ? Math.round(lastResult.mastery * 100) : 0
  const progressPct = Math.min(100, Math.round((attemptsUsed / attemptsLimit) * 100))

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

      {/* Tiến độ lượt thi: x / 20 câu */}
      {!extraPractice && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-stone-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-stone-500 font-medium shrink-0">
            {attemptsUsed}/{attemptsLimit} câu
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Thông báo "hãy học kỹ hơn" + link về bài giảng */}
      {warning && (
        <WarningBanner message={warning} lessonUrl={lessonUrl ?? lastResult?.lessonUrl ?? null} />
      )}

      {/* C2: Ghi chú khi không tìm được câu hỏi phù hợp */}
      {selectionNote && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          ℹ️ {selectionNote}
        </div>
      )}

      {/* Last result feedback */}
      {lastResult && (
        <div
          className={`p-4 rounded-2xl border ${
            lastResult.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
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
      <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-stone-500">Level {question.level}</div>
          {question.selection_reason && (
            <div className="text-xs text-orange-600 font-medium">
              {question.is_retry ? '🔁 ' : '🎯 '}
              {question.selection_reason}
            </div>
          )}
        </div>
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
    </div>
  )
}

/**
 * WarningBanner — thông báo "hãy học kỹ hơn" kèm link quay lại bài giảng.
 *
 * KHÔNG phải trạng thái chặn: người học vẫn làm tiếp được. Chỉ là nhắc họ
 * đọc lại bài giảng trước khi tiếp tục.
 */
function WarningBanner({
  message,
  lessonUrl,
}: {
  message: string
  lessonUrl: string | null
}) {
  const lessonId = lessonUrl ? Number(lessonUrl.split('/').pop()) : null
  const hasLesson = lessonId !== null && Number.isFinite(lessonId)

  return (
    <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none">⚠️</span>
        <div className="flex-1">
          <div className="font-bold text-sm text-amber-900">{message}</div>
          <p className="text-xs text-amber-800 mt-0.5">
            Bạn đang sai nhiều câu liên tiếp. Đọc lại bài giảng sẽ giúp bạn nắm
            chắc hơn trước khi tiếp tục.
          </p>
        </div>
      </div>
      {hasLesson && (
        <Link
          to={`/student/lessons/${lessonId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 font-semibold hover:bg-amber-100 transition shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          Xem lại bài giảng
        </Link>
      )}
    </div>
  )
}
