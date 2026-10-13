import { useRef, useState } from 'react'
import { resolveImageUrl, toApiError, uploadApi } from '@/lib/api'

interface Props {
  /** Currently stored value (could be `/static/uploads/…`, http(s) URL, or null). */
  value: string | null
  /** Called with the new stored value (already resolved). */
  onChange: (next: string | null) => void
  /** Optional: a name shown in the “current” label. */
  label?: string
  className?: string
  disabled?: boolean
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
const MAX_BYTES = 5 * 1024 * 1024

export default function ImageUploader({
  value,
  onChange,
  label = 'Ảnh bìa',
  className = '',
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewUrl = resolveImageUrl(value)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận file ảnh.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`File quá lớn (>${MAX_BYTES / (1024 * 1024)} MB).`)
      return
    }
    setError(null)
    setUploading(true)
    try {
      const result = await uploadApi.uploadImage(file)
      onChange(result.url)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-stone-700 mb-1">{label}</label>

      <div className="flex items-start gap-3">
        <div className="w-32 h-20 rounded-lg overflow-hidden border border-stone-300 bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-3xl shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span>📖</span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
            className="block w-full text-sm text-stone-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white file:font-semibold hover:file:bg-orange-700 disabled:opacity-50"
          />
          <div className="flex items-center gap-2 text-xs text-stone-500">
            {uploading && <span>Đang tải lên…</span>}
            {!uploading && value && (
              <>
                <span className="truncate">Đã lưu: {value}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(null)}
                  className="text-red-600 hover:underline"
                >
                  Xóa ảnh
                </button>
              </>
            )}
            {!uploading && !value && (
              <span>PNG/JPG/WebP, tối đa 5 MB. Để trống sẽ dùng ảnh mặc định.</span>
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
