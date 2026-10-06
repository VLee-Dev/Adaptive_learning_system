import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { questionAdminGet, type Question } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'
import {
  QUESTION_PURPOSES,
  QUESTION_FORMATS,
  type QuestionPurpose,
  type QuestionFormat,
} from '@/types/question'

export default function AdminQuestionEditorPage() {
  const { topicId, questionId } = useParams<{ topicId: string; questionId: string }>()
  const topicIdNum = Number(topicId)
  const questionIdNum = Number(questionId)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [purpose, setPurpose] = useState<QuestionPurpose>('practice')
  const [format, setFormat] = useState<QuestionFormat>('standard')
  const [text, setText] = useState('')
  const [options, setOptions] = useState<string[]>(['', '', '', ''])
  const [correct, setCorrect] = useState('')
  const [explanation, setExplanation] = useState('')
  const [level, setLevel] = useState<number | ''>('')

  const load = async () => {
    setLoading(true)
    try {
      const list = await questionAdminGet.list(topicIdNum)
      const found = list.find((q) => q.id === questionIdNum)
      if (!found) {
        setError('Không tìm thấy câu hỏi')
        return
      }
      setPurpose(found.purpose)
      setFormat(found.question_format)
      setText(found.question_text)
      setOptions(found.options)
      setCorrect(found.correct_answer)
      setExplanation(found.explanation ?? '')
      setLevel(found.level ?? '')
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicIdNum, questionIdNum])

  const setOption = (i: number, v: string) => {
    setOptions((prev) => prev.map((x, idx) => (idx === i ? v : x)))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await questionAdminGet.update(questionIdNum, {
        question_text: text.trim(),
        options: options.map((o) => o.trim()),
        correct_answer: correct.trim(),
        explanation: explanation.trim() || undefined,
        level: purpose === 'practice' && level !== '' ? Number(level) : undefined,
      })
      navigate(`/admin/topics/${topicIdNum}`)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link
          to={`/admin/topics/${topicIdNum}`}
          className="text-sm text-stone-500 hover:text-orange-600"
        >
          ← Quay lại chủ đề
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-stone-800 mb-4">
        Sửa câu hỏi #{questionIdNum}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={save}
        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Mục đích</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as QuestionPurpose)}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-100"
            >
              {QUESTION_PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Dạng</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as QuestionFormat)}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-100"
            >
              {QUESTION_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {purpose === 'practice' && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
              >
                <option value="">—</option>
                <option value="1">Level 1 (dễ)</option>
                <option value="2">Level 2 (TB)</option>
                <option value="3">Level 3 (khó)</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Câu hỏi *</label>
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">4 lựa chọn *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Lựa chọn ${i + 1}`}
                required
                className="px-3 py-2 border border-stone-300 rounded-lg"
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Đáp án đúng * (phải trùng một lựa chọn)
          </label>
          <input
            required
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Giải thích</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/topics/${topicIdNum}`)}
            className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  )
}