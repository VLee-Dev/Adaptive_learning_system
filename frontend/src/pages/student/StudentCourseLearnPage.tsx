// StudentCourseLearnPage — Trang full-screen "học" trong 1 khóa
// Layout 2 cột:
//   - Trái: Sidebar các chương (accordion). Mỗi chương mở ra hiện list bài học + bài luyện tập + bài kiểm tra.
//   - Phải: Hiện nội dung bài học (markdown/text) hoặc cảnh báo đi sang trang luyện tập / kiểm tra.
// Header đã có sẵn (Layout tự wrap StudentHeader).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { courseApi, toApiError, type CourseDetail } from '@/lib/api'

// === Types khớp backend ===
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

// 1 item trong sidebar (bài học / luyện tập / kiểm tra)
type SidebarItem =
  | { kind: 'lesson'; id: number; name: string; topicId: number; contentType: 'text' | 'image' | 'video' }
  | { kind: 'practice'; id: number; name: string }
  | { kind: 'test'; id: number; name: string }

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

export default function StudentCourseLearnPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseIdNum = Number(courseId)
  const navigate = useNavigate()

  // === Data ===
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [topicsByChapter, setTopicsByChapter] = useState<Record<number, TopicSummary[]>>({})
  const [lessonsByTopic, setLessonsByTopic] = useState<Record<number, LessonSummary[]>>({})

  // === UI state ===
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set())
  const [activeItem, setActiveItem] = useState<SidebarItem | null>(null)

  // Lesson detail (khi active là lesson)
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [lessonError, setLessonError] = useState<string | null>(null)

  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // === Load course + chapters + topics + lessons ===
  useEffect(() => {
    if (!courseIdNum) return
    setPageLoading(true)
    setPageError(null)

    ;(async () => {
      try {
        const courseData = await courseApi.detail(courseIdNum)
        setCourse(courseData)

        const chaptersRes = await api.get<ChapterSummary[]>(`/courses/${courseIdNum}/chapters`)
        const chapterList = [...chaptersRes.data].sort((a, b) => a.order_index - b.order_index)
        setChapters(chapterList)

        // Mở sẵn chương đầu tiên
        if (chapterList.length > 0) {
          setOpenChapters(new Set([chapterList[0].id]))
        }

        const topicResults = await Promise.allSettled(
          chapterList.map((c) => api.get<TopicSummary[]>(`/chapters/${c.id}/topics`)),
        )
        const tByC: Record<number, TopicSummary[]> = {}
        const allTopicIds: number[] = []
        for (let i = 0; i < chapterList.length; i++) {
          const r = topicResults[i]
          const list = r.status === 'fulfilled' ? r.value.data : []
          tByC[chapterList[i].id] = [...list].sort((a, b) => a.order_index - b.order_index)
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
      } catch (e) {
        setPageError(toApiError(e).detail)
      } finally {
        setPageLoading(false)
      }
    })()
  }, [courseIdNum])

  // === Khi chọn 1 bài học → load chi tiết ===
  useEffect(() => {
    if (!activeItem || activeItem.kind !== 'lesson') {
      setLessonDetail(null)
      setLessonError(null)
      return
    }
    setLoadingLesson(true)
    setLessonError(null)
    api
      .get<LessonDetail>(`/lessons/${activeItem.id}`)
      .then((r) => setLessonDetail(r.data))
      .catch((e) => setLessonError(toApiError(e).detail))
      .finally(() => setLoadingLesson(false))
  }, [activeItem])

  // === Helpers ===
  const toggleChapter = (cid: number) => {
    setOpenChapters((prev) => {
      const next = new Set(prev)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  const flatItems = useMemo<SidebarItem[]>(() => {
    const items: SidebarItem[] = []
    for (const ch of chapters) {
      const topics = topicsByChapter[ch.id] || []
      for (const t of topics) {
        const lessons = lessonsByTopic[t.id] || []
        for (const l of lessons) {
          items.push({
            kind: 'lesson',
            id: l.id,
            topicId: l.topic_id,
            name: l.name,
            contentType: l.content_type,
          })
        }
        // Bài luyện tập (1 / topic)
        items.push({ kind: 'practice', id: t.id, name: `Luyện tập: ${t.name}` })
      }
      // Bài kiểm tra cuối chương (1 / chapter)
      items.push({ kind: 'test', id: ch.id, name: `Kiểm tra: ${ch.title}` })
    }
    return items
  }, [chapters, topicsByChapter, lessonsByTopic])

  const currentIndex = activeItem ? flatItems.findIndex((i) => i.kind === activeItem.kind && i.id === activeItem.id) : -1
  const prevItem = currentIndex > 0 ? flatItems[currentIndex - 1] : null
  const nextItem = currentIndex >= 0 && currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null

  const handleItemClick = (item: SidebarItem) => {
    if (item.kind === 'practice') {
      // Điều hướng sang page luyện tập hiện có (giữ nguyên BKT logic)
      navigate(`/student/topics/${item.id}/practice`)
      return
    }
    if (item.kind === 'test') {
      // Mở bài kiểm tra chương inline tại trang /learn
      navigate(`/student/courses/${courseId}/learn?tab=test&chapter=${item.id}`)
      return
    }
    setActiveItem(item)
  }

  const goToItem = (item: SidebarItem | null) => {
    if (!item) return
    handleItemClick(item)
  }

  // === Render ===
  if (pageLoading) {
    return (
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center bg-cream-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span>Đang tải nội dung khóa học...</span>
        </div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center bg-cream-50 p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
          <p className="mt-3 text-stone-700">{pageError}</p>
          <button
            type="button"
            onClick={() => navigate('/student/courses')}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold"
          >
            Quay lại danh sách khóa học
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex bg-cream-50 overflow-hidden">
      {/* ===== Sidebar ===== */}
      <aside className="w-80 lg:w-[22rem] shrink-0 bg-white border-r border-cream-200 flex flex-col">
        {/* Sidebar header */}
        <div className="p-4 border-b border-cream-200 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-orange-600">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Nội dung khóa học</span>
            </div>
            <h2 className="mt-1 font-bold text-sm text-stone-800 leading-snug line-clamp-2">
              {course?.name || 'Khóa học'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/student/courses/${courseIdNum}`)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-orange-50 transition-colors shrink-0"
            aria-label="Đóng danh mục"
            title="Quay lại trang khóa học"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Chapters list */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
          {chapters.length === 0 && (
            <p className="px-3 py-6 text-sm text-stone-500 text-center">
              Khóa học chưa có chương nào.
            </p>
          )}

          {chapters.map((ch, idx) => {
            const isOpen = openChapters.has(ch.id)
            const topics = topicsByChapter[ch.id] || []
            return (
              <div key={ch.id} className="space-y-1">
                {/* Chapter header (accordion) */}
                <button
                  type="button"
                  onClick={() => toggleChapter(ch.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-orange-50/60 hover:bg-orange-50 border border-orange-100 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                      Mô-đun {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-stone-800 line-clamp-1">
                      {ch.title}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-stone-500 text-[20px] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {/* Items bên trong */}
                {isOpen && (
                  <div className="space-y-1 pl-1">
                    {topics.length === 0 && (
                      <p className="px-3 py-2 text-xs text-stone-400 italic">Chưa có bài học.</p>
                    )}

                    {topics.map((t) => {
                      const lessons = lessonsByTopic[t.id] || []
                      return (
                        <div key={t.id} className="space-y-1">
                          <p className="px-3 pt-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            {t.name}
                          </p>
                          {lessons.map((l) => {
                            const isActive =
                              activeItem?.kind === 'lesson' && activeItem.id === l.id
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() =>
                                  handleItemClick({
                                    kind: 'lesson',
                                    id: l.id,
                                    topicId: l.topic_id,
                                    name: l.name,
                                    contentType: l.content_type,
                                  })
                                }
                                className={`group w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                                  isActive
                                    ? 'bg-orange-100/70 border border-orange-200 shadow-sm'
                                    : 'hover:bg-orange-50/70 border border-transparent'
                                }`}
                              >
                                <span
                                  className={`mt-0.5 shrink-0 ${
                                    isActive ? 'text-orange-600' : 'text-stone-400 group-hover:text-orange-500'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {TYPE_ICON[l.content_type] || 'article'}
                                  </span>
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-xs leading-snug line-clamp-2 ${
                                      isActive ? 'font-bold text-stone-900' : 'font-medium text-stone-700 group-hover:text-stone-900'
                                    }`}
                                  >
                                    {l.name}
                                  </p>
                                  <p
                                    className={`mt-1 text-[10px] font-semibold ${
                                      isActive ? 'text-orange-600' : 'text-stone-400'
                                    }`}
                                  >
                                    {TYPE_LABEL[l.content_type] || l.content_type}
                                  </p>
                                </div>
                              </button>
                            )
                          })}

                          {/* Luyện tập */}
                          <button
                            type="button"
                            onClick={() =>
                              handleItemClick({ kind: 'practice', id: t.id, name: `Luyện tập: ${t.name}` })
                            }
                            className="group w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors hover:bg-amber-50/70 border border-transparent"
                          >
                            <span className="mt-0.5 shrink-0 text-amber-500 group-hover:text-amber-600">
                              <span className="material-symbols-outlined text-[18px]">fitness_center</span>
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-700 group-hover:text-amber-700 line-clamp-1">
                                Luyện tập: {t.name}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-amber-600">
                                Câu hỏi BKT thích ứng
                              </p>
                            </div>
                          </button>
                        </div>
                      )
                    })}

                    {/* Kiểm tra cuối chương */}
                    <button
                      type="button"
                      onClick={() =>
                        handleItemClick({ kind: 'test', id: ch.id, name: `Kiểm tra: ${ch.title}` })
                      }
                      className="group w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors hover:bg-rose-50/70 border border-transparent mt-1"
                    >
                      <span className="mt-0.5 shrink-0 text-rose-500 group-hover:text-rose-600">
                        <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-stone-700 group-hover:text-rose-700 line-clamp-1">
                          Kiểm tra: {ch.title}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-rose-600">
                          Bài kiểm tra tổng kết chương
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 bg-orange-50/40 border-t border-cream-200 text-center">
          <p className="text-[11px] text-stone-500 italic">
            🐾 "Tập trung từng bước, chú mèo nhỏ sẽ về đích."
          </p>
        </div>
      </aside>

      {/* ===== Main reading area ===== */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 lg:px-16">
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
          {!activeItem && (
            <EmptyState courseTitle={course?.name} onBack={() => navigate(`/student/courses/${courseIdNum}`)} />
          )}

          {activeItem && activeItem.kind === 'lesson' && (
            <LessonView
              loading={loadingLesson}
              error={lessonError}
              lesson={lessonDetail}
              onPrev={() => goToItem(prevItem)}
              onNext={() => goToItem(nextItem)}
              hasPrev={!!prevItem}
              hasNext={!!nextItem}
            />
          )}
        </div>
      </main>
    </div>
  )
}

// ===== Sub components =====

function EmptyState({ courseTitle, onBack }: { courseTitle?: string; onBack: () => void }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl border border-cream-200 shadow-sm p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
        <span className="material-symbols-outlined text-[32px]">menu_book</span>
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-stone-900">
        Chào mừng đến với khóa học{courseTitle ? `: ${courseTitle}` : ''}
      </h2>
      <p className="mt-2 text-sm text-stone-600 leading-relaxed">
        Hãy chọn một bài học trong danh mục bên trái để bắt đầu. Khi sẵn sàng, bạn có thể vào phần
        <strong className="text-amber-600"> Luyện tập</strong> hoặc
        <strong className="text-rose-600"> Kiểm tra</strong> tương ứng.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Quay lại trang khóa học
      </button>
    </div>
  )
}

function LessonView({
  loading,
  error,
  lesson,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  loading: boolean
  error: string | null
  lesson: LessonDetail | null
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white/80 rounded-3xl border border-cream-200 p-10 text-center text-stone-500">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <p className="mt-2 text-sm">Đang tải nội dung bài học...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-red-200 p-8 text-center">
        <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
        <p className="mt-2 text-sm text-stone-700">{error}</p>
      </div>
    )
  }
  if (!lesson) return null

  return (
    <>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
            <span className="material-symbols-outlined text-[14px]">
              {TYPE_ICON[lesson.content_type] || 'article'}
            </span>
            {TYPE_LABEL[lesson.content_type] || lesson.content_type}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight leading-tight">
          {lesson.name}
        </h1>
      </div>

      {/* Notice */}
      <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200/70 flex items-start gap-3">
        <span className="material-symbols-outlined text-orange-600 mt-0.5">info</span>
        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
          Hãy đọc kỹ nội dung bài học, sau đó làm phần <strong>Luyện tập</strong> ở thanh bên trái để
          hệ thống đánh giá mức độ thành thạo của bạn nhé.
        </p>
      </div>

      {/* Body */}
      <article className="bg-white/85 backdrop-blur rounded-3xl p-6 sm:p-10 border border-cream-200 shadow-sm text-stone-800 space-y-5 leading-relaxed text-sm sm:text-base">
        {lesson.content_type === 'text' && (
          <pre className="whitespace-pre-wrap font-sans text-stone-800 leading-relaxed">
            {lesson.content}
          </pre>
        )}

        {lesson.content_type === 'image' && (
          <div className="space-y-3">
            {lesson.content && (
              <p className="text-stone-700 whitespace-pre-wrap">{lesson.content}</p>
            )}
            {lesson.content_url && (
              <img
                src={lesson.content_url}
                alt={lesson.name}
                className="w-full rounded-2xl border border-cream-200"
              />
            )}
          </div>
        )}

        {lesson.content_type === 'video' && (
          <div className="space-y-3">
            {lesson.content && (
              <p className="text-stone-700 whitespace-pre-wrap">{lesson.content}</p>
            )}
            {lesson.content_url && (
              <video
                controls
                src={lesson.content_url}
                className="w-full rounded-2xl border border-cream-200 bg-black"
              />
            )}
          </div>
        )}
      </article>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-orange-200 bg-white/80 hover:bg-orange-50 text-stone-700 text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Bài trước
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Chuyển đến mục tiếp theo
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </>
  )
}
