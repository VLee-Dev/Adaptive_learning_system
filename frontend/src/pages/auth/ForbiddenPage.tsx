// A4. ForbiddenPage (403)
export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-gray-300">403</h1>
      <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
    </div>
  )
}
