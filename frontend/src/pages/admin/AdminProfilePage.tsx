// AdminProfilePage - tối giản cho admin
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api, { toApiError } from '@/lib/api'
import toast from 'react-hot-toast'

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submittingName, setSubmittingName] = useState(false)
  const [submittingPwd, setSubmittingPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="text-stone-500 text-sm">Đang tải thông tin người dùng…</div>
    )
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (fullName.length > 255) {
      setError('Họ tên quá dài (tối đa 255 ký tự).')
      return
    }
    setSubmittingName(true)
    try {
      const res = await api.patch('/auth/me', { full_name: fullName })
      useAuthStore.getState().setUser(res.data)
      toast.success('Đã cập nhật họ tên.')
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmittingName(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    setSubmittingPwd(true)
    try {
      await api.patch('/auth/me', {
        password: newPassword,
        current_password: currentPassword,
      })
      toast.success('Đổi mật khẩu thành công.')
      setNewPassword('')
      setCurrentPassword('')
      setConfirmPassword('')
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmittingPwd(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Hồ sơ</h1>
        <p className="text-sm text-stone-500">Thông tin tài khoản quản trị viên.</p>
      </div>

      {/* Thông tin tài khoản */}
      <section className="bg-white border border-stone-200 rounded-xl p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Email</dt>
            <dd className="font-semibold text-stone-800 break-all">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Vai trò</dt>
            <dd>
              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                Quản trị viên
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Đổi họ tên */}
      <form
        onSubmit={handleSaveName}
        className="bg-white border border-stone-200 rounded-xl p-4 space-y-3"
      >
        <h2 className="text-sm font-bold text-stone-800">Họ tên</h2>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={255}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
          placeholder="Nhập họ tên"
        />
        <button
          type="submit"
          disabled={submittingName}
          className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
        >
          {submittingName ? 'Đang lưu…' : 'Lưu'}
        </button>
      </form>

      {/* Đổi mật khẩu */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white border border-stone-200 rounded-xl p-4 space-y-3"
      >
        <h2 className="text-sm font-bold text-stone-800">Đổi mật khẩu</h2>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
          placeholder="Mật khẩu hiện tại"
        />
        <input
          type="password"
          required
          minLength={8}
          maxLength={128}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
          placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
        />
        <input
          type="password"
          required
          minLength={8}
          maxLength={128}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
          placeholder="Xác nhận mật khẩu mới"
        />
        <button
          type="submit"
          disabled={submittingPwd}
          className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
        >
          {submittingPwd ? 'Đang lưu…' : 'Đổi mật khẩu'}
        </button>
      </form>
    </div>
  )
}
