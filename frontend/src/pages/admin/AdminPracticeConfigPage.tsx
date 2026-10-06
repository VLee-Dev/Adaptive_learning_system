import { useEffect, useState } from 'react'
import { useParams, Link as RRLink } from 'react-router-dom'
import { practiceConfigAdminGet, type PracticeConfig } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'

interface FormState {
  questions_per_session: number
  starting_level: number
  level_1_questions: number
  level_2_questions: number
  level_3_questions: number
  level_up_mastery: number
  completion_mastery: number
  review_mastery: number
  max_attempts: number | '' | null
  review_limit: number | '' | null
}

const emptyForm: FormState = {
  questions_per_session: 5,
  starting_level: 1,
  level_1_questions: 0,
  level_2_questions: 5,
  level_3_questions: 0,
  level_up_mastery: 0.65,
  completion_mastery: 0.85,
  review_mastery: 0.4,
  max_attempts: null,
  review_limit: null,
}

export default function AdminPracticeConfigPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const topicIdNum = Number(topicId)

  const [config, setConfig] = useState<PracticeConfig | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const c = await practiceConfigAdminGet.get(topicIdNum)
      setConfig(c)
      setForm({
        questions_per_session: c.questions_per_session,
        starting_level: c.starting_level,
        level_1_questions: c.level_1_questions,
        level_2_questions: c.level_2_questions,
        level_3_questions: c.level_3_questions,
        level_up_mastery: c.level_up_mastery,
        completion_mastery: c.completion_mastery,
        review_mastery: c.review_mastery,
        max_attempts: c.max_attempts,
        review_limit: c.review_limit,
      })
    } catch (e) {
      const err = toApiError(e)
      if (err.status === 404) {
        setConfig(null)
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
  }, [topicIdNum])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        max_attempts: form.max_attempts === '' ? null : form.max_attempts,
        review_limit: form.review_limit === '' ? null : form.review_limit,
      }
      if (config) {
        const updated = await practiceConfigAdminGet.update(topicIdNum, payload)
        setConfig(updated)
        alert('Đã lưu cấu hình.')
      } else {
        const created = await practiceConfigAdminGet.create(topicIdNum, payload)
        setConfig(created)
        alert('Đã tạo cấu hình.')
      }
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!config) return;
    if (!confirm('Xóa cấu hình practice của chủ đề này?')) return
    setError(null)
    try {
      await practiceConfigAdminGet.remove(topicIdNum)
      setConfig(null)
      setForm(emptyForm)
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <RRLink
          to={`/admin/topics/${topicIdNum}`}
          className="text-sm text-stone-500 hover:text-orange-600"
        >
          ← Quay lại chủ đề
        </RRLink>
      </div>

      <h1 className="text-2xl font-bold text-stone-800 mb-2">
        Practice Config — Chủ đề #{topicIdNum}
      </h1>
      <p className="text-sm text-stone-500 mb-4">
        Cấu hình session luyện tập thích ứng (BKT). Mỗi chủ đề có nhiều nhất 1 config.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={save}
        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field
            label="Câu hỏi / buổi"
            type="number"
            min={1}
            value={form.questions_per_session}
            onChange={(v) => set('questions_per_session', Number(v))}
          />
          <Field
            label="Level bắt đầu (1-3)"
            type="number"
            min={1}
            max={3}
            value={form.starting_level}
            onChange={(v) => set('starting_level', Number(v))}
          />
          <Field
            label="Số lần thử tối đa (0=∞)"
            type="number"
            min={0}
            value={form.max_attempts ?? 0}
            onChange={(v) =>
              set('max_attempts', v === '' || Number(v) === 0 ? null : Number(v))
            }
          />
        </div>

        <div>
          <h3 className="font-semibold text-stone-700 mb-2">Số câu mỗi level</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Level 1"
              type="number"
              min={0}
              value={form.level_1_questions}
              onChange={(v) => set('level_1_questions', Number(v))}
            />
            <Field
              label="Level 2"
              type="number"
              min={0}
              value={form.level_2_questions}
              onChange={(v) => set('level_2_questions', Number(v))}
            />
            <Field
              label="Level 3"
              type="number"
              min={0}
              value={form.level_3_questions}
              onChange={(v) => set('level_3_questions', Number(v))}
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-stone-700 mb-2">Ngưỡng Mastery (0-1)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="Lên level (≥)"
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={form.level_up_mastery}
              onChange={(v) => set('level_up_mastery', Number(v))}
            />
            <Field
              label="Hoàn thành chủ đề (≥)"
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={form.completion_mastery}
              onChange={(v) => set('completion_mastery', Number(v))}
            />
            <Field
              label="Cần ôn tập (<)"
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={form.review_mastery}
              onChange={(v) => set('review_mastery', Number(v))}
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-stone-700 mb-2">Ôn tập</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="Giới hạn số lần ôn tập (0=∞)"
              type="number"
              min={0}
              value={form.review_limit ?? 0}
              onChange={(v) =>
                set('review_limit', v === '' || Number(v) === 0 ? null : Number(v))
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : config ? 'Cập nhật' : 'Tạo'}
          </button>
          {config && (
            <button
              type="button"
              onClick={remove}
              className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200"
            >
              Xóa cấu hình
            </button>
          )}
        </div>

        </form>
    </div>
  )
}

interface FieldProps {
  label: string
  value: number | string
  onChange: (v: string) => void
  type?: 'number' | 'text'
  min?: number
  max?: number
  step?: number
}
function Field({ label, value, onChange, type = 'number', min, max, step }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
      />
    </div>
  )
}