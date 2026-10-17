import { useEffect, useRef } from 'react'
import { learningApi, toApiError } from '@/lib/api'

interface UseStudySessionOptions {
  kind: 'practice' | 'chapter_test'
  referenceId: number | null
  /** Auto pause nếu user idle quá lâu (ms). Mặc định 10 phút. */
  idleThresholdMs?: number
  /** Khoảng heartbeat (ms). Mặc định 30s. */
  heartbeatMs?: number
  /** Pause nếu tab ẩn quá lâu (ms). Mặc định 60s. */
  hiddenThresholdMs?: number
}

interface StudySessionController {
  /** Gọi thủ công khi user submit answer (nếu muốn kết thúc sớm). */
  stopNow: () => Promise<void>
}

/**
 * Hook đo thời gian học thực tế của user.
 *
 * Lifecycle:
 * 1. Mount → POST /study-sessions/start, nhận session_id
 * 2. Mỗi `heartbeatMs` (30s) → POST /heartbeat với duration_seconds hiện tại
 * 3. Khi tab ẩn > `hiddenThresholdMs` (60s) → pause (không heartbeat)
 * 4. Khi tab visible lại → resume (heartbeat tiếp)
 * 5. Khi user idle (không click/scroll/keydown) > `idleThresholdMs` (10 phút) → stop
 * 6. Unmount / beforeunload / visibilitychange → stop
 *
 * Realtime:
 * - Phát custom event 'study-session-updated' khi stop thành công để các
 *   component khác (MonthlyStreakCalendar) refetch ngay.
 */
export function useStudySession({
  kind,
  referenceId,
  idleThresholdMs = 10 * 60 * 1000,
  heartbeatMs = 30 * 1000,
  hiddenThresholdMs = 60 * 1000,
}: UseStudySessionOptions): StudySessionController {
  const sessionIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  // Tổng thời gian "active" (không pause), tính bằng ms
  const activeMsRef = useRef<number>(0)
  // Lần cuối cùng user tương tác
  const lastInteractionRef = useRef<number>(Date.now())
  // Trạng thái pause (tab ẩn)
  const isPausedRef = useRef<boolean>(false)
  // Đánh dấu đã stop để không gọi lại nhiều lần
  const stoppedRef = useRef<boolean>(false)

  useEffect(() => {
    if (referenceId === null || referenceId === undefined) return

    let cancelled = false
    const startTime = Date.now()
    startTimeRef.current = startTime
    lastInteractionRef.current = startTime
    activeMsRef.current = 0

    // Start session
    learningApi
      .startStudySession(kind, referenceId)
      .then((res) => {
        if (cancelled) {
          // Đã unmount trước khi start xong → stop ngay
          learningApi.stopStudySession(res.session_id).catch(() => {})
          return
        }
        sessionIdRef.current = res.session_id
      })
      .catch((e) => {
        console.error('Failed to start study session:', toApiError(e).detail)
      })

    // Helper: tính duration_seconds hiện tại (làm tròn xuống)
    const currentDurationSeconds = () => Math.floor(activeMsRef.current / 1000)

    // Heartbeat interval
    const heartbeatTimer = setInterval(() => {
      if (isPausedRef.current) return
      if (sessionIdRef.current === null) return
      learningApi
        .heartbeatStudySession(sessionIdRef.current, currentDurationSeconds())
        .catch((e) => {
          console.warn('Heartbeat failed:', toApiError(e).detail)
        })
    }, heartbeatMs)

    // Idle check interval (mỗi 30s)
    const idleTimer = setInterval(() => {
      if (isPausedRef.current) return
      if (Date.now() - lastInteractionRef.current > idleThresholdMs) {
        // User idle quá lâu → stop session
        stopNow()
      }
    }, 30 * 1000)

    // Track interaction
    const onInteraction = () => {
      lastInteractionRef.current = Date.now()
    }
    window.addEventListener('click', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('scroll', onInteraction, { passive: true })

    // Visibility change: pause/resume
    const onVisibilityChange = () => {
      if (document.hidden) {
        // Tab ẩn → pause
        if (!isPausedRef.current) {
          isPausedRef.current = true
        }
        // Nếu ẩn quá lâu → stop
        setTimeout(() => {
          if (document.hidden) {
            stopNow()
          }
        }, hiddenThresholdMs)
      } else {
        // Tab visible lại → resume
        isPausedRef.current = false
        lastInteractionRef.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Active ms accumulator (mỗi 5s cộng thêm 5s nếu không pause)
    const activeTimer = setInterval(() => {
      if (!isPausedRef.current) {
        activeMsRef.current += 5000
      }
    }, 5000)

    // Before unload: stop
    const onBeforeUnload = () => {
      stopNow()
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    function stopNow() {
      if (stoppedRef.current) return
      stoppedRef.current = true
      if (sessionIdRef.current === null) return
      learningApi
        .stopStudySession(sessionIdRef.current)
        .then(() => {
          // Báo cho các component khác biết để refetch
          window.dispatchEvent(
            new CustomEvent('study-session-updated', {
              detail: {
                session_id: sessionIdRef.current,
                duration_seconds: currentDurationSeconds(),
                kind,
                reference_id: referenceId,
              },
            }),
          )
        })
        .catch((e) => {
          console.warn('Stop session failed:', toApiError(e).detail)
        })
    }

    // Cleanup
    return () => {
      cancelled = true
      clearInterval(heartbeatTimer)
      clearInterval(idleTimer)
      clearInterval(activeTimer)
      window.removeEventListener('click', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('scroll', onInteraction)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
      stopNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, referenceId, heartbeatMs, hiddenThresholdMs, idleThresholdMs])

  return {
    stopNow: async () => {
      if (sessionIdRef.current !== null && !stoppedRef.current) {
        stoppedRef.current = true
        try {
          await learningApi.stopStudySession(sessionIdRef.current)
          window.dispatchEvent(
            new CustomEvent('study-session-updated', {
              detail: { session_id: sessionIdRef.current },
            }),
          )
        } catch {
          // ignore
        }
      }
    },
  }
}
