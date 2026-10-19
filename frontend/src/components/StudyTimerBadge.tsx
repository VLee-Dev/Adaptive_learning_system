import { useEffect, useRef, useState } from 'react'
import { learningApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
}

const STORAGE_KEY = 'study_timer_v1'

interface TimerState {
  dateKey: string
  startedAt: number
  pausedSeconds: number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TimerState
      if (parsed && parsed.dateKey && typeof parsed.startedAt === 'number') {
        return parsed
      }
    }
  } catch {
    /* ignore */
  }
  return { dateKey: todayKey(), startedAt: Date.now(), pausedSeconds: 0 }
}

function writeState(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/**
 * Tính số giây đã học tới hiện tại, có trừ thời gian pause.
 * Nếu sang ngày mới → tự reset.
 */
function computeSeconds(state: TimerState, now: number): { seconds: number; state: TimerState } {
  const today = todayKey()
  if (state.dateKey !== today) {
    const fresh: TimerState = { dateKey: today, startedAt: now, pausedSeconds: 0 }
    writeState(fresh)
    return { seconds: 0, state: fresh }
  }
  const elapsed = Math.max(0, Math.floor((now - state.startedAt) / 1000) - state.pausedSeconds)
  return { seconds: elapsed, state }
}

/**
 * StudyTimerBadge — đồng hồ học tập nhất quán toàn hệ thống.
 *
 * Tính năng:
 * - Lưu localStorage theo ngày → không reset khi chuyển trang (UI snappy).
 * - Reset mỗi 0:00 sang ngày mới.
 * - Tạm dừng khi tab bị ẨN HẲN, vẫn đếm khi chuyển tab khác.
 * - Đồng thời heartbeat lên backend mỗi 30s → `duration_seconds` lưu DB.
 * - Khi sang ngày mới hoặc unmount/ẩn → stop session cũ, start session mới.
 * - Sau heartbeat thành công → dispatch `study-session-updated` để
 *   `MonthlyStreakCalendar` refetch ngay.
 */
export default function StudyTimerBadge() {
  const user = useAuthStore((s) => s.user)
  const [seconds, setSeconds] = useState(0)
  const [active, setActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef = useRef<TimerState>(readState())
  const activeRef = useRef<boolean>(false)
  const lastPauseStartRef = useRef<number | null>(null)
  const sessionIdRef = useRef<number | null>(null)
  const startingRef = useRef<boolean>(false) // tránh start 2 lần song song
  const lastSyncedSecondsRef = useRef<number>(0) // phục vụ heartbeat

  const tick = () => {
    const now = Date.now()
    const { seconds: sec, state } = computeSeconds(stateRef.current, now)
    stateRef.current = state
    setSeconds(sec)
    return sec
  }

  // === Backend sync ===
  async function startBackendSession() {
    if (!user || startingRef.current) return
    startingRef.current = true
    try {
      const res = await learningApi.startStudySession('practice', null)
      sessionIdRef.current = res.session_id
      // Gửi heartbeat đầu tiên ngay để backend biết có hoạt động
      await learningApi.heartbeatStudySession(res.session_id, 0)
      lastSyncedSecondsRef.current = 0
    } catch {
      // ignore — sẽ retry ở heartbeat kế tiếp
    } finally {
      startingRef.current = false
    }
  }

  async function stopBackendSession() {
    const sid = sessionIdRef.current
    if (sid == null) return
    sessionIdRef.current = null
    try {
      await learningApi.stopStudySession(sid)
      // Báo cho MonthlyStreakCalendar refetch
      window.dispatchEvent(new CustomEvent('study-session-updated'))
    } catch {
      // ignore
    }
  }

  async function sendHeartbeat(currentSeconds: number) {
    const sid = sessionIdRef.current
    if (sid == null) return
    try {
      await learningApi.heartbeatStudySession(sid, currentSeconds)
      lastSyncedSecondsRef.current = currentSeconds
      // Refetch calendar nhẹ (sau 60s đầu tiên)
      if (currentSeconds > 0 && currentSeconds % 60 === 0) {
        window.dispatchEvent(new CustomEvent('study-session-updated'))
      }
    } catch {
      // ignore — sẽ retry tick kế tiếp
    }
  }

  useEffect(() => {
    function startTimer() {
      if (intervalRef.current) return
      const now = Date.now()
      // Cộng dồn pause nếu có
      if (lastPauseStartRef.current != null) {
        const pausedFor = Math.floor((now - lastPauseStartRef.current) / 1000)
        if (pausedFor > 0) {
          stateRef.current = {
            ...stateRef.current,
            pausedSeconds: stateRef.current.pausedSeconds + pausedFor,
          }
          writeState(stateRef.current)
        }
        lastPauseStartRef.current = null
      }
      activeRef.current = true
      setActive(true)
      tick()
      intervalRef.current = setInterval(tick, 1000)
      // Backend: mỗi 30s heartbeat
      if (heartbeatRef.current == null) {
        heartbeatRef.current = setInterval(() => {
          const sec = tick()
          sendHeartbeat(sec)
        }, 30_000)
      }
      // Bắt đầu session backend (nếu chưa có)
      if (user && sessionIdRef.current == null) {
        startBackendSession()
      }
    }

    function stopTimer() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      if (activeRef.current) {
        lastPauseStartRef.current = Date.now()
      }
      activeRef.current = false
      setActive(false)
      // Backend: stop session hiện tại (sang ngày mới sẽ tự start lại ở tick)
      if (sessionIdRef.current != null) {
        stopBackendSession()
      }
    }

    function onChange() {
      // Chỉ pause khi tab bị ẨN HẲN. Chuyển tab khác (nhưng vẫn visible) → vẫn đếm.
      if (document.hidden) stopTimer()
      else startTimer()
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      stateRef.current = readState()
      tick()
    }

    document.addEventListener('visibilitychange', onChange)
    window.addEventListener('storage', onStorage)
    onChange()

    return () => {
      document.removeEventListener('visibilitychange', onChange)
      window.removeEventListener('storage', onStorage)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      // Stop session khi unmount (chuyển trang)
      if (sessionIdRef.current != null) {
        stopBackendSession()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <div
      className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full bg-white/90 border border-cream-200 shadow-sm transition-all hover:bg-white"
      title="Thời gian học tập tích lũy hôm nay"
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
