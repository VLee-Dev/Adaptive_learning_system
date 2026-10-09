import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api, { toApiError } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nếu user reload, authStore đã hydrate từ localStorage; chỉ re-fetch /me nếu thiếu
  useEffect(() => {
    if (!user) {
      api
        .get('/auth/me')
        .then(() => {
        })
        .catch(() => {
        })
    }
  }, [user])

  if (!user) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <p className="text-stone-500">Đang tải thông tin người dùng…</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    if (newPassword.length > 128) {
      setError('Mật khẩu mới quá dài (tối đa 128 ký tự).')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setSubmitting(true)
    try {
      await api.patch('/auth/me', { password: newPassword })
      toast.success('Đổi mật khẩu thành công.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel =
    user.role === 'admin'
      ? 'Quản trị viên'
      : user.role === 'student'
        ? 'Học viên'
        : user.role

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Hồ sơ cá nhân</h1>
        <p className="text-sm text-stone-500">
          Quản lý thông tin tài khoản và mật khẩu của bạn.
        </p>
      </div>

      {/* Thông tin cơ bản (read-only) */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800 mb-3">Thông tin tài khoản</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase font-semibold text-stone-500">Email</dt>
            <dd className="text-stone-800 font-semibold break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase font-semibold text-stone-500">Họ tên</dt>
            <dd className="text-stone-800">{user.full_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase font-semibold text-stone-500">Vai trò</dt>
            <dd>
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full font-semibold ${
                  user.role === 'admin'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {roleLabel}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Đổi mật khẩu */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800 mb-1">Đổi mật khẩu</h2>
        <p className="text-sm text-stone-500 mb-4">
          Mật khẩu phải có ít nhất 8 ký tự. Sau khi đổi, bạn vẫn dùng phiên hiện tại
          cho đến khi đăng xuất.
        </p>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Mật khẩu mới *
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="Tối thiểu 8 ký tự"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Xác nhận mật khẩu mới *
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </button>
            <button
              type="button"
              onClick={() => {
                setNewPassword('')
                setConfirmPassword('')
                setError(null)
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
            >
              Hủy
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
