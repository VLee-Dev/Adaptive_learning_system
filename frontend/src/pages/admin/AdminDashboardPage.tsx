import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseAdminGet, type Chapter } from '@/lib/adminApi'
import { toApiError } from '@/lib/api'

interface Stats {
  totalCourses: number
  totalChapters: number
  publishedCourses: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const courses = await courseAdminGet.list()
        // count chapters for each course in parallel
        const chaptersLists = await Promise.all(
          courses.map((c) => courseAdminGet.listChapters(c.id).catch(() => [] as Chapter[])),
        )
        if (cancelled) return
        const totalChapters = chaptersLists.reduce((sum, list) => sum + list.length, 0)
        setStats({
          totalCourses: courses.length,
          totalChapters,
          publishedCourses: courses.filter((c) => c.is_published).length,
        })
      } catch (e) {
        if (!cancelled) setError(toApiError(e).detail)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">Tổng quan</h1>
      <p className="text-sm text-stone-500 mb-6">
        Trang quản trị Adaptive Learning System
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Tổng khóa học"
          value={stats?.totalCourses ?? '—'}
          loading={loading}
          tone="brand"
        />
        <StatCard
          label="Đã xuất bản"
          value={stats?.publishedCourses ?? '—'}
          loading={loading}
          tone="green"
        />
        <StatCard
          label="Tổng chương"
          value={stats?.totalChapters ?? '—'}
          loading={loading}
          tone="amber"
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800 mb-3">Bắt đầu nhanh</h2>
        <ul className="space-y-2 text-sm text-stone-700">
          <li>
            <Link to="/admin/courses" className="text-orange-600 hover:underline">
              → Quản lý khóa học
            </Link>{' '}
            <span className="text-stone-500">— tạo, sửa, xuất bản khóa học</span>
          </li>
          <li>
            Mở một khóa học để thêm <b>Chương</b> → <b>Chủ đề</b> → <b>Bài học</b> và{' '}
            <b>Câu hỏi</b>.
          </li>
          <li>
            Với mỗi chủ đề có thể cấu hình <b>Practice</b> (thích ứng BKT) trong trang chi
            tiết chủ đề.
          </li>
          <li>
            Với mỗi chương có thể tạo <b>Final Test</b> (kiểm tra cuối chương).
          </li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
  tone,
}: {
  label: string
  value: number | string
  loading: boolean
  tone: 'brand' | 'green' | 'amber'
}) {
  const toneClass = {
    brand: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }[tone]

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="text-xs uppercase font-semibold tracking-wide opacity-80">
        {label}
      </div>
      <div className="text-3xl font-bold mt-2">
        {loading ? '…' : value}
      </div>
    </div>
  )
}