import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  lessonAdminGet,
  questionAdminGet,
  type Lesson,
  type Question,
} from '@/lib/adminApi'
import { toApiError } from '@/lib/api'
import { LESSON_CONTENT_TYPES, type LessonContentType } from '@/types/lesson'
import { QUESTION_PURPOSES, type QuestionPurpose } from '@/types/question'

export default function AdminTopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const topicIdNum = Number(topicId)

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // lesson create form
  const [lessonName, setLessonName] = useState('')
  const [lessonType, setLessonType] = useState<LessonContentType>('text')
  const [lessonContent, setLessonContent] = useState('')
  const [lessonContentUrl, setLessonContentUrl] = useState('')
  const [lessonOrder, setLessonOrder] = useState(1)
  const [lessonSubmitting, setLessonSubmitting] = useState(false)

  // question create form
  const [qPurpose, setQPurpose] = useState<QuestionPurpose>('practice')
  const [qFormat, setQFormat] = useState('standard')
  const [qText, setQText] = useState('')
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', ''])
  const [qCorrect, setQCorrect] = useState('')
  const [qLevel, setQLevel] = useState<number | ''>('')
  const [qSubmitting, setQSubmitting] = useState(false)

  const load = async () => {
    if (!topicIdNum) return
    setLoading(true)
    try {
      const [ls, qs] = await Promise.all([
        lessonAdminGet.list(topicIdNum),
        questionAdminGet.list(topicIdNum),
      ])
      setLessons(ls)
      setQuestions(qs)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicIdNum])

  // ---------- Lesson handlers ----------
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLessonSubmitting(true)
    try {
      await lessonAdminGet.create(topicIdNum, {
        name: lessonName.trim(),
        content_type: lessonType,
        content: lessonContent,
        content_url: lessonContentUrl.trim() || undefined,
        order_index: lessonOrder,
      })
      setLessonName('')
      setLessonContent('')
      setLessonContentUrl('')
      setLessonOrder((o) => o + 1)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLessonSubmitting(false)
    }
  }

  const deleteLesson = async (id: number, name: string) => {
    if (!confirm(`Xóa bài học "${name}"?`)) return
    setError(null)
    try {
      await lessonAdminGet.remove(id)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  // ---------- Question handlers ----------
  const setOption = (i: number, value: string) => {
    setQOptions((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setQSubmitting(true)
    try {
      await questionAdminGet.create(topicIdNum, {
        purpose: qPurpose,
        question_format: qFormat as Question['question_format'],
        question_text: qText.trim(),
        options: qOptions.map((o) => o.trim()),
        correct_answer: qCorrect.trim(),
        level: qPurpose === 'practice' && qLevel !== '' ? Number(qLevel) : undefined,
      })
      setQText('')
      setQOptions(['', '', '', ''])
      setQCorrect('')
      setQLevel('')
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setQSubmitting(false)
    }
  }

  const deleteQuestion = async (id: number) => {
    if (!confirm(`Xóa câu hỏi #${id}?`)) return
    setError(null)
    try {
      await questionAdminGet.remove(id)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Chủ đề #{topicIdNum}</h1>
        <Link
          to={`/admin/topics/${topicIdNum}/practice-config`}
          className="px-4 py-2 rounded-xl bg-purple-100 text-purple-700 font-semibold text-sm hover:bg-purple-200"
        >
          ⚙️ Practice Config
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---------------- Lessons ---------------- */}
      <section>
        <h2 className="text-lg font-bold text-stone-800 mb-3">Bài học ({lessons.length})</h2>

        <form
          onSubmit={handleCreateLesson}
          className="mb-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
        >
          <h3 className="font-semibold text-stone-700">+ Thêm bài học</h3>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3">
            <input
              required
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              placeholder="Tên bài học *"
              className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
            />
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as LessonContentType)}
              className="px-3 py-2 border border-stone-300 rounded-lg bg-white"
            >
              {LESSON_CONTENT_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              required
              min={1}
              value={lessonOrder}
              onChange={(e) => setLessonOrder(Number(e.target.value))}
              placeholder="Thứ tự"
              className="px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>
          <textarea
            value={lessonContent}
            onChange={(e) => setLessonContent(e.target.value)}
            placeholder="Nội dung bài học *"
            required
            rows={3}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
          <input
            value={lessonContentUrl}
            onChange={(e) => setLessonContentUrl(e.target.value)}
            placeholder="URL (tuỳ chọn, dùng cho image/video)"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
          <button
            type="submit"
            disabled={lessonSubmitting}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {lessonSubmitting ? 'Đang tạo…' : 'Tạo bài học'}
          </button>
        </form>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3 w-28">Loại</th>
                <th className="px-4 py-3 w-20">TT</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                    Chưa có bài học.
                  </td>
                </tr>
              ) : (
                lessons.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500">{l.id}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">{l.name}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {LESSON_CONTENT_TYPES.find((x) => x.value === l.content_type)?.label ??
                        l.content_type}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{l.order_index}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Link
                        to={`/admin/topics/${topicIdNum}/lessons/${l.id}`}
                        className="inline-block px-3 py-1 text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        Sửa
                      </Link>
                      <button
                        onClick={() => deleteLesson(l.id, l.name)}
                        className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Questions ---------------- */}
      <section>
        <h2 className="text-lg font-bold text-stone-800 mb-3">Câu hỏi ({questions.length})</h2>

        <form
          onSubmit={handleCreateQuestion}
          className="mb-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
        >
          <h3 className="font-semibold text-stone-700">+ Thêm câu hỏi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={qPurpose}
              onChange={(e) => setQPurpose(e.target.value as QuestionPurpose)}
              className="px-3 py-2 border border-stone-300 rounded-lg bg-white"
            >
              {QUESTION_PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={qFormat}
              onChange={(e) => setQFormat(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg bg-white"
            >
              <option value="standard">Trắc nghiệm chuẩn</option>
              <option value="fill_blank">Điền vào chỗ trống</option>
            </select>
            {qPurpose === 'practice' && (
              <select
                value={qLevel}
                onChange={(e) => setQLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className="px-3 py-2 border border-stone-300 rounded-lg bg-white"
              >
                <option value="">— Level (1/2/3) —</option>
                <option value="1">Level 1 (dễ)</option>
                <option value="2">Level 2 (TB)</option>
                <option value="3">Level 3 (khó)</option>
              </select>
            )}
          </div>
          <textarea
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Nội dung câu hỏi *"
            required
            rows={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {qOptions.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Lựa chọn ${i + 1} *`}
                required
                className="px-3 py-2 border border-stone-300 rounded-lg"
              />
            ))}
          </div>
          <input
            value={qCorrect}
            onChange={(e) => setQCorrect(e.target.value)}
            placeholder="Đáp án đúng * (phải trùng một trong 4 lựa chọn trên)"
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
          <button
            type="submit"
            disabled={qSubmitting}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {qSubmitting ? 'Đang tạo…' : 'Tạo câu hỏi'}
          </button>
        </form>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Câu hỏi</th>
                <th className="px-4 py-3 w-24">Mục đích</th>
                <th className="px-4 py-3 w-20">Level</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                    Chưa có câu hỏi.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500">{q.id}</td>
                    <td className="px-4 py-3 line-clamp-2 max-w-md">{q.question_text}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {QUESTION_PURPOSES.find((p) => p.value === q.purpose)?.label ?? q.purpose}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{q.level ?? '—'}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Link
                        to={`/admin/topics/${topicIdNum}/questions/${q.id}`}
                        className="inline-block px-3 py-1 text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        Sửa
                      </Link>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}