import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '@/components/Layout'
import AdminLayout from '@/components/AdminLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useAuthStore } from '@/stores/authStore'

// Auth pages
import LandingPage from '@/pages/auth/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import NotFoundPage from '@/pages/auth/NotFoundPage'
import ForbiddenPage from '@/pages/auth/ForbiddenPage'

// Student pages
import HomepageStudent from '@/pages/student/HomepageStudent'
import StudentCourseCatalogPage from '@/pages/student/StudentCourseCatalogPage'
import StudentProfilePage from '@/pages/student/StudentProfilePage'
import StudentCourseDetailPage from '@/pages/student/StudentCourseDetailPage'
import CourseLearnPage from '@/pages/student/CourseLearnPage'
import StudentChapterDetailPage from '@/pages/student/StudentChapterDetailPage'
import StudentTopicDetailPage from '@/pages/student/StudentTopicDetailPage'
import StudentLessonViewPage from '@/pages/student/StudentLessonViewPage'
import StudentPracticePage from '@/pages/student/StudentPracticePage'

// Public course detail (task 2: cho cả guest + student xem)
import CourseDetailPublicPage from '@/pages/course/CourseDetailPublicPage'

// Admin pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminProfilePage from '@/pages/admin/AdminProfilePage'
import AdminCourseListPage from '@/pages/admin/AdminCourseListPage'
import AdminCourseDetailPage from '@/pages/admin/AdminCourseDetailPage'
import AdminChapterDetailPage from '@/pages/admin/AdminChapterDetailPage'
import AdminTopicDetailPage from '@/pages/admin/AdminTopicDetailPage'
import AdminLessonEditorPage from '@/pages/admin/AdminLessonEditorPage'
import AdminQuestionEditorPage from '@/pages/admin/AdminQuestionEditorPage'
import AdminChapterFinalTestBuilderPage from '@/pages/admin/AdminChapterFinalTestBuilderPage'

function App() {
  const token = useAuthStore((s) => s.token)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  // On mount, if we have a persisted token, validate it by fetching /auth/me
  useEffect(() => {
    if (token) {
      fetchMe().catch(() => {
        // fetchMe already clears state on failure
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ErrorBoundary>
    <Routes>
      {/* Public marketing/auth pages - no header */}
      <Route element={<Layout bare />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        {/* Public course detail (task 2) — cả guest + student đều xem được */}
        <Route path="/courses/:courseId" element={<CourseDetailPublicPage />} />
        {/* Course learn — full screen (header riêng trong page, không qua Layout) */}
        <Route
          path="/student/courses/:courseId/learn"
          element={
            <ProtectedRoute requiredRole="student">
              <CourseLearnPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Student app pages - with shared layout (no top header, pages provide their own) */}
      <Route element={<Layout />}>
        <Route
          path="/student/homepage"
          element={
            <ProtectedRoute requiredRole="student">
              <HomepageStudent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentCourseCatalogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:courseId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentCourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/chapters/:chapterId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentChapterDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/topics/:topicId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentTopicDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Route bài học độc lập — dùng cho "xem lại bài giảng" khi được nhắc
            học kỹ hơn. Trước đây route này bị gỡ ở commit aab09e1 nhưng link
            vẫn còn → 404. */}
        <Route
          path="/student/lessons/:lessonId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLessonViewPage />
            </ProtectedRoute>
          }
        />
        {/* Route luyện tập cũ — giữ lại để các link/bookmark cũ không chết.
            Thực chất nội dung luyện tập giờ render inline trong
            /student/courses/:courseId/learn?tab=practice&topic=:id
            (xem commit aab09e1). */}
        <Route
          path="/student/topics/:topicId/practice"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentPracticePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/chapters/:chapterId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentChapterDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin routes - own layout (no shared top header) */}
      <Route
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
        <Route path="/admin/courses" element={<AdminCourseListPage />} />
        <Route path="/admin/courses/:courseId" element={<AdminCourseDetailPage />} />
        <Route path="/admin/chapters/:chapterId" element={<AdminChapterDetailPage />} />
        <Route path="/admin/topics/:topicId" element={<AdminTopicDetailPage />} />
        <Route path="/admin/topics/:topicId/lessons/:lessonId" element={<AdminLessonEditorPage />} />
        <Route path="/admin/topics/:topicId/questions/:questionId" element={<AdminQuestionEditorPage />} />
        <Route path="/admin/chapters/:chapterId/final-test" element={<AdminChapterFinalTestBuilderPage />} />
      </Route>

      {/* Catch-all for app pages (404) */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
    </ErrorBoundary>
  )
}

export default App
