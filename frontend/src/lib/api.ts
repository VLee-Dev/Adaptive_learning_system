import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

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

// Student-facing course helpers ---------------------------------------------
export interface CourseSummary {
  id: number
  name: string
  description: string | null
  image_url: string | null
  enrollment_count: number
  is_enrolled: boolean
  created_at: string
}

export interface CourseDetail {
  id: number
  name: string
  description: string | null
  image_url: string | null
  is_published: boolean
  enrollment_count: number
  is_enrolled: boolean
  created_at: string
}

export const courseApi = {
  list: () => api.get<CourseSummary[]>('/courses').then((r) => r.data),
  detail: (id: number) => api.get<CourseDetail>(`/courses/${id}`).then((r) => r.data),
  enroll: (id: number) =>
    api
      .post<{ id: number; course_id: number; status: string; enrolled_at: string }>(
        `/courses/${id}/enroll`,
      )
      .then((r) => r.data),
}

// Uploads -------------------------------------------------------------------
// Backend stores uploads as `/static/uploads/<file>`. In dev the frontend runs
// on a different origin (5173) than the FastAPI server (8000), so relative
// URLs would 404. We rewrite them to the backend host.
export const UPLOAD_BASE_URL =
  (typeof window !== 'undefined' && (window as unknown as { __API_BASE__?: string }).__API_BASE__) ||
  'http://localhost:8000'

export interface UploadResult {
  url: string
  filename: string
  size: string
}

/** Resolve a stored image URL so the <img src> works in dev (and prod later). */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url // absolute – use as-is
  if (url.startsWith('/static/')) return `${UPLOAD_BASE_URL}${url}`
  return url
}

export const uploadApi = {
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<UploadResult>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
