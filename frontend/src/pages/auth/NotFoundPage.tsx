import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-600">Trang không tồn tại.</p>
      <Link to="/" className="btn-primary">Về trang chủ</Link>
    </div>
  )
}
