import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { chapterAdminGet, courseAdminGet, type Chapter, type Course } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'

export default function AdminCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseIdNum = Number(courseId)
  const navigate = useNavigate()

  const [course, setCourse] = useState<Course | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [orderIndex, setOrderIndex] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOrderIndex, setEditOrderIndex] = useState(1)

  const load = async () => {
    if (!courseIdNum) return
    setLoading(true)
    try {
      const all = await courseAdminGet.list()
      const found = all.find((c) => c.id === courseIdNum) ?? null
      setCourse(found)
      setChapters(await chapterAdminGet.list(courseIdNum))
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdNum])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await chapterAdminGet.create(courseIdNum, {
        title: title.trim(),
        description: description.trim() || undefined,
        order_index: orderIndex,
      })
      setTitle('')
      setDescription('')
      setOrderIndex((o) => o + 1)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (ch: Chapter) => {
    setEditingId(ch.id)
    setEditTitle(ch.title)
    setEditDescription(ch.description ?? '')
    setEditOrderIndex(ch.order_index)
  }

  const saveEdit = async (id: number) => {
    setError(null)
    try {
      await chapterAdminGet.update(id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        order_index: editOrderIndex,
      })
      setEditingId(null)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  const handleDelete = async (id: number, title: string) => {
    if (
      !confirm(
        `Xóa chương "${title}"? Toàn bộ chủ đề/bài học/câu hỏi sẽ bị xóa theo.`,
      )
    )
      return
    setError(null)
    try {
      await chapterAdminGet.remove(id)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  if (loading) {
    return <div className="text-stone-500">Đang tải…</div>
  }

  if (!course) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <p className="text-red-700 mb-3">Không tìm thấy khóa học.</p>
        <button
          onClick={() => navigate('/admin/courses')}
          className="text-sm text-orange-600 hover:underline"
        >
          ← Quay lại danh sách khóa học
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Link to="/admin/courses" className="text-sm text-stone-500 hover:text-orange-600">
          ← Danh sách khóa học
        </Link>
      </div>

      <div className="mb-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{course.name}</h1>
            <p className="text-sm text-stone-500 mt-1">{course.description ?? '—'}</p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-semibold ${
              course.is_published
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-stone-200 text-stone-600'
            }`}
          >
            {course.is_published ? 'Đã xuất bản' : 'Bản nháp'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <h2 className="text-lg font-bold text-stone-800 mb-3">Các chương</h2>

      <form
        onSubmit={handleCreate}
        className="mb-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <h3 className="font-semibold text-stone-700">+ Thêm chương mới</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề chương *"
            className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          />
          <input
            type="number"
            required
            min={1}
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            placeholder="Thứ tự"
            className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả (tuỳ chọn)"
          rows={2}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? 'Đang tạo…' : 'Tạo chương'}
        </button>
      </form>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3 w-16">#</th>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3 w-20">Thứ tự</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {chapters.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  Chưa có chương nào.
                </td>
              </tr>
            ) : (
              chapters.map((ch) =>
                editingId === ch.id ? (
                  <tr key={ch.id} className="border-t border-stone-100 bg-amber-50">
                    <td className="px-4 py-3 align-top">{ch.id}</td>
                    <td className="px-4 py-3">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2 py-1 border border-stone-300 rounded mb-1"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 border border-stone-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="number"
                        min={1}
                        value={editOrderIndex}
                        onChange={(e) => setEditOrderIndex(Number(e.target.value))}
                        className="w-full px-2 py-1 border border-stone-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-right space-x-1">
                      <button
                        onClick={() => saveEdit(ch.id)}
                        className="px-3 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs rounded bg-stone-200 text-stone-700 hover:bg-stone-300"
                      >
                        Hủy
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={ch.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500">{ch.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/chapters/${ch.id}`}
                        className="font-semibold text-stone-800 hover:text-orange-600"
                      >
                        {ch.title}
                      </Link>
                      {ch.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                          {ch.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{ch.order_index}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Link
                        to={`/admin/chapters/${ch.id}`}
                        className="inline-block px-3 py-1 text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        Mở
                      </Link>
                      <button
                        onClick={() => startEdit(ch)}
                        className="px-3 py-1 text-xs rounded bg-stone-100 text-stone-700 hover:bg-stone-200"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(ch.id, ch.title)}
                        className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}