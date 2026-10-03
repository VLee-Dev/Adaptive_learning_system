import { Toaster as HotToaster } from 'react-hot-toast'

/**
 * Global toast container. Mount once in App.tsx.
 * Customize styles to match Neko cozy theme.
 */
export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#FFFDF9',
          color: '#382618',
          border: '1px solid #F2E4D2',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 45px -10px rgba(110, 68, 25, 0.15), 0 8px 16px -6px rgba(110, 68, 25, 0.08)',
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        success: {
          iconTheme: { primary: '#f97316', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#dc2626', secondary: '#fff' },
          duration: 4000,
        },
      }}
    />
  )
}
