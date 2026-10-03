import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Hook for guest-aware actions.
 * Returns a function that runs the action only if user is authenticated.
 * Otherwise shows a toast and redirects to /login, preserving the current
 * path in location.state.from so LoginPage can return the user after sign-in.
 *
 * Usage:
 *   const requireAuth = useRequireAuth()
 *   <button onClick={() => requireAuth(() => console.log('enroll'))}>
 */
export function useRequireAuth() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  return function requireAuth<T>(action: () => T): T | void {
    if (user) {
      return action()
    }
    toast('Bạn cần đăng nhập để tiếp tục', {
      icon: '🔒',
    })
    setTimeout(() => navigate('/login', { state: { from: location.pathname } }), 1200)
  }
}
