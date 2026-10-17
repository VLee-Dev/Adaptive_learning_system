// StudentCourseDetailPage — Layout 2 cột: Tài liệu (left) + Nội dung (right)
// - Header gọn: tên khóa, badge trạng thái, mô tả, stats inline
// - Cột trái: chapter → topic → lesson accordion (mục lục)
// - Cột phải: nội dung các bài học theo từng chương
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, {
  courseApi,
  resolveImageUrl,
  toApiError,
  type CourseDetail,
  type CourseSummary,
} from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

// === Types khớp với backend schemas ===
interface ChapterSummary {
  id: number
  course_id: number
  title: string
  description: string | null
  order_index: number
}
interface TopicSummary {
  id: number
  chapter_id: number
  name: string
  description: string | null
  type: 'general' | 'grammar' | 'listening'
  order_index: number
}
interface LessonSummary {
  id: number
  topic_id: number
  name: string
  content_type: 'text' | 'image' | 'video'
  order_index: number
}
interface ChapterCompletion {
  is_completed: boolean
  test_score_percent: number | null
  completed_at: string | null
}
interface TopicMastery {
  topic_id: number
  mastery: number
  current_level: number
  status: 'in_progress' | 'completed' | 'review_required'
}

const TYPE_ICON: Record<string, string> = {
  text: 'description',
  image: 'image',
  video: 'play_circle',
}
const TYPE_LABEL: Record<string, string> = {
  text: 'Bài đọc',
  image: 'Hình ảnh',
  video: 'Video',
}

export default function StudentCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseIdNum = Number(courseId)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = user !== null

  // === Course data ===
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [topicsByChapter, setTopicsByChapter] = useState<Record<number, TopicSummary[]>>({})
  const [lessonsByTopic, setLessonsByTopic] = useState<Record<number, LessonSummary[]>>({})
  const [completions, setCompletions] = useState<Record<number, ChapterCompletion>>({})
  const [masteries, setMasteries] = useState<Record<number, TopicMastery>>({})
  const [suggested, setSuggested] = useState<CourseSummary[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // === UI state: chapter/topic nào đang mở rộng ===
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!courseIdNum) return
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        // 1) Lấy course detail (kèm is_enrolled từ token nếu có)
        const courseData = await courseApi.detail(courseIdNum)
        let isEnrolled = courseData.is_enrolled

        // 2) Nếu user đã login, verify bằng endpoint enrollment-status
        //    (chống cache/sai lệch khi public detail trả is_enrolled sai)
        if (isAuthenticated) {
          try {
            const status = await courseApi.enrollmentStatus(courseIdNum)
            isEnrolled = status.is_enrolled
            if (isEnrolled) {
              courseData.is_enrolled = true
            }
          } catch {
            // ignore — giữ nguyên giá trị từ detail
          }
        }

        setCourse({ ...courseData, is_enrolled: isEnrolled })

        // 3) Lấy chapters
        const chaptersRes = await api.get<ChapterSummary[]>(`/courses/${courseIdNum}/chapters`)
        const chapterList = chaptersRes.data
        setChapters(chapterList)

        // Auto-expand chương đầu tiên
        if (chapterList.length > 0) {
          setExpandedChapters(new Set([chapterList[0].id]))
        }

        // 4) Nếu đã enroll → load topics, lessons, completions, masteries
        if (isEnrolled) {
          const topicResults = await Promise.allSettled(
            chapterList.map((c) => api.get<TopicSummary[]>(`/chapters/${c.id}/topics`)),
          )
          const tByC: Record<number, TopicSummary[]> = {}
          const allTopicIds: number[] = []
          for (let i = 0; i < chapterList.length; i++) {
            const r = topicResults[i]
            const list = r.status === 'fulfilled' ? r.value.data : []
            tByC[chapterList[i].id] = list
            allTopicIds.push(...list.map((t) => t.id))
          }
          setTopicsByChapter(tByC)

          // Auto-expand topic đầu tiên của chương đầu tiên
          const firstChapterTopics = tByC[chapterList[0]?.id] ?? []
          if (firstChapterTopics.length > 0) {
            setExpandedTopics(new Set([firstChapterTopics[0].id]))
          }

          const lessonResults = await Promise.allSettled(
            allTopicIds.map((tid) => api.get<LessonSummary[]>(`/topics/${tid}/lessons`)),
          )
          const lByT: Record<number, LessonSummary[]> = {}
          for (let i = 0; i < allTopicIds.length; i++) {
            const r = lessonResults[i]
            lByT[allTopicIds[i]] = r.status === 'fulfilled' ? r.value.data : []
          }
          setLessonsByTopic(lByT)

          const compResults = await Promise.allSettled(
            chapterList.map((c) => api.get<ChapterCompletion>(`/learning/chapters/${c.id}/completion`)),
          )
          const cMap: Record<number, ChapterCompletion> = {}
          for (let i = 0; i < chapterList.length; i++) {
            const r = compResults[i]
            cMap[chapterList[i].id] =
              r.status === 'fulfilled'
                ? r.value.data
                : { is_completed: false, test_score_percent: null, completed_at: null }
          }
          setCompletions(cMap)

          const mResults = await Promise.allSettled(
            allTopicIds.map((tid) => api.get<TopicMastery>(`/learning/topics/${tid}/mastery`)),
          )
          const mMap: Record<number, TopicMastery> = {}
          for (let i = 0; i < allTopicIds.length; i++) {
            const r = mResults[i]
            if (r.status === 'fulfilled') mMap[allTopicIds[i]] = r.value.data
          }
          setMasteries(mMap)
        }
      } catch (e) {
        setError(toApiError(e).detail)
      } finally {
        setLoading(false)
      }

      // 5) Gợi ý khóa học khác (chạy ngoài try/catch chính, không block UI)
      courseApi
        .list()
        .then((all) => {
          console.log('[StudentCourseDetail] suggested courses:', all.length, 'all ids:', all.map((c) => c.id))
          setSuggested(all.filter((c) => c.id !== courseIdNum).slice(0, 4))
        })
        .catch((err) => {
          console.warn('[StudentCourseDetail] failed to load suggestions:', err)
        })
    })()
  }, [courseIdNum, isAuthenticated])

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setEnrolling(true)
    setError(null)
    try {
      await courseApi.enroll(courseIdNum)
      // Reload sau khi enroll để load toàn bộ data
      window.location.reload()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setEnrolling(false)
    }
  }

  const toggleChapter = (id: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleTopic = (id: number) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return <div className="text-stone-500 text-center py-12">Đang tải…</div>
  }

  // === Thống kê tiến độ ===
  const totalChapters = chapters.length
  const completedChapters = Object.values(completions).filter((c) => c.is_completed).length
  const totalTopics = Object.values(topicsByChapter).reduce((s, arr) => s + arr.length, 0)
  const totalLessons = Object.values(lessonsByTopic).reduce((s, arr) => s + arr.length, 0)
  const completedTopics = Object.values(masteries).filter((m) => m.status === 'completed').length
  const overallPct =
    totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100)

  return (
    // Container giới hạn chiều rộng + padding 2 bên cân xứng, KHÔNG full screen
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/student/courses')}
          className="px-3 py-1.5 rounded-lg bg-white border border-cream-200 text-stone-600 text-sm font-semibold hover:bg-cream-50 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* === Header gọn (đã bỏ hero image + progress bar) === */}
      {course && (
        <div className="bg-white border border-cream-200 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {course.is_enrolled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Đã đăng ký
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold">
                    Chưa đăng ký
                  </span>
                )}
                {course.is_enrolled && totalChapters > 0 && (
                  <span className="text-[11px] text-stone-500">
                    {completedChapters}/{totalChapters} chương · {completedTopics}/{totalTopics}{' '}
                    chủ đề · {totalLessons} bài học ·{' '}
                    <span className="font-bold text-orange-600">{overallPct}%</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-800">{course.name}</h1>
              {course.description && (
                <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>
            {!course.is_enrolled && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition disabled:opacity-50 shadow-sm"
              >
                {enrolling ? 'Đang đăng ký…' : '🎓 Đăng ký học miễn phí'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* === Body: 2 cột thon dài === */}
      {course?.is_enrolled ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ===== LEFT: Tài liệu khoá học (mục lục) ===== */}
          <aside className="lg:col-span-3 bg-white rounded-2xl border border-cream-200 p-4 shadow-sm lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className="pb-3 mb-3 border-b border-cream-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {course.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                    Mục lục
                  </p>
                  <h2 className="text-sm font-bold text-stone-800 leading-tight mt-0.5 truncate">
                    {course.name}
                  </h2>
                </div>
              </div>
            </div>

            <nav className="space-y-1.5">
              {chapters.map((ch, idx) => {
                const chTopics = topicsByChapter[ch.id] ?? []
                const chCompletion = completions[ch.id]
                const isCompleted = chCompletion?.is_completed
                const isExpanded = expandedChapters.has(ch.id)
                return (
                  <div
                    key={ch.id}
                    className={`rounded-xl border ${
                      isExpanded
                        ? 'border-cream-300 bg-white shadow-sm'
                        : 'border-transparent bg-white'
                    } overflow-hidden transition-all`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleChapter(ch.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        isExpanded
                          ? 'bg-orange-50 text-orange-700 font-bold'
                          : 'text-stone-700 hover:bg-stone-50 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-stone-300'
                          }`}
                        >
                          {isCompleted && (
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          )}
                        </span>
                        <span className="truncate text-xs">
                          Chương {idx + 1}: {ch.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {chCompletion?.test_score_percent?.toFixed(0)}%
                          </span>
                        )}
                        <span
                          className={`material-symbols-outlined text-[14px] transition-transform inline-block ${
                            isExpanded ? 'rotate-90 text-orange-600' : 'text-stone-400'
                          }`}
                        >
                          chevron_right
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="bg-[#FFFDFB] border-t border-cream-200 p-2 space-y-1.5">
                        {chTopics.length === 0 ? (
                          <div className="text-[11px] text-stone-400 px-2 py-1">
                            Chưa có chủ đề.
                          </div>
                        ) : (
                          chTopics.map((t) => {
                            const tLessons = lessonsByTopic[t.id] ?? []
                            const tMastery = masteries[t.id]
                            const tDone = tMastery?.status === 'completed'
                            const tExpanded = expandedTopics.has(t.id)
                            return (
                              <div
                                key={t.id}
                                className="rounded-lg border border-cream-200 overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleTopic(t.id)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors ${
                                    tExpanded
                                      ? 'bg-orange-50 text-orange-700 font-bold'
                                      : 'text-stone-700 hover:bg-stone-50 font-semibold'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="material-symbols-outlined text-[12px] text-orange-500">
                                      pets
                                    </span>
                                    <span className="truncate">{t.name}</span>
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {tDone ? (
                                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 rounded">
                                        Hoàn thành
                                      </span>
                                    ) : tMastery ? (
                                      <span className="text-[9px] font-semibold text-stone-500 bg-stone-100 px-1.5 rounded">
                                        {Math.round(tMastery.mastery * 100)}%
                                      </span>
                                    ) : null}
                                    <span
                                      className={`material-symbols-outlined text-[12px] transition-transform inline-block ${
                                        tExpanded ? 'rotate-90 text-orange-600' : 'text-stone-400'
                                      }`}
                                    >
                                      chevron_right
                                    </span>
                                  </div>
                                </button>
                                {tExpanded && (
                                  <div className="bg-white border-t border-cream-200 p-1.5 space-y-0.5">
                                    {tLessons.length === 0 ? (
                                      <div className="text-[10px] text-stone-400 px-2 py-1">
                                        Chưa có bài học.
                                      </div>
                                    ) : (
                                      tLessons.map((l) => (
                                        <Link
                                          key={l.id}
                                          to={`/student/lessons/${l.id}`}
                                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-stone-700 hover:bg-orange-50 hover:text-orange-700 transition-all"
                                        >
                                          <span className="material-symbols-outlined text-[12px] text-orange-500 shrink-0">
                                            {TYPE_ICON[l.content_type] ?? TYPE_ICON.text}
                                          </span>
                                          <span className="truncate flex-1 text-[11px]">
                                            {l.name}
                                          </span>
                                        </Link>
                                      ))
                                    )}
                                    <Link
                                      to={`/student/topics/${t.id}/practice`}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-orange-700 hover:bg-orange-50 transition-all text-[11px] font-semibold"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">
                                        edit_note
                                      </span>
                                      <span>Luyện tập</span>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                        <div className="pt-1 mt-1 border-t border-cream-200">
                          <Link
                            to={`/student/chapters/${ch.id}`}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg text-stone-700 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-stone-500 group-hover:text-orange-600">
                                bar_chart
                              </span>
                              <span className="text-[11px] font-semibold">
                                Bảng điểm & Đánh giá
                              </span>
                            </div>
                            {isCompleted && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {chCompletion?.test_score_percent?.toFixed(0)}%
                              </span>
                            )}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {chapters.length === 0 && (
                <div className="text-center text-stone-400 text-xs py-3">
                  Khoá học chưa có chương nào.
                </div>
              )}
            </nav>
          </aside>

          {/* ===== RIGHT: Nội dung các chương ===== */}
          <main className="lg:col-span-6 space-y-4">
            {chapters.length === 0 ? (
              <div className="bg-white border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
                Khoá học chưa có chương nào.
              </div>
            ) : (
              chapters.map((ch, chIdx) => {
                const chTopics = topicsByChapter[ch.id] ?? []
                const chCompletion = completions[ch.id]
                const isCompleted = chCompletion?.is_completed
                const chLessonsCount = chTopics.reduce(
                  (s, t) => s + (lessonsByTopic[t.id]?.length ?? 0),
                  0,
                )
                return (
                  <div
                    key={ch.id}
                    className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden"
                  >
                    <div className="p-4 bg-[#FFF9F6] border-b border-cream-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-600 text-sm">
                          pets
                        </span>
                        <h3 className="font-bold text-sm text-stone-800">
                          Chương {chIdx + 1}: {ch.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {isCompleted ? 'Hoàn thành' : `${chLessonsCount} bài học`}
                        </span>
                        <Link
                          to={`/student/chapters/${ch.id}`}
                          className="text-stone-400 hover:text-orange-600 p-1"
                          title="Xem chi tiết chương"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_right
                          </span>
                        </Link>
                      </div>
                    </div>

                    <div className="divide-y divide-stone-100">
                      {chTopics.length === 0 ? (
                        <div className="p-4 text-center text-stone-400 text-sm">
                          Chương chưa có chủ đề nào.
                        </div>
                      ) : (
                        chTopics.map((t) => {
                          const tLessons = lessonsByTopic[t.id] ?? []
                          const tMastery = masteries[t.id]
                          const tDone = tMastery?.status === 'completed'
                          return (
                            <div key={t.id} className="p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
                                <span className="material-symbols-outlined text-orange-500 text-[14px]">
                                  pets
                                </span>
                                <span className="flex-1">{t.name}</span>
                                {tDone && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Hoàn thành
                                  </span>
                                )}
                                {tMastery && !tDone && (
                                  <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                                    {Math.round(tMastery.mastery * 100)}%
                                  </span>
                                )}
                                <Link
                                  to={`/student/topics/${t.id}/practice`}
                                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    edit_note
                                  </span>
                                  Luyện tập
                                </Link>
                              </div>
                              {tLessons.length === 0 ? (
                                <div className="text-[12px] text-stone-400 pl-5">
                                  Chủ đề chưa có bài học.
                                </div>
                              ) : (
                                tLessons.map((l) => {
                                  const cType = l.content_type
                                  const status: 'done' | 'upcoming' = tDone ? 'done' : 'upcoming'
                                  return (
                                    <div
                                      key={l.id}
                                      className="hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4 pl-5 py-1.5"
                                    >
                                      <div className="flex items-start gap-3 min-w-0">
                                        <span
                                          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                            status === 'done'
                                              ? 'bg-emerald-500 text-white'
                                              : 'bg-orange-50 text-orange-600'
                                          }`}
                                        >
                                          <span className="material-symbols-outlined text-[14px]">
                                            {status === 'done' ? 'check' : 'play_arrow'}
                                          </span>
                                        </span>
                                        <div className="min-w-0">
                                          <Link
                                            to={`/student/lessons/${l.id}`}
                                            className="text-sm font-bold text-stone-800 hover:text-orange-600 transition-colors block truncate"
                                          >
                                            {l.name}
                                          </Link>
                                          <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[12px] text-stone-400">
                                              {TYPE_ICON[cType] ?? TYPE_ICON.text}
                                            </span>
                                            {TYPE_LABEL[cType] ?? 'Bài học'}
                                          </p>
                                        </div>
                                      </div>
                                      <Link
                                        to={`/student/lessons/${l.id}`}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 ${
                                          status === 'done'
                                            ? 'border border-cream-300 text-orange-600 hover:bg-orange-50'
                                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                                        }`}
                                      >
                                        {status === 'done' ? 'Học lại' : 'Bắt đầu học'}
                                      </Link>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </main>

          {/* ===== RIGHT: Bạn có thể thấy hữu ích ===== */}
          <aside className="lg:col-span-3 space-y-4">
            <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">
                    auto_awesome
                  </span>
                  <span>Bạn có thể thấy hữu ích</span>
                  <span className="text-orange-600">🐾</span>
                </h3>
              </div>
              {suggested.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {suggested.map((c) => (
                      <Link
                        key={c.id}
                        to={`/courses/${c.id}`}
                        className="block group rounded-xl border border-cream-200 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all"
                        title="Xem chi tiết khóa học"
                      >
                        <div className="relative h-20 w-full overflow-hidden">
                          {c.image_url ? (
                            <img
                              src={resolveImageUrl(c.image_url) ?? ''}
                              alt={c.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white text-2xl">
                              🎓
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-stone-800 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors min-h-[2.25rem]">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">group</span>
                            {c.enrollment_count} học viên
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/student/courses"
                    className="block text-center mt-3 py-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    Xem tất cả →
                  </Link>
                </>
              ) : (
                <div className="py-6 text-center text-[11px] text-stone-400">
                  Đang tải gợi ý…
                </div>
              )}
            </section>

            {/* Card đánh giá khóa học */}
            <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
              <h3 className="font-bold text-sm text-stone-800 mb-2">Đánh giá khóa học này</h3>
              <p className="text-[11px] text-stone-500 mb-3">
                Đóng góp cảm nghĩ để hệ thống nâng cao trải nghiệm nhé!
              </p>
              <div className="flex items-center justify-between py-2 px-3 bg-[#FFFDFB] border border-dashed border-cream-300 rounded-xl">
                <div className="flex items-center gap-1 text-stone-300">
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  <span className="material-symbols-outlined text-[16px]">star</span>
                </div>
                <span className="text-[10px] font-medium text-stone-400">Sắp có</span>
              </div>
            </section>
          </aside>
        </div>

        </>
      ) : (
        /* CHƯA ENROLL: chỉ danh sách chương locked */
        <section>
          <h3 className="text-base font-bold text-stone-800 mb-3">Các chương</h3>
          {chapters.length === 0 ? (
            <div className="bg-white border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
              Khoá học chưa có chương nào.
            </div>
          ) : (
            <div className="space-y-3">
              {chapters
                .sort((a, b) => a.order_index - b.order_index)
                .map((ch, idx) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-3 bg-white border border-cream-200 rounded-2xl p-5 opacity-70"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-stone-200 text-stone-500">
                      🔒
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-stone-700">{ch.title}</h4>
                      {ch.description && (
                        <p className="text-xs text-stone-500">{ch.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-stone-400">Chương {idx + 1}</div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
