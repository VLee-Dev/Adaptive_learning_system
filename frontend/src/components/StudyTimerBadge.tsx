import { useEffect, useRef, useState } from 'react'

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
}

/**
 * StudyTimerBadge — UI-only counter (không lưu DB).
 * Đếm giây khi tab đang focus, tạm dừng khi blur/ẩn.
 */
export default function StudyTimerBadge() {
  const [seconds, setSeconds] = useState(0)
  const [active, setActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function start() {
      if (intervalRef.current) return
      setActive(true)
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    }
    function stop() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setActive(false)
    }
    function onChange() {
      if (!document.hidden && document.hasFocus()) start()
      else stop()
    }
    document.addEventListener('visibilitychange', onChange)
    window.addEventListener('focus', onChange)
    window.addEventListener('blur', stop)
    onChange()
    return () => {
      document.removeEventListener('visibilitychange', onChange)
      window.removeEventListener('focus', onChange)
      window.removeEventListener('blur', stop)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div
      className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full bg-white/90 border border-cream-200 shadow-sm transition-all hover:bg-white"
      title="Thời gian học tập tích lũy hôm nay (UI demo, chưa lưu DB)"
    >
      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
        <span className="material-symbols-outlined text-[17px]">timelapse</span>
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-sm font-bold text-stone-800 tracking-tight">
            {formatTimer(seconds)}
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              active ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
            }`}
          />
        </div>
        <span
          className={`text-[10px] leading-tight ${
            active ? 'text-emerald-600' : 'text-stone-400'
          }`}
        >
          {active ? 'Đang tính giờ' : 'Tạm dừng'}
        </span>
      </div>
    </div>
  )
}
