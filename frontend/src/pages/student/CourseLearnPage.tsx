// CourseLearnPage — Full screen layout với StudentHeader (giống trang course detail)
// - Sidebar trái: chapters dropdown với lessons bên trong
// - Main: render trực tiếp nội dung lesson (text/image/video) hoặc practice
//   KHÔNG navigate sang trang con — mọi thứ inline
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import StudentHeader from '@/components/StudentHeader'
import api, {
  courseApi,
  toApiError,
  type CourseDetail,
} from '@/lib/api'
import { useStudySession } from '@/hooks/useStudySession'

// === Types ===
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
interface LessonDetail {
  id: number
  topic_id: number
  name: string
  content_type: 'text' | 'image' | 'video'
  content: string
  content_url: string | null
  order_index: number
  created_at: string
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
  practice_attempts: number
  status: 'in_progress' | 'completed' | 'review_required'
}

// === Practice types ===
interface PracticeQuestion {
  question_id: number
  text: string
  options: string[]
  level: number
}
interface NextResponse {
  is_correct?: boolean
  correct_answer?: string
  explanation?: string | null
  updated_mastery: number
  current_level: number
  status: 'in_progress' | 'completed' | 'review_required'
  next_question: PracticeQuestion | null
}

const LESSON_TYPE_ICON: Record<string, string> = {
  text: 'description',
  image: 'image',
  video: 'play_circle',
}
const LESSON_TYPE_LABEL: Record<string, string> = {
  text: 'Bài đọc',
  image: 'Hình ảnh',
  video: 'Video',
}

const STATUS_META: Record<NextResponse['status'], { label: string; color: string; emoji: string }> = {
  in_progress: { label: 'Đang học', color: 'bg-blue-100 text-blue-700', emoji: '📚' },
  completed: { label: 'Hoàn thành!', color: 'bg-green-100 text-green-700', emoji: '🎉' },
  review_required: { label: 'Cần ôn lại', color: 'bg-red-100 text-red-700', emoji: '⚠️' },
}

type ContentView =
  | { type: 'lesson'; lessonId: number }
  | { type: 'practice'; topicId: number }
  | { type: 'chapterTest'; chapterId: number }

export default function CourseLearnPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseIdNum = Number(courseId)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  // Course data
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [topicsByChapter, setTopicsByChapter] = useState<Record<number, TopicSummary[]>>({})
  const [lessonsByTopic, setLessonsByTopic] = useState<Record<number, LessonSummary[]>>({})
  const [completions, setCompletions] = useState<Record<number, ChapterCompletion>>({})
  const [masteries, setMasteries] = useState<Record<number, TopicMastery>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())
  const [contentView, setContentView] = useState<ContentView | null>(null)

  // === Load course data ===
  useEffect(() => {
    if (!courseIdNum) return
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const courseData = await courseApi.detail(courseIdNum)
        let isEnrolled = courseData.is_enrolled
        try {
          const status = await courseApi.enrollmentStatus(courseIdNum)
          isEnrolled = status.is_enrolled
          if (isEnrolled) courseData.is_enrolled = true
        } catch { /* ignore */ }
        setCourse({ ...courseData, is_enrolled: isEnrolled })

        const chaptersRes = await api.get<ChapterSummary[]>(`/courses/${courseIdNum}/chapters`)
        const chapterList = chaptersRes.data
        setChapters(chapterList)
        if (chapterList.length > 0) {
          setExpandedChapters(new Set([chapterList[0].id]))
        }

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

          // URL params
          const tab = searchParams.get('tab')
          const chapterParam = searchParams.get('chapter')
          const lessonId = searchParams.get('lesson')
          const topicParam = searchParams.get('topic')

          if (tab === 'practice' && topicParam) {
            setContentView({ type: 'practice', topicId: Number(topicParam) })
          } else if (tab === 'test' && chapterParam) {
            setContentView({ type: 'chapterTest', chapterId: Number(chapterParam) })
          } else if (lessonId) {
            setContentView({ type: 'lesson', lessonId: Number(lessonId) })
          } else if (chapterList.length > 0) {
            // Auto: chọn bài học đầu tiên
            const chTopics = tByC[chapterList[0].id] ?? []
            if (chTopics.length > 0) {
              const firstLessons = lByT[chTopics[0].id] ?? []
              if (firstLessons.length > 0) {
                setContentView({ type: 'lesson', lessonId: firstLessons[0].id })
              }
            }
          }
        }
      } catch (e) {
        setError(toApiError(e).detail)
      } finally {
        setLoading(false)
      }
    })()
  }, [courseIdNum])

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  const handleLessonClick = (lessonId: number) => {
    setContentView({ type: 'lesson', lessonId })
    setSearchParams({ lesson: String(lessonId) })
  }
  const handlePracticeClick = (topicId: number) => {
    setContentView({ type: 'practice', topicId })
    setSearchParams({ tab: 'practice', topic: String(topicId) })
  }
  const handleChapterTestClick = (chapterId: number) => {
    setContentView({ type: 'chapterTest', chapterId })
    setSearchParams({ tab: 'test', chapter: String(chapterId) })
  }

  // Check tất cả practice của 1 chapter đã pass chưa
  const chapterPracticeStatus = (chapterId: number) => {
    const chTopics = topicsByChapter[chapterId] ?? []
    if (chTopics.length === 0) {
      return { ready: true, missing: [] as TopicSummary[] }
    }
    const missing = chTopics.filter(
      (t) => (masteries[t.id]?.status ?? 'in_progress') !== 'completed',
    )
    return { ready: missing.length === 0, missing }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <StudentHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-stone-500 text-center">
            <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Đang tải…</p>
          </div>
        </div>
      </div>
    )
  }

  // Phẳng hóa toàn bộ "item" hiển thị trong sidebar theo đúng thứ tự:
  //   mỗi topic: lessons → practice
  //   mỗi chapter (sau các topic): chapter test
  // Mỗi item là 1 bước có thể nhảy tới/lui bằng nút Quay lại / Tiếp theo.
  const courseItemsFlat: CourseItem[] = chapters.flatMap((ch) => {
    const chTopics = topicsByChapter[ch.id] ?? []
    const items: CourseItem[] = chTopics.flatMap((t) => {
      const tLessons = (lessonsByTopic[t.id] ?? []).map<CourseItem>((l) => ({
        type: 'lesson',
        id: l.id,
        topicId: t.id,
        chapterId: ch.id,
      }))
      return [...tLessons, { type: 'practice', topicId: t.id, chapterId: ch.id }]
    })
    items.push({ type: 'chapterTest', chapterId: ch.id })
    return items
  })

  // Helper: chuyển tới 1 item bất kỳ trong courseItemsFlat
  const goToItem = (item: CourseItem | null | undefined) => {
    if (!item) return
    if (item.type === 'lesson') {
      setContentView({ type: 'lesson', lessonId: item.id })
      setSearchParams({ lesson: String(item.id) })
    } else if (item.type === 'practice') {
      setContentView({ type: 'practice', topicId: item.topicId })
      setSearchParams({ tab: 'practice', topic: String(item.topicId) })
    } else {
      setContentView({ type: 'chapterTest', chapterId: item.chapterId })
      setSearchParams({ tab: 'test', chapter: String(item.chapterId) })
    }
  }

  // Tìm index của item hiện tại trong mảng phẳng
  const getCurrentIndex = (): number => {
    if (!contentView) return -1
    if (contentView.type === 'lesson') {
      return courseItemsFlat.findIndex(
        (it) => it.type === 'lesson' && it.id === contentView.lessonId,
      )
    }
    if (contentView.type === 'practice') {
      return courseItemsFlat.findIndex(
        (it) => it.type === 'practice' && it.topicId === contentView.topicId,
      )
    }
    return courseItemsFlat.findIndex(
      (it) => it.type === 'chapterTest' && it.chapterId === contentView.chapterId,
    )
  }

  const currentIdx = getCurrentIndex()
  const prevItem = currentIdx > 0 ? courseItemsFlat[currentIdx - 1] : null
  const nextItem =
    currentIdx >= 0 && currentIdx < courseItemsFlat.length - 1
      ? courseItemsFlat[currentIdx + 1]
      : null

  if (!course?.is_enrolled) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <StudentHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-stone-500 mb-4">Bạn chưa đăng ký khóa học này.</p>
            <Link
              to={`/student/courses/${courseIdNum}`}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700"
            >
              Quay lại
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getChapterIndex = (chapterId: number) => chapters.findIndex((c) => c.id === chapterId) + 1

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* === Header (giống trang course detail) === */}
      <StudentHeader />

      <div className="flex flex-1">
        {/* ===== LEFT SIDEBAR (sticky dưới header) ===== */}
        <aside className="w-96 shrink-0 bg-white/90 backdrop-blur-md border-r border-orange-100 flex flex-col sticky top-20 self-start h-[calc(100vh-5rem)] z-10">
          {/* Sidebar title */}
          <div className="p-5 border-b border-orange-100/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-orange-600 text-xl shrink-0">menu_book</span>
              <h2 className="font-bold text-base text-stone-800 leading-snug truncate">
                {course.name}
              </h2>
            </div>
            <Link
              to={`/student/courses/${courseIdNum}`}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-orange-50 transition-colors shrink-0"
              title="Quay lại trang khóa học"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
          </div>

          {/* Chapter accordion */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {chapters.map((ch, chIdx) => {
              const isExpanded = expandedChapters.has(ch.id)
              const chTopics = topicsByChapter[ch.id] ?? []
              const completion = completions[ch.id]
              const isChapterDone = completion?.is_completed

              return (
                <div key={ch.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleChapter(ch.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors ${
                      isExpanded
                        ? 'bg-orange-50 text-orange-700'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                        isChapterDone ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
                      }`}>
                        {isChapterDone ? (
                          <span className="material-symbols-outlined text-[12px]">check</span>
                        ) : (
                          chIdx + 1
                        )}
                      </span>
                      <span className={`font-semibold text-sm truncate ${isExpanded ? 'text-orange-700' : ''}`}>
                        Chương {chIdx + 1}: {ch.title}
                      </span>
                    </div>
                    <span className={`material-symbols-outlined text-[20px] transition-transform shrink-0 ${
                      isExpanded ? 'rotate-180 text-orange-600' : 'text-stone-400'
                    }`}>
                      expand_more
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 space-y-1 border-l-2 border-orange-100 pl-4 py-1.5">
                      {chTopics.length === 0 ? (
                        <p className="text-xs text-stone-400 px-2 py-1">Chưa có chủ đề.</p>
                      ) : (
                        chTopics.map((t) => {
                          const tLessons = lessonsByTopic[t.id] ?? []
                          const tMastery = masteries[t.id]
                          const tDone = tMastery?.status === 'completed'

                          return (
                            <div key={t.id} className="space-y-1">
                              <div className="flex items-center gap-2 px-2 py-1.5">
                                <span className="material-symbols-outlined text-orange-400 text-[14px] shrink-0">pets</span>
                                <span className="text-xs font-bold text-stone-600 truncate">{t.name}</span>
                              </div>

                              {tLessons.map((l) => {
                                const isActive = contentView?.type === 'lesson' && contentView.lessonId === l.id
                                const isLessonDone = tDone
                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => handleLessonClick(l.id)}
                                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all ${
                                      isActive
                                        ? 'bg-orange-100/70 border border-orange-200/80 shadow-sm relative overflow-hidden'
                                        : 'hover:bg-orange-50/60'
                                    }`}
                                  >
                                    {isActive && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                    )}
                                    <div className={`mt-0.5 shrink-0 ${
                                      isLessonDone ? 'text-emerald-500' : 'text-stone-400'
                                    }`}>
                                      {isLessonDone ? (
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                        </svg>
                                      ) : (
                                        <span className="material-symbols-outlined text-[16px] text-orange-400">
                                          {LESSON_TYPE_ICON[l.content_type] ?? 'description'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm leading-tight truncate ${
                                        isActive ? 'font-bold text-orange-700' : 'font-medium text-stone-700'
                                      }`}>
                                        {l.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
                                        <span>{LESSON_TYPE_LABEL[l.content_type] ?? 'Bài học'}</span>
                                      </div>
                                    </div>
                                  </button>
                                )
                              })}

                              <button
                                type="button"
                                onClick={() => handlePracticeClick(t.id)}
                                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors ${
                                  contentView?.type === 'practice' && contentView.topicId === t.id
                                    ? 'bg-orange-100/70 border border-orange-200/80 text-orange-700'
                                    : 'hover:bg-orange-50/60 text-stone-600'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px] text-orange-400 shrink-0">edit_note</span>
                                <span className="text-sm font-semibold">Luyện tập</span>
                                {tMastery && tMastery.practice_attempts > 0 && (
                                  <span className={`ml-auto text-[11px] font-bold ${
                                    tDone ? 'text-emerald-600' : 'text-orange-600'
                                  }`}>
                                    {Math.round(tMastery.mastery * 100)}%
                                  </span>
                                )}
                              </button>
                            </div>
                          )
                        })
                      )}

                      <button
                        type="button"
                        onClick={() => handleChapterTestClick(ch.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors mt-1 ${
                          contentView?.type === 'chapterTest' && contentView.chapterId === ch.id
                            ? 'bg-orange-100/70 border border-orange-200/80 text-orange-700'
                            : 'hover:bg-orange-50/60 text-stone-600'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-orange-400 shrink-0">quiz</span>
                        <span className="text-xs font-bold">Bài kiểm tra chương</span>
                        {!chapterPracticeStatus(ch.id).ready && (
                          <span
                            className="material-symbols-outlined text-[14px] text-stone-400 ml-1"
                            title="Hoàn thành hết bài luyện tập để mở khóa"
                          >
                            lock
                          </span>
                        )}
                        {completion?.test_score_percent !== null && (
                          <span className="ml-auto text-[11px] font-bold text-emerald-600">
                            {completion.test_score_percent.toFixed(0)}%
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="p-3 bg-cream-50 border-t border-orange-100/70 text-center">
            <p className="text-[11px] text-stone-500 italic">🐾 Tập trung từng bước, chú mèo nhỏ sẽ về đích.</p>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 bg-cream-50">
          {!contentView ? (
            <div className="max-w-3xl mx-auto text-center py-16 px-4">
              <span className="text-5xl mb-4 block">📚</span>
              <h2 className="text-xl font-bold text-stone-700 mb-2">Chọn một bài học để bắt đầu</h2>
              <p className="text-sm text-stone-500">Nhấp vào bài học bên trái để xem nội dung</p>
            </div>
          ) : contentView.type === 'practice' ? (
            <PracticeView
              topicId={contentView.topicId}
              prevItem={prevItem}
              nextItem={nextItem}
              onNavigateItem={goToItem}
              onClose={() => {
                setContentView(null)
                setSearchParams({})
              }}
            />
          ) : contentView.type === 'chapterTest' ? (
            <ChapterTestView
              courseId={courseIdNum}
              chapterId={contentView.chapterId}
              prevItem={prevItem}
              nextItem={nextItem}
              onNavigateItem={goToItem}
              chapterPracticeStatus={chapterPracticeStatus}
            />
          ) : (
            <LessonView
              lessonId={contentView.lessonId}
              chapters={chapters}
              prevItem={prevItem}
              nextItem={nextItem}
              onNavigateItem={goToItem}
            />
          )}
        </main>
      </div>

      {/* === Footer (y hệt trang course detail) === */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-cream-200 py-3 text-center text-xs text-stone-500 bg-white/95 backdrop-blur-md shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        🐱 Adaptive Learning · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// =============================
// LESSON VIEW (inline content)
// =============================
type CourseItem =
  | { type: 'lesson'; id: number; topicId: number; chapterId: number }
  | { type: 'practice'; topicId: number; chapterId: number }
  | { type: 'chapterTest'; chapterId: number }

interface LessonViewProps {
  lessonId: number
  chapters: ChapterSummary[]
  prevItem: CourseItem | null
  nextItem: CourseItem | null
  onNavigateItem: (item: CourseItem) => void
}
interface PracticeViewProps {
  topicId: number
  prevItem: CourseItem | null
  nextItem: CourseItem | null
  onNavigateItem: (item: CourseItem) => void
  onClose: () => void
}
interface ChapterTestViewProps {
  courseId: number
  chapterId: number
  prevItem: CourseItem | null
  nextItem: CourseItem | null
  onNavigateItem: (item: CourseItem) => void
  chapterPracticeStatus: (chapterId: number) => { ready: boolean; missing: TopicSummary[] }
}

function LessonView({
  lessonId,
  chapters,
  prevItem,
  nextItem,
  onNavigateItem,
}: LessonViewProps) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [topic, setTopic] = useState<TopicSummary | null>(null)
  const [allLessons, setAllLessons] = useState<LessonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lessonId) return
    setLoading(true)
    setError(null)
    api
      .get<LessonDetail>(`/lessons/${lessonId}`)
      .then(async (r) => {
        setLesson(r.data)
        const topicRes = await api.get<TopicSummary>(`/topics/${r.data.topic_id}`)
        setTopic(topicRes.data)
        const lessonsRes = await api.get<LessonSummary[]>(`/topics/${r.data.topic_id}/lessons`)
        setAllLessons(lessonsRes.data)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [lessonId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-stone-500 text-sm">Đang tải bài học…</div>
      </div>
    )
  }
  if (error || !lesson) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error || 'Không tìm thấy bài học'}
        </div>
      </div>
    )
  }

  const chapterIndex = topic ? chapters.findIndex((c) => c.id === topic.chapter_id) + 1 : null

  return (
    <div className="bg-[#FFFDF9]/90 backdrop-blur pb-20">
      <div>
        {/* Breadcrumb */}
        <div className="bg-[#FFFDF9]/90 backdrop-blur border-b border-cream-200 sticky top-20 z-10">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="text-xs text-stone-600 flex items-center gap-1.5 truncate">
              {chapterIndex !== null && <span>Chương {chapterIndex}</span>}
              {topic && (
                <>
                  <span className="text-stone-300">›</span>
                  <span>{topic.name}</span>
                </>
              )}
            </div>
            <div className="text-sm text-stone-600 shrink-0">
              Bài {allLessons.findIndex((l) => l.id === lessonId) + 1} / {allLessons.length}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="border-b border-cream-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
            <span className="material-symbols-outlined text-orange-600 text-[18px]">
              {LESSON_TYPE_ICON[lesson.content_type] ?? 'description'}
            </span>
            <span>{topic?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-cream-900">{lesson.name}</h1>
        </div>

        {/* Content */}
        <div className="p-6">
          {lesson.content_type === 'video' && (lesson.content_url || lesson.content) && (
            <div className="bg-stone-900 rounded-xl overflow-hidden mb-6 shadow-lg">
              <video
                src={lesson.content_url ?? lesson.content}
                controls
                className="w-full aspect-video"
                controlsList="nodownload"
              />
            </div>
          )}

          {lesson.content_type === 'image' && (lesson.content_url || lesson.content) && (
            <div className="mb-6">
              <img
                src={lesson.content_url ?? lesson.content}
                alt={lesson.name}
                className="w-full rounded-xl shadow-md"
              />
            </div>
          )}

          {lesson.content_type === 'text' && (
            <div className="prose prose-lg max-w-none text-stone-800 leading-relaxed whitespace-pre-wrap">
              {lesson.content}
            </div>
          )}

          {lesson.content && lesson.content_type !== 'text' && (
            <div className="mt-4 text-stone-700 whitespace-pre-wrap">{lesson.content}</div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="border-t border-cream-200 px-6 py-4 flex items-center justify-between bg-cream-50 gap-3">
          {prevItem ? (
            <button
              type="button"
              onClick={() => onNavigateItem(prevItem)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-semibold transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại
            </button>
          ) : (
            <div />
          )}

          {nextItem ? (
            <button
              type="button"
              onClick={() => onNavigateItem(nextItem)}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-xl hover:bg-orange-700 font-semibold transition shadow-md shadow-orange-500/25"
            >
              Tiếp theo
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              <span className="material-symbols-outlined text-[18px]">celebration</span>
              Hoàn thành khóa học
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================
// PRACTICE VIEW (inline)
// =============================
function PracticeView({
  topicId,
  prevItem,
  nextItem,
  onNavigateItem,
  onClose,
}: PracticeViewProps) {
  useStudySession({ kind: 'practice', referenceId: topicId })

  const [question, setQuestion] = useState<PracticeQuestion | null>(null)
  const [topic, setTopic] = useState<TopicMastery | null>(null)
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean
    correct: string
    explanation: string | null
    mastery: number
    level: number
    status: NextResponse['status']
  } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [forceRestart, setForceRestart] = useState(false)

  useEffect(() => {
    if (!topicId) return
    setLoading(true)
    setLastResult(null)
    setError(null)
    setForceRestart(false)
    api
      .get<TopicMastery>(`/learning/topics/${topicId}/mastery`)
      .then((mRes) => {
        setTopic(mRes.data)
        return api.get<PracticeQuestion>(`/learning/topics/${topicId}/practice/next`)
      })
      .then((qRes) => {
        setQuestion(qRes.data)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }, [topicId])

  const handleSubmit = async () => {
    if (!question || selected === null) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await api.post<NextResponse>(`/learning/topics/${topicId}/practice/answer`, {
        question_id: question.question_id,
        selected_answer: selected,
      })
      setLastResult({
        isCorrect: r.data.is_correct ?? false,
        correct: r.data.correct_answer ?? '',
        explanation: r.data.explanation ?? null,
        mastery: r.data.updated_mastery,
        level: r.data.current_level,
        status: r.data.status,
      })
      setQuestion(r.data.next_question)
      setSelected(null)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-stone-500 text-sm">Đang tải câu hỏi…</div>
      </div>
    )
  }

  if (error && !topic) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>
      </div>
    )
  }

  // --- Đã pass: hiện panel "Đã hoàn thành" + nút Làm lại ---
  const isPassed = topic?.status === 'completed' && !forceRestart && !lastResult
  if (isPassed && topic) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-8 text-center shadow-cozy overflow-hidden">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-emerald-800 mb-2">Đã hoàn thành chủ đề này!</h2>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-emerald-200 text-sm font-semibold text-emerald-700 mb-1">
            <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
            Mastery: {Math.round(topic.mastery * 100)}%
          </div>
          <div className="text-sm text-stone-600">Level hiện tại: {topic.current_level}</div>
          <div className="text-xs text-stone-500 mt-1">
            Đã luyện tập {topic.practice_attempts} lần
          </div>
          <button
            type="button"
            onClick={() => {
              setForceRestart(true)
              setLoading(true)
              api
                .get<PracticeQuestion>(`/learning/topics/${topicId}/practice/next`)
                .then((r) => setQuestion(r.data))
                .catch((e) => setError(toApiError(e).detail))
                .finally(() => setLoading(false))
            }}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-50 transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Làm lại để luyện tập thêm
          </button>
        </div>

        {(prevItem || nextItem) && (
          <div className="flex gap-3">
            {prevItem ? (
              <button
                type="button"
                onClick={() => onNavigateItem(prevItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-semibold transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Quay lại
              </button>
            ) : (
              <div className="flex-1" />
            )}
            {nextItem ? (
              <button
                type="button"
                onClick={() => onNavigateItem(nextItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
              >
                Tiếp theo
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  if (!question && !lastResult) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-8 text-center shadow-cozy">
          <div className="text-3xl mb-2">🤔</div>
          <h2 className="text-xl font-bold text-cream-900 mb-2">Chưa có câu hỏi</h2>
          <p className="text-stone-600">Chủ đề này hiện chưa có câu hỏi luyện tập.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-block px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
          >
            ← Quay lại
          </button>
        </div>
      </div>
    )
  }

  if (!question && lastResult) {
    const meta = STATUS_META[lastResult.status]
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className={`p-6 rounded-2xl border ${meta.color} shadow-cozy`}>
          <div className="text-4xl mb-2">{meta.emoji}</div>
          <h2 className="text-2xl font-bold">{meta.label}</h2>
          <p className="mt-2 text-sm">
            Mastery: {Math.round(lastResult.mastery * 100)}% · Level {lastResult.level}
          </p>
          {lastResult.status === 'completed' && (
            <p className="mt-2 text-sm">Bạn đã hoàn thành chủ đề này! Hãy thử làm các chủ đề khác.</p>
          )}
          {lastResult.status === 'review_required' && (
            <p className="mt-2 text-sm">Bạn nên xem lại bài giảng trước khi tiếp tục.</p>
          )}
        </div>
        <div className="flex gap-3">
          {prevItem ? (
            <button
              type="button"
              onClick={() => onNavigateItem(prevItem)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-semibold transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextItem ? (
            <button
              type="button"
              onClick={() => onNavigateItem(nextItem)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
            >
              Tiếp theo
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-center px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 hover:bg-emerald-100"
            >
              Hoàn thành khóa học
            </button>
          )}
        </div>
      </div>
    )
  }

  const masteryPct = lastResult ? Math.round(lastResult.mastery * 100) : 0

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-xl bg-cream-100 text-stone-700 text-sm font-semibold hover:bg-cream-200"
        >
          ← Thoát
        </button>
        {topic && (
          <div className="text-right">
            <div className="text-xs text-stone-500">Chủ đề #{topicId}</div>
            <div className="text-sm font-bold text-stone-700">
              Level {lastResult ? lastResult.level : topic.current_level}
              {lastResult && ` · ${masteryPct}%`}
            </div>
          </div>
        )}
      </div>

      {/* Mastery bar */}
      {lastResult && (
        <div className="w-full bg-stone-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              lastResult.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${masteryPct}%` }}
          />
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Last result feedback */}
      {lastResult && (
        <div
          className={`p-4 rounded-2xl border ${
            lastResult.isCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="font-bold text-sm mb-1">
            {lastResult.isCorrect ? '✓ Chính xác!' : '✗ Sai rồi'}
          </div>
          {!lastResult.isCorrect && (
            <div className="text-sm text-stone-700">
              Đáp án đúng: <span className="font-bold">{lastResult.correct}</span>
            </div>
          )}
          {lastResult.explanation && (
            <div className="text-sm text-stone-600 mt-1">💡 {lastResult.explanation}</div>
          )}
        </div>
      )}

      {/* Current question */}
      {question && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
          <div className="text-xs text-stone-500 mb-2">Level {question.level}</div>
          <h2 className="text-lg font-bold text-cream-900 mb-4">{question.text}</h2>
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const isSelected = selected === opt
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(opt)}
                  disabled={submitting}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-cream-200 hover:border-orange-300 bg-[#FFFDF9]'
                  }`}
                >
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            className="mt-4 w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/25"
          >
            {submitting ? 'Đang chấm…' : 'Nộp câu trả lời'}
          </button>
        </div>
      )}
    </div>
  )
}

// =============================
// CHAPTER TEST — inline trong /learn
// =============================

interface TestQuestion {
  question_id: number
  slot_index: number
  text: string
  options: string[]
}
interface TestStart {
  test_session_id: string
  chapter_id: number
  total_questions: number
  pass_percent: number
  questions: TestQuestion[]
}
interface TestResult {
  slot_index: number
  question_id: number
  selected_answer: string
  correct_answer: string
  is_correct: boolean
  explanation: string | null
}
interface TestSubmitResp {
  passed: boolean
  score_percent: number
  pass_percent: number
  correct_count: number
  total_questions: number
  chapter_completed: boolean
  detailed_results: TestResult[]
}

function ChapterTestView({
  courseId: _courseId,
  chapterId,
  prevItem,
  nextItem,
  onNavigateItem,
  chapterPracticeStatus,
}: ChapterTestViewProps) {
  const { ready, missing } = chapterPracticeStatus(chapterId)
  const [session, setSession] = useState<TestStart | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentSlot, setCurrentSlot] = useState(1)
  const [result, setResult] = useState<TestSubmitResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startTest = () => {
    setLoading(true)
    setError(null)
    setResult(null)
    api
      .post<TestStart>(`/learning/chapters/${chapterId}/test/start`)
      .then((r) => {
        setSession(r.data)
        const initial: Record<number, string> = {}
        r.data.questions.forEach((q) => {
          initial[q.slot_index] = ''
        })
        setAnswers(initial)
        setCurrentSlot(1)
      })
      .catch((e) => setError(toApiError(e).detail))
      .finally(() => setLoading(false))
  }

  const handleSubmitTest = async () => {
    if (!session) return
    setSubmitting(true)
    setError(null)
    try {
      const filled = Object.fromEntries(
        Object.entries(answers).filter(([, v]) => v && v.length > 0),
      )
      const r = await api.post<TestSubmitResp>('/learning/chapters/test/submit', {
        test_session_id: session.test_session_id,
        answers: filled,
      })
      setResult(r.data)
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setSubmitting(false)
    }
  }

  // --- LOCKED: practice chưa đủ ---
  if (!ready && !session && !result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        <div className="relative bg-white border-2 border-stone-200 rounded-2xl p-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-stone-50/60 backdrop-blur-[1px] pointer-events-none" />
          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-stone-400 text-3xl">lock</span>
            </div>
            <h2 className="text-lg font-bold text-stone-700 mb-2">Bài kiểm tra chương đang bị khóa</h2>
            <p className="text-sm text-stone-500 mb-4">
              Bạn cần hoàn thành <span className="font-bold text-orange-600">tất cả bài luyện tập</span> trong chương này
              trước khi mở bài kiểm tra.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              {missing.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() =>
                    onNavigateItem({ type: 'practice', topicId: t.id, chapterId })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-100 transition"
                >
                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                  {t.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Còn <span className="font-bold text-stone-700">{missing.length}</span> bài luyện tập chưa hoàn thành.
            </p>
          </div>
        </div>

        {(prevItem || nextItem) && (
          <div className="flex gap-3">
            {prevItem ? (
              <button
                type="button"
                onClick={() => onNavigateItem(prevItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-semibold transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Quay lại
              </button>
            ) : (
              <div className="flex-1" />
            )}
            {nextItem ? (
              <button
                type="button"
                onClick={() => onNavigateItem(nextItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
              >
                Tiếp theo
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  if (loading && !session) {
    return <div className="text-stone-500 text-sm text-center py-12">Đang tạo bài kiểm tra…</div>
  }

  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>
      </div>
    )
  }

  // --- RESULT ---
  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <div
          className={`p-6 rounded-2xl border shadow-cozy ${
            result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="text-4xl mb-2">{result.passed ? '🎉' : '😢'}</div>
          <h2 className="text-2xl font-bold">
            {result.passed ? 'Chúc mừng! Bạn đã vượt qua' : 'Chưa đạt, hãy thử lại'}
          </h2>
          <div className="mt-3 text-lg">
            Điểm: <span className="font-bold">{result.score_percent.toFixed(0)}%</span>{' '}
            <span className="text-stone-600">
              ({result.correct_count}/{result.total_questions} câu đúng)
            </span>
          </div>
          <div className="text-sm text-stone-600 mt-1">
            Yêu cầu: {result.pass_percent}% ·{' '}
            {result.passed ? '✓ Đạt' : '✗ Chưa đạt'}
          </div>
          {result.chapter_completed && (
            <div className="mt-3 p-3 bg-white rounded-lg text-sm font-semibold text-green-800">
              ✓ Chương này đã được đánh dấu hoàn thành!
            </div>
          )}
        </div>

        <section className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-5">
          <h3 className="font-bold text-cream-900 mb-3">📋 Chi tiết từng câu</h3>
          <div className="space-y-3">
            {result.detailed_results
              .sort((a, b) => a.slot_index - b.slot_index)
              .map((r) => (
                <div
                  key={r.slot_index}
                  className={`p-3 rounded-xl border ${
                    r.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-stone-500">Câu {r.slot_index}</span>
                    <span className={r.is_correct ? 'text-green-700' : 'text-red-700'}>
                      {r.is_correct ? '✓ Đúng' : '✗ Sai'}
                    </span>
                  </div>
                  <div className="text-sm text-stone-700">
                    Bạn chọn: <span className="font-semibold">{r.selected_answer || '(bỏ trống)'}</span>
                  </div>
                  {!r.is_correct && (
                    <div className="text-sm text-stone-700">
                      Đáp án đúng: <span className="font-semibold text-green-700">{r.correct_answer}</span>
                    </div>
                  )}
                  {r.explanation && (
                    <div className="text-sm text-stone-600 mt-1">💡 {r.explanation}</div>
                  )}
                </div>
              ))}
          </div>
        </section>

        <div className="flex gap-3">
          {prevItem ? (
            <button
              type="button"
              onClick={() => onNavigateItem(prevItem)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-semibold transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextItem ? (
            <button
              type="button"
              onClick={() => onNavigateItem(nextItem)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
            >
              Tiếp theo
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : null}
        </div>

        {!result.passed && (
          <div className="text-center">
            <button
              type="button"
              onClick={startTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Làm lại bài kiểm tra
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- READY (chưa bắt đầu) ---
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        <div className="bg-white border border-orange-200 rounded-2xl p-8 text-center shadow-cozy">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-600 text-3xl">quiz</span>
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-2">Bài kiểm tra chương</h2>
          <p className="text-sm text-stone-500 mb-5">
            Làm bài kiểm tra để hoàn thành chương này.
          </p>
          <button
            type="button"
            onClick={startTest}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md disabled:opacity-50"
          >
            Bắt đầu làm bài
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {(prevItem || nextItem) && (
          <div className="flex gap-3">
            {prevItem ? (
              <button
                type="button"
                onClick={() => onNavigateItem(prevItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-semibold transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Quay lại
              </button>
            ) : (
              <div className="flex-1" />
            )}
            {nextItem ? (
              <button
                type="button"
                onClick={() => onNavigateItem(nextItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition shadow-md shadow-orange-500/25"
              >
                Tiếp theo
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  // --- IN PROGRESS ---
  const currentQ = session.questions.find((q) => q.slot_index === currentSlot)
  const totalAnswered = Object.values(answers).filter((v) => v && v.length > 0).length
  const allAnswered = totalAnswered === session.total_questions

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-stone-600">
          Câu <span className="font-bold">{currentSlot}</span> / {session.total_questions} · Đã làm:{' '}
          <span className="font-bold">{totalAnswered}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {session.questions.map((q) => (
          <button
            type="button"
            key={q.slot_index}
            onClick={() => setCurrentSlot(q.slot_index)}
            className={`w-9 h-9 rounded-full text-sm font-bold transition ${
              currentSlot === q.slot_index
                ? 'bg-orange-600 text-white'
                : answers[q.slot_index]
                ? 'bg-green-200 text-green-800'
                : 'bg-stone-200 text-stone-600'
            }`}
          >
            {q.slot_index}
          </button>
        ))}
      </div>

      {currentQ && (
        <div className="bg-[#FFFDF9]/90 backdrop-blur border border-cream-200 rounded-2xl p-6 shadow-cozy">
          <h2 className="text-lg font-bold text-cream-900 mb-4">
            Câu {currentQ.slot_index}: {currentQ.text}
          </h2>
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => (
              <button
                type="button"
                key={i}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [currentQ.slot_index]: opt }))
                }
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                  answers[currentQ.slot_index] === opt
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-cream-200 hover:border-orange-300 bg-[#FFFDF9]'
                }`}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setCurrentSlot((s) => Math.max(1, s - 1))}
              disabled={currentSlot === 1}
              className="px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200 disabled:opacity-50"
            >
              ← Câu trước
            </button>
            {currentSlot < session.total_questions ? (
              <button
                type="button"
                onClick={() => setCurrentSlot((s) => Math.min(session.total_questions, s + 1))}
                className="px-4 py-2 rounded-xl bg-cream-100 text-stone-700 font-semibold hover:bg-cream-200"
              >
                Câu tiếp →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitTest}
                disabled={!allAnswered || submitting}
                className="px-5 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-500/25"
              >
                {submitting
                  ? 'Đang nộp bài…'
                  : allAnswered
                  ? 'Nộp bài'
                  : `Còn ${session.total_questions - totalAnswered} câu`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
