import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  chapterAdminGet,
  topicAdminGet,
  type Chapter,
  type Topic,
} from '@/lib/adminApi'
import api, { toApiError } from '@/lib/api'
import { TOPIC_TYPES, type TopicType } from '@/types/topic'

export default function AdminChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const chapterIdNum = Number(chapterId)
  const navigate = useNavigate()

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [hasFinalTest, setHasFinalTest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TopicType>('general')
  const [orderIndex, setOrderIndex] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<TopicType>('general')
  const [editOrderIndex, setEditOrderIndex] = useState(1)

  const load = async () => {
    if (!chapterIdNum) return
    setLoading(true)
    try {
      setTopics(await topicAdminGet.list(chapterIdNum))
           const allCourses = await api.get<{ id: number }[]>('/admin/courses').then((r) => r.data)
      let found: Chapter | null = null
      for (const c of allCourses) {
        const list = await chapterAdminGet.list(c.id).catch(() => [] as Chapter[])
        const hit = list.find((x) => x.id === chapterIdNum)
        if (hit) {
          found = hit
          break
        }
      }
      setChapter(found)
      // check final test
      try {
        await api.get(`/admin/chapters/${chapterIdNum}/final-test`)
        setHasFinalTest(true)
      } catch {
        setHasFinalTest(false)
      }
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [chapterIdNum])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await topicAdminGet.create(chapterIdNum, {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        order_index: orderIndex,
      })
      setName('')
      setDescription('')
      setOrderIndex((o) => o + 1)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (t: Topic) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditDescription(t.description ?? '')
    setEditType(t.type)
    setEditOrderIndex(t.order_index)
  }

  const saveEdit = async (id: number) => {
    setError(null)
    try {
      await topicAdminGet.update(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        type: editType,
        order_index: editOrderIndex,
      })
      setEditingId(null)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Xóa chủ đề "${name}"?`)) return
    setError(null)
    try {
      await topicAdminGet.remove(id)
      await load()
    } catch (e) {
      setError(toApiError(e).detail)
    }
  }

  if (loading) return <div className="text-stone-500">Đang tải…</div>

  if (!chapter) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <p className="text-red-700 mb-3">Không tìm thấy chương.</p>
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
        <Link
          to={`/admin/courses/${chapter.course_id}`}
          className="text-sm text-stone-500 hover:text-orange-600"
        >
          ← Quay lại khóa học
        </Link>
      </div>

      <div className="mb-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{chapter.title}</h1>
          <p className="text-sm text-stone-500 mt-1">{chapter.description ?? '—'}</p>
          <p className="text-xs text-stone-400 mt-1">Thứ tự: {chapter.order_index}</p>
        </div>
        <Link
          to={`/admin/chapters/${chapterIdNum}/final-test`}
          className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold text-sm hover:bg-orange-200"
        >
          {hasFinalTest ? '⚙️ Sửa Final Test' : '＋ Tạo Final Test'}
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <h2 className="text-lg font-bold text-stone-800 mb-3">Các chủ đề</h2>

      <form
        onSubmit={handleCreate}
        className="mb-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <h3 className="font-semibold text-stone-700">+ Thêm chủ đề</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên chủ đề *"
            className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TopicType)}
            className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          >
            {TOPIC_TYPES.map((tt) => (
              <option key={tt.value} value={tt.value}>
                {tt.label}
              </option>
            ))}
          </select>
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
        <p className="text-xs text-stone-500">
          Tham số BKT (p_init, p_transit, p_slip, p_guess) sẽ dùng giá trị mặc định. Có
          thể chỉnh trong code hoặc mở rộng form sau.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? 'Đang tạo…' : 'Tạo chủ đề'}
        </button>
      </form>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-stone-50 text-stone-600 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3 w-16">#</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 w-24">Loại</th>
              <th className="px-4 py-3 w-20">TT</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {topics.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  Chưa có chủ đề nào.
                </td>
              </tr>
            ) : (
              topics.map((t) =>
                editingId === t.id ? (
                  <tr key={t.id} className="border-t border-stone-100 bg-amber-50">
                    <td className="px-4 py-3 align-top">{t.id}</td>
                    <td className="px-4 py-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
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
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as TopicType)}
                        className="w-full px-2 py-1 border border-stone-300 rounded bg-white"
                      >
                        {TOPIC_TYPES.map((tt) => (
                          <option key={tt.value} value={tt.value}>
                            {tt.label}
                          </option>
                        ))}
                      </select>
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
                        onClick={() => saveEdit(t.id)}
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
                  <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500">{t.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/topics/${t.id}`}
                        className="font-semibold text-stone-800 hover:text-orange-600"
                      >
                        {t.name}
                      </Link>
                      {t.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {TOPIC_TYPES.find((tt) => tt.value === t.type)?.label ?? t.type}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{t.order_index}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Link
                        to={`/admin/topics/${t.id}`}
                        className="inline-block px-3 py-1 text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        Mở
                      </Link>
                      <button
                        onClick={() => startEdit(t)}
                        className="px-3 py-1 text-xs rounded bg-stone-100 text-stone-700 hover:bg-stone-200"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
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