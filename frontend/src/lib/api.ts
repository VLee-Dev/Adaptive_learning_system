import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api

// ---- Typed API helpers ----

export interface ApiError {
  detail: string
  status: number
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string })?.detail || error.message
    return { detail, status: error.response?.status || 500 }
  }
  return { detail: 'Unknown error', status: 500 }
}
