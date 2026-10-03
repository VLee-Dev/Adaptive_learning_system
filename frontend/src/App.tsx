import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '@/components/Layout'
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
import StudentDashboardPage from '@/pages/DashboardPage'
import StudentCourseCatalogPage from '@/pages/student/StudentCourseCatalogPage'
import StudentCourseDetailPage from '@/pages/student/StudentCourseDetailPage'
import StudentChapterDetailPage from '@/pages/student/StudentChapterDetailPage'
import StudentTopicDetailPage from '@/pages/student/StudentTopicDetailPage'
import StudentLessonViewPage from '@/pages/student/StudentLessonViewPage'
import StudentPracticePage from '@/pages/student/StudentPracticePage'
import StudentChapterTestPage from '@/pages/student/StudentChapterTestPage'

// Admin pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminCourseListPage from '@/pages/admin/AdminCourseListPage'
import AdminCourseDetailPage from '@/pages/admin/AdminCourseDetailPage'
import AdminChapterDetailPage from '@/pages/admin/AdminChapterDetailPage'
import AdminTopicDetailPage from '@/pages/admin/AdminTopicDetailPage'
import AdminLessonEditorPage from '@/pages/admin/AdminLessonEditorPage'
import AdminQuestionEditorPage from '@/pages/admin/AdminQuestionEditorPage'
import AdminPracticeConfigPage from '@/pages/admin/AdminPracticeConfigPage'
import AdminChapterFinalTestBuilderPage from '@/pages/admin/AdminChapterFinalTestBuilderPage'

// Shared
import ProfilePage from '@/pages/ProfilePage'

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
      </Route>

      {/* App pages - with header */}
      <Route element={<Layout />}>
        {/* Student routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboardPage />
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
        <Route
          path="/student/lessons/:lessonId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLessonViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/topics/:topicId/practice"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentPracticePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/chapters/:chapterId/test"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentChapterTestPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminCourseListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses/:courseId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminCourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chapters/:chapterId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminChapterDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/topics/:topicId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTopicDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/topics/:topicId/lessons/:lessonId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLessonEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/topics/:topicId/questions/:questionId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminQuestionEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/topics/:topicId/practice-config"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPracticeConfigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chapters/:chapterId/final-test"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminChapterFinalTestBuilderPage />
            </ProtectedRoute>
          }
        />

        {/* Shared */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all for app pages (404) */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  )
}

export default App