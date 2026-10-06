import { useEffect, useState } from 'react'
import { useParams, Link as RRLink } from 'react-router-dom'
import { finalTestAdminGet, type FinalTest } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'

interface FormState {
  total_questions: number
  pass_percent: number
  max_attempts: number | '' | null
}

const emptyForm: FormState = {
  total_questions: 10,
  pass_percent: 70,
  max_attempts: null,
}

export default function AdminChapterFinalTestBuilderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const chapterIdNum = Number(chapterId)

  const [test, setTest] = useState<FinalTest | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const t = await finalTestAdminGet.get(chapterIdNum)
      setTest(t)
      setForm({
        total_questions: t.total_questions,
        pass_percent: t.pass_percent,
        max_attempts: t.max_attempts,
      })
    } catch (e) {
      const err = toApiError(e)
      if (err.status === 404) {
        setTest(null)
        setForm(emptyForm)
      } else {
        setError(err.detail)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdNum])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const payload = {
        total_questions: form.total_questions,
        pass_percent: form.pass_percent,
        max_attempts: form.max_attempts === '' ? null : form.max_attempts,
      }
      if (test) {
        // backend doesn't expose PATCH for final-test; but we treat as upsert:
        // For MVP we keep current record and inform admin.
        setError('Backend chưa hỗ trợ sửa Final Test. Vui lòng xoá & tạo lại (TODO).')
      } else {
        const created = await finalTestAdminGet.create(chapterIdNum, payload)
        setTest(created)
        setSuccess('Đã tạo Final Test.')
      }
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
        <RRLink
          to={`/admin/chapters/${chapterIdNum}`}
          className="text-sm text-stone-500 hover:text-orange-600"
        >
          ← Quay lại chương
        </RRLink>
      </div>

      <h1 className="text-2xl font-bold text-stone-800 mb-2">
        Final Test — Chương #{chapterIdNum}
      </h1>
      <p className="text-sm text-stone-500 mb-4">
        MVP: cấu hình tổng số câu hỏi, % đậu, và số lần thử tối đa. Việc ghép câu hỏi
        cụ thể vào đề thi sẽ do backend tự chọn từ pool câu hỏi <code>chapter_final</code>{' '}
        của các chủ đề thuộc chương này.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {success}
        </div>
      )}

      {test ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-stone-800 mb-3">Final Test hiện tại</h2>
          <ul className="text-sm text-stone-700 space-y-1">
            <li>
              <b>Tổng câu hỏi:</b> {test.total_questions}
            </li>
            <li>
              <b>% đậu:</b> {test.pass_percent}
            </li>
            <li>
              <b>Số lần thử tối đa:</b> {test.max_attempts ?? '∞'}
            </li>
            <li>
              <b>ID:</b> {test.id}
            </li>
            <li className="text-xs text-stone-400">
              Tạo lúc: {new Date(test.created_at).toLocaleString()}
            </li>
          </ul>
          <p className="mt-3 text-xs text-stone-500 italic">
            (Trong phiên bản MVP, backend chưa hỗ trợ PATCH final-test. Hãy thêm endpoint
            đó hoặc tạo migration xoá record cũ.)
          </p>
        </div>
      ) : (
        <form
          onSubmit={save}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
        >
          <h2 className="font-bold text-stone-800">+ Tạo Final Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Tổng câu hỏi *
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.total_questions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, total_questions: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                % đậu (0-100) *
              </label>
              <input
                type="number"
                required
                min={0}
                max={100}
                step={1}
                value={form.pass_percent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pass_percent: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Số lần thử tối đa (0 = ∞)
              </label>
              <input
                type="number"
                min={0}
                value={form.max_attempts ?? 0}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    max_attempts:
                      e.target.value === '' || Number(e.target.value) === 0
                        ? null
                        : Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? 'Đang tạo…' : 'Tạo Final Test'}
          </button>
        </form>
      )}
    </div>
  )
}