import { useEffect, useState } from 'react'
import api from '@/lib/api'

/**
 * ReviewBanner — B3: hướng dẫn user thoát trạng thái `review_required`.
 *
 * Điều kiện thoát (xem `backend/app/mastery/service.py`):
 *   1. Đã xem bài giảng của topic (nếu topic có bài giảng)
 *   2. Làm đúng `correct_required` câu liên tiếp
 *
 * Trạng thái "light": KHÔNG khoá lộ trình — user vẫn làm được câu hỏi,
 * chỉ là hệ thống chuyển sang chế độ ưu tiên ôn lại chỗ sai.
 */

export interface ReviewProgress {
  lesson_required: boolean
  lesson_completed: boolean
  correct_required: number
  correct_done: number
  consecutive_wrong: number
  recent_accuracy: number
}

interface Props {
  topicId: number
  progress?: ReviewProgress
  suggestedLessonId: number | null
  onOpenLesson: (lessonId: number) => void
}

export default function ReviewBanner({
  topicId,
  progress,
  suggestedLessonId,
  onOpenLesson,
}: Props) {
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState(false)

  // Nếu backend đã ghi nhận user đã xem bài giảng thì không cần gọi lại.
  useEffect(() => {
    if (progress?.lesson_completed) setMarked(true)
  }, [progress?.lesson_completed])

  const lessonRequired = progress?.lesson_required ?? false
  const lessonDone = marked || progress?.lesson_completed
  const correctDone = progress?.correct_done ?? 0
  const correctRequired = progress?.correct_required ?? 3
  const correctCleared = correctDone >= correctRequired

  /**
   * Đánh dấu "đã xem bài giảng". Gọi khi user mở bài giảng, vì backend chỉ
   * chấp nhận `lesson_viewed_at >= review_triggered_at` — tức phải xem SAU khi
   * bị yêu cầu ôn lại.
   */
  const markLessonViewed = async () => {
    setMarking(true)
    try {
      await api.post(`/learning/topics/${topicId}/review/lesson-viewed`)
      setMarked(true)
    } catch {
      // Bỏ qua lỗi mạng — banner vẫn hiển thị để user tự đọc bài giảng.
    } finally {
      setMarking(false)
    }
  }

  const handleOpenLesson = () => {
    if (!suggestedLessonId) return
    onOpenLesson(suggestedLessonId)
    void markLessonViewed()
  }

  return (
    <div className="p-4 rounded-2xl border border-red-200 bg-red-50 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none">⚠️</span>
        <div className="flex-1">
          <div className="font-bold text-sm text-red-800">Cần ôn lại chủ đề này</div>
          <p className="text-xs text-red-700 mt-0.5">
            Bạn đang sai nhiều câu gần đây. Hệ thống đã chuyển sang ưu tiên ôn lại
            đúng những chỗ bạn hay sai.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {/* Bước 1: xem bài giảng */}
        {lessonRequired && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                lessonDone ? 'bg-green-500 text-white' : 'bg-red-200 text-red-700'
              }`}
            >
              {lessonDone ? '✓' : '1'}
            </span>
            <span className={lessonDone ? 'text-green-700 line-through' : 'text-red-800'}>
              Xem lại bài giảng
            </span>
            {!lessonDone && suggestedLessonId && (
              <button
                type="button"
                onClick={handleOpenLesson}
                disabled={marking}
                className="ml-auto px-2.5 py-1 rounded-lg bg-white border border-red-300 text-red-700 font-semibold hover:bg-red-100 disabled:opacity-50 transition"
              >
                {marking ? 'Đang mở…' : 'Xem bài giảng'}
              </button>
            )}
          </div>
        )}

        {/* Bước 2: làm đúng N câu liên tiếp */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
              correctCleared ? 'bg-green-500 text-white' : 'bg-red-200 text-red-700'
            }`}
          >
            {correctCleared ? '✓' : lessonRequired ? '2' : '1'}
          </span>
          <span className={correctCleared ? 'text-green-700' : 'text-red-800'}>
            Làm đúng {correctRequired} câu liên tiếp
          </span>
          <span className="ml-auto font-mono text-red-800">
            {correctDone}/{correctRequired}
          </span>
        </div>

        {progress && progress.consecutive_wrong > 0 && (
          <div className="text-[11px] text-red-600 pl-6">
            Bạn đang sai {progress.consecutive_wrong} câu liên tiếp
          </div>
        )}
      </div>
    </div>
  )
}
