import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
  fallback?: string
  label?: string
  className?: string
}

/**
 * Smart back button: uses browser history when possible, falls back to a given route.
 * - history.back() returns the user to the previous page they visited (B3 → B4 → B3).
 * - If history has no previous page (direct link), navigates to fallback.
 */
export default function BackButton({ fallback = '/', label = '← Quay lại', className = '' }: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }

  return (
    <button onClick={handleClick} className={`text-brand-600 hover:text-brand-800 font-medium ${className}`}>
      {label}
    </button>
  )
}
