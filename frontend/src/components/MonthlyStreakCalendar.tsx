import { useEffect, useState } from 'react'
import { learningApi, toApiError, type MonthlyStreakResponse } from '@/lib/api'

interface MonthlyStreakCalendarProps {
  /** Tháng đang xem. Mặc định = tháng hiện tại theo local time. */
  year?: number
  month?: number // 1-12
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export default function MonthlyStreakCalendar({
  year: initYear,
  month: initMonth,
}: MonthlyStreakCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(initYear ?? today.getFullYear())
  const [month, setMonth] = useState(initMonth ?? today.getMonth() + 1) // 1-12
  const [data, setData] = useState<MonthlyStreakResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch khi mount hoặc đổi tháng
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // tzOffsetMinutes: Việt Nam (UTC+7) → -420
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    learningApi
      .getMonthlyStreak(year, month, tzOffsetMinutes)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) setError(toApiError(e).detail)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // Realtime: khi có study session kết thúc → refetch ngay
    const onSessionUpdated = () => {
      learningApi
        .getMonthlyStreak(year, month, tzOffsetMinutes)
        .then((res) => {
          if (!cancelled) setData(res)
        })
        .catch(() => {})
    }
    window.addEventListener('study-session-updated', onSessionUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('study-session-updated', onSessionUpdated)
    }
  }, [year, month])

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setYear(y)
    setMonth(m)
  }

  // Tính tuần hiện tại (week chứa today) trong tháng đang xem
  const currentWeekIndex = (() => {
    if (!data) return -1
    if (year !== today.getFullYear() || month !== today.getMonth() + 1) return -1
    const dayOfMonth = today.getDate()
    // dayOfMonth là ngày trong tháng (1-based)
    // Vị trí tuyệt đối trong grid (0-based, bao gồm cả ô trống đầu tuần):
    const cellIndex = data.first_weekday + (dayOfMonth - 1)
    return Math.floor(cellIndex / 7)
  })()

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-white/90 backdrop-blur-md border border-cream-200 rounded-3xl p-4 shadow-sm h-full flex flex-col">
      {/* Header: tháng + nút chuyển */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-orange-600 text-[18px]">
            calendar_month
          </span>
          <h4 className="text-sm font-bold text-stone-800 capitalize">{monthLabel}</h4>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-stone-500 hover:bg-cream-100 transition"
            aria-label="Tháng trước"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-stone-500 hover:bg-cream-100 transition"
            aria-label="Tháng sau"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="text-[9px] font-semibold text-stone-400 uppercase">
            {w}
          </span>
        ))}
      </div>

      {/* Grid ngày */}
      {loading && !data ? (
        <div className="text-center text-xs text-stone-400 py-4">Đang tải...</div>
      ) : error ? (
        <div className="text-center text-xs text-red-500 py-2">{error}</div>
      ) : data ? (
        <div className="grid grid-cols-7 gap-1 flex-1">
          {/* Ô trống cho first_weekday */}
          {Array.from({ length: data.first_weekday }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: data.days_in_month }).map((_, idx) => {
            const day = idx + 1
            const dateKey = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const minutes = data.minutes_per_day[dateKey] ?? 0
            // Quy ước: ≥ 1 phút = có học → tích chân mèo
            const hasStudied = minutes >= 1
            const isToday =
              data.year === today.getFullYear() &&
              data.month === today.getMonth() + 1 &&
              day === today.getDate()
            // cellIndex trong grid
            const cellIndex = data.first_weekday + idx
            const weekIdx = Math.floor(cellIndex / 7)
            const isCurrentWeek = weekIdx === currentWeekIndex
            // Cường độ màu theo số phút (mỗi 15 phút +1 cấp, tối đa 4)
            const intensity = Math.min(Math.floor(minutes / 15), 4)
            return (
              <div
                key={dateKey}
                title={
                  hasStudied
                    ? `${dateKey}: ${minutes} phút học`
                    : dateKey
                }
                className={`relative aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold transition ${
                  isToday
                    ? 'bg-orange-600 text-white shadow-sm'
                    : isCurrentWeek
                      ? 'bg-orange-100 text-stone-700 ring-1 ring-orange-300'
                      : 'bg-cream-50 text-stone-500'
                }`}
                style={
                  hasStudied && !isToday
                    ? {
                        backgroundColor: `rgba(234, 88, 12, ${0.15 + intensity * 0.15})`,
                      }
                    : undefined
                }
              >
                {day}
                {hasStudied && (
                  <span
                    className={`material-symbols-outlined absolute -top-1 -right-1 text-[14px] -rotate-12 ${
                      isToday ? 'text-white' : 'text-orange-700'
                    }`}
                    style={{ opacity: Math.min(0.5 + intensity * 0.12, 1) }}
                  >
                    pets
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 text-[9px] text-stone-500 pt-2 mt-1">
        <span className="flex items-center gap-0.5">
          <span className="inline-block w-2 h-2 rounded bg-orange-600" />
          Hôm nay
        </span>
        <span className="flex items-center gap-0.5">
          <span className="inline-block w-2 h-2 rounded bg-orange-100 ring-1 ring-orange-300" />
          Tuần này
        </span>
        <span className="flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[12px] text-orange-600 -rotate-12">pets</span>
          Có học
        </span>
      </div>
    </div>
  )
}
