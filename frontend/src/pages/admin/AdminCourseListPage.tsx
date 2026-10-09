import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseAdminGet, type Course } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'

export default function AdminCourseListPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create form
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [publish, setPublish] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPublish, setEditPublish] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setCourses(await courseAdminGet.list())
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await courseAdminGet.create({
        name: name.trim(),
        description: description.trim() || undefined,
        is_published: publish,
      })
      setName('')
      setDescription('')
      setPublish(false)
      setShowForm(false)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (c: Course) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditDescription(c.description ?? '')
    setEditPublish(c.is_published)
  }

  const saveEdit = async (id: number) => {
    setError(null)
    try {
      await courseAdminGet.update(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        is_published: editPublish,
      })
      setEditingId(null)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Xóa khóa học "${name}"? Toàn bộ chương/chủ đề/bài học/câu hỏi sẽ bị xóa theo.`)) return
    setError(null)
    try {
      await courseAdminGet.remove(id)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Khóa học</h1>
          <p className="text-sm text-stone-500">Quản lý tất cả khóa học trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700"
        >
          {showForm ? 'Đóng' : '+ Tạo khóa học'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
        >
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Tên khóa học *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="VD: Toán lớp 10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              rows={3}
              placeholder="Mô tả ngắn về khóa học"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="rounded"
            />
            Xuất bản ngay
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? 'Đang tạo…' : 'Tạo'}
          </button>
        </form>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-stone-50 text-stone-600 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Tên khóa học</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Tạo lúc</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  Đang tải…
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  Chưa có khóa học nào. Bấm <b>+ Tạo khóa học</b> để bắt đầu.
                </td>
              </tr>
            ) : (
              courses.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id} className="border-t border-stone-100 bg-amber-50">
                    <td className="px-4 py-3 align-top">{c.id}</td>
                    <td className="px-4 py-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border border-stone-300 rounded"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full mt-1 px-2 py-1 border border-stone-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={editPublish}
                          onChange={(e) => setEditPublish(e.target.checked)}
                        />
                        Publish
                      </label>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-stone-500">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top text-right space-x-1">
                      <button
                        onClick={() => saveEdit(c.id)}
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
                  <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500">{c.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/courses/${c.id}`}
                        className="font-semibold text-stone-800 hover:text-orange-600"
                      >
                        {c.name}
                      </Link>
                      {c.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{c.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          c.is_published
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {c.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Link
                        to={`/admin/courses/${c.id}`}
                        className="inline-block px-3 py-1 text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        Quản lý
                      </Link>
                      <button
                        onClick={() => startEdit(c)}
                        className="px-3 py-1 text-xs rounded bg-stone-100 text-stone-700 hover:bg-stone-200"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
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
    </div>
  )
}