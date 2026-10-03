import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // If user was redirected here from a protected page, return them after login
  const fromPath = (location.state as { from?: string } | null)?.from

  // Redirect already-logged-in users
  const user = useAuthStore((s) => s.user)
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin/courses' : '/student/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Vui lòng điền đầy đủ email và mật khẩu')
      return
    }
    try {
      await login(email, password)
      toast.success('Chào mừng bạn quay lại! 🐾')
      // After login: go to original target, or role-based default
      const currentUser = useAuthStore.getState().user
      const target = fromPath || (currentUser?.role === 'admin' ? '/admin/courses' : '/student/dashboard')
      navigate(target, { replace: true })
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Đăng nhập thất bại'
      toast.error(detail)
    }
  }

  return (
    <div className="min-h-screen w-full relative bg-[#F7EFE4] text-cream-900 overflow-x-hidden antialiased selection:bg-orange-200 selection:text-orange-900">
      {/* Background layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          alt="Phòng làm việc cùng chú mèo chăm chỉ"
          className="w-full h-full object-cover object-left md:object-center select-none"
          src="/images/bg-neko.png"
          style={{ objectPosition: 'left bottom' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f6ece0]/90 via-[#f6ece0]/40 to-transparent md:hidden" />
      </div>

      {/* Form area */}
      <main className="relative z-10 min-h-screen w-full flex items-center justify-end px-4 sm:px-8 lg:pr-28 xl:pr-40 lg:pl-8 py-8 lg:py-12">
        <section className="w-full max-w-[460px] my-auto" style={{ transform: 'translateX(-24px)' }}>
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-orange-600 transition mb-3 ml-1 group"
          >
            <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            </svg>
            <span>Quay lại trang chủ</span>
          </Link>

          {/* Badges */}
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-800 bg-[#FFF5E6]/90 backdrop-blur-sm border border-amber-200/80 rounded-full shadow-sm">
              <span>🐾</span>
              <span>Chào mừng trở lại! ♡</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-orange-700 bg-white/80 backdrop-blur-sm border border-orange-200/60 rounded-full shadow-sm">
              <span>Work Work Work! ✍️</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-[#FFFDF9]/95 backdrop-blur-md rounded-3xl border border-[#F2E4D2] shadow-cozy p-6 sm:p-8">
            <header className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100/80 text-orange-600 rounded-2xl mb-3 shadow-inner">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 10.5c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-5.5-2c1.38 0 2.5-1.12 2.5-2.5S7.88 3.5 6.5 3.5 4 4.62 4 6s1.12 2.5 2.5 2.5zm11 0c1.38 0 2.5-1.12 2.5-2.5S18.88 3.5 17.5 3.5 15 4.62 15 6s1.12 2.5 2.5 2.5zM12 12c-3.5 0-7 2.6-7 6 0 2.2 1.8 4 4 4 1.3 0 2.5-.5 3-1.3.5.8 1.7 1.3 3 1.3 2.2 0 4-1.8 4-4 0-3.4-3.5-6-7-6z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-[26px] font-bold text-cream-900 tracking-tight">Đăng nhập học tập</h2>
              <p className="text-sm font-medium text-stone-500 mt-1">Đăng nhập để cùng học tập và làm việc mỗi ngày!</p>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 ml-1" htmlFor="email">
                  Email
                </label>
                <div className="relative rounded-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input-cozy"
                    placeholder="VD: hocvien@studycat.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 ml-1" htmlFor="password">
                  Mật khẩu
                </label>
                <div className="relative rounded-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input-cozy pr-10"
                    placeholder="Tối thiểu 8 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label="Hiện hoặc ẩn mật khẩu"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + forgot */}
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-xs text-stone-600 font-medium">Ghi nhớ đăng nhập</span>
                </label>
                <a className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); toast('Liên hệ Admin để reset mật khẩu 🐾') }}>
                  Quên mật khẩu?
                </a>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button type="submit" className="btn-cozy group" disabled={loading}>
                  <span className="text-base group-hover:rotate-12 transition-transform duration-200">🐾</span>
                  <span>{loading ? 'Đang đăng nhập...' : 'Vào học ngay'}</span>
                </button>
              </div>
            </form>

            <footer className="mt-6 pt-5 border-t border-stone-200/70 text-center text-xs text-stone-600 font-medium">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-bold text-orange-600 hover:text-orange-700 hover:underline ml-1 inline-flex items-center gap-0.5">
                Đăng ký ngay
                <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                </svg>
              </Link>
            </footer>
          </div>

          <p className="text-center text-[11px] text-stone-700/80 mt-3 drop-shadow-sm">
            🐱 Học tập & làm việc năng suất cùng Pomodoro Neko
          </p>
        </section>
      </main>
    </div>
  )
}
