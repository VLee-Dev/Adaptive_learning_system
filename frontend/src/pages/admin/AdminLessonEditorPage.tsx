import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { lessonAdminGet, type Lesson } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'
import { LESSON_CONTENT_TYPES, type LessonContentType } from '@/types/lesson'

export default function AdminLessonEditorPage() {
  const { topicId, lessonId } = useParams<{ topicId: string; lessonId: string }>()
  const topicIdNum = Number(topicId)
  const lessonIdNum = Number(lessonId)
  const navigate = useNavigate()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [contentType, setContentType] = useState<LessonContentType>('text')
  const [content, setContent] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [orderIndex, setOrderIndex] = useState(1)

  const isCreate = lessonIdNum === 0

  const load = async () => {
    if (isCreate) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await lessonAdminGet.list(topicIdNum)
      const found = list.find((l) => l.id === lessonIdNum) ?? null
      if (!found) {
        setError('Không tìm thấy bài học')
      } else {
        setLesson(found)
        setName(found.name)
        setContentType(found.content_type)
        setContent(found.content)
        setContentUrl(found.content_url ?? '')
        setOrderIndex(found.order_index)
      }
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [topicIdNum, lessonIdNum])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isCreate) {
        await lessonAdminGet.create(topicIdNum, {
          name: name.trim(),
          content_type: contentType,
          content,
          content_url: contentUrl.trim() || undefined,
          order_index: orderIndex,
        })
      } else {
        await lessonAdminGet.update(lessonIdNum, {
          name: name.trim(),
          content_type: contentType,
          content,
          content_url: contentUrl.trim() || undefined,
          order_index: orderIndex,
        })
      }
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
        {isCreate ? 'Thêm bài học' : `Sửa bài học #${lessonIdNum}`}
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
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Tên bài học *
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Loại nội dung *
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as LessonContentType)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
            >
              {LESSON_CONTENT_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Thứ tự *
            </label>
            <input
              type="number"
              min={1}
              required
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Nội dung *
          </label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono text-sm"
          />
        </div>

        {(contentType === 'image' || contentType === 'video') && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">URL</label>
            <input
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>
        )}

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

      {!isCreate && lesson && (
        <p className="text-xs text-stone-400 mt-3">
          Tạo lúc: {new Date(lesson.created_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}