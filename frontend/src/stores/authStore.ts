import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

export interface User {
  id: number
  email: string
  full_name: string | null
  role: 'student' | 'admin'
  is_active: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const res = await api.post<{ access_token: string }>('/auth/login', { email, password })
          const token = res.data.access_token
          localStorage.setItem('access_token', token)
          set({ token })
          // Fetch user info
          const me = await api.get<User>('/auth/me')
          set({ user: me.data, loading: false })
        } catch (e: unknown) {
          const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Đăng nhập thất bại'
          set({ error: msg, loading: false })
          throw e
        }
      },

      register: async (email, password, fullName) => {
        set({ loading: true, error: null })
        try {
          await api.post('/auth/register', { email, password, full_name: fullName })
          // Auto-login after register
          await useAuthStore.getState().login(email, password)
        } catch (e: unknown) {
          const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Đăng ký thất bại'
          set({ error: msg, loading: false })
          throw e
        }
      },

      fetchMe: async () => {
        set({ loading: true })
        try {
          const res = await api.get<User>('/auth/me')
          set({ user: res.data, loading: false })
        } catch (e) {
          set({ user: null, token: null, loading: false })
          throw e
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null, error: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)
