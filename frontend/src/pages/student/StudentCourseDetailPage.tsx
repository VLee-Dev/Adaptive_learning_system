// StudentCourseDetailPage — Layout 2 cột: Sidebar trái (2 dropdown) + Nội dung giữa
// - Cột trái: 2 dropdown cố định
//   1) Tài liệu khóa học → list chapter (click → render nội dung chương ở giữa)
//   2) Điểm → bảng điểm luyện tập + kiểm tra
// - Cột giữa:
//   - View chapter: thanh bài học + luyện tập theo từng topic, cuối cùng thanh kiểm tra chương
//   - View điểm: bảng 3 cột (Mục | Hoàn thành | Điểm)
import { useEffect, useMemo, useState } from 'react'
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
  status: 'in_progress' | 'completed'
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

// Ngưỡng đạt cho cả luyện tập và kiểm tra
const PASS_SCORE_PERCENT = 80

// 1 dòng / bài luyện tập (1 / topic) hoặc bài kiểm tra (1 / chapter)
type ScoreRow = {
  key: string
  name: string
  kind: 'practice' | 'test'
  status: 'pass' | 'fail' | 'not_done'
  score: number | null
}

type LeftSection = 'docs' | 'scores'

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

  // === UI state: section nào đang mở, chapter nào đang xem ===
  const [leftSection, setLeftSection] = useState<LeftSection>('docs')
  const [docsOpen, setDocsOpen] = useState(true)
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)

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
        if (isAuthenticated) {
          try {
            const status = await courseApi.enrollmentStatus(courseIdNum)
            isEnrolled = status.is_enrolled
            if (isEnrolled) {
              courseData.is_enrolled = true
            }
          } catch {
            // ignore
          }
        }

        setCourse({ ...courseData, is_enrolled: isEnrolled })

        // 3) Lấy chapters
        const chaptersRes = await api.get<ChapterSummary[]>(`/courses/${courseIdNum}/chapters`)
        const chapterList = [...chaptersRes.data].sort((a, b) => a.order_index - b.order_index)
        setChapters(chapterList)

        // Auto-select chương đầu tiên
        if (chapterList.length > 0) {
          setSelectedChapterId(chapterList[0].id)
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

          const compResults = await Promise.allSettled(
            chapterList.map((c) =>
              api.get<ChapterCompletion>(`/learning/chapters/${c.id}/completion`),
            ),
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
      window.location.reload()
    } catch (e) {
      setError(toApiError(e).detail)
    } finally {
      setEnrolling(false)
    }
  }

  // === Thống kê tiến độ (dùng cho header) ===
  const totalChapters = chapters.length
  const completedChapters = Object.values(completions).filter((c) => c.is_completed).length
  const totalTopics = Object.values(topicsByChapter).reduce((s, arr) => s + arr.length, 0)
  const totalLessons = Object.values(lessonsByTopic).reduce((s, arr) => s + arr.length, 0)
  const completedTopics = Object.values(masteries).filter((m) => m.status === 'completed').length
  const overallPct =
    totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100)

  // === Selected chapter ===
  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  )
  const selectedChapterTopics = useMemo(
    () => (selectedChapterId ? topicsByChapter[selectedChapterId] ?? [] : []),
    [topicsByChapter, selectedChapterId],
  )
  const selectedChapterCompletion =
    selectedChapterId !== null ? completions[selectedChapterId] : undefined

  // === Bảng điểm: gộp tất cả bài luyện tập (1 dòng/topic) + bài kiểm tra (1 dòng/chapter) ===
  const scoreRows: ScoreRow[] = useMemo(() => {
    if (!course?.is_enrolled) return []
    const rows: ScoreRow[] = []

    // Luyện tập: 1 dòng / topic
    for (const ch of chapters) {
      const chTopics = topicsByChapter[ch.id] ?? []
      for (const t of chTopics) {
        const m = masteries[t.id]
        if (!m) {
          rows.push({
            key: `p-${t.id}`,
            name: `Luyện tập: ${t.name}`,
            kind: 'practice',
            status: 'not_done',
            score: null,
          })
        } else {
          const score = Math.round(m.mastery * 100)
          rows.push({
            key: `p-${t.id}`,
            name: `Luyện tập: ${t.name}`,
            kind: 'practice',
            status: score >= PASS_SCORE_PERCENT ? 'pass' : 'fail',
            score,
          })
        }
      }
    }

    // Kiểm tra chương: 1 dòng / chapter
    for (const ch of chapters) {
      const comp = completions[ch.id]
      if (!comp || !comp.is_completed) {
        rows.push({
          key: `t-${ch.id}`,
          name: `Kiểm tra: Chương ${ch.order_index} - ${ch.title}`,
          kind: 'test',
          status: 'not_done',
          score: null,
        })
      } else {
        const score = comp.test_score_percent ?? 0
        rows.push({
          key: `t-${ch.id}`,
          name: `Kiểm tra: Chương ${ch.order_index} - ${ch.title}`,
          kind: 'test',
          status: score >= PASS_SCORE_PERCENT ? 'pass' : 'fail',
          score,
        })
      }
    }

    return rows
  }, [course?.is_enrolled, chapters, topicsByChapter, masteries, completions])

  if (loading) {
    return <div className="text-stone-500 text-center py-12">Đang tải…</div>
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

      {/* === Header gọn === */}
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

      {/* === Body: 2 cột (trái = sidebar dropdown, phải = nội dung) === */}
      {course?.is_enrolled ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ===== LEFT: 2 dropdown cố định ===== */}
          <aside className="lg:col-span-2 space-y-3">
            {/* Dropdown 1: Tài liệu khóa học */}
            <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setDocsOpen((v) => !v)
                  if (!docsOpen) setLeftSection('docs')
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-cream-50"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">
                    menu_book
                  </span>
                  <span className="font-bold text-sm text-stone-800">Tài liệu khóa học</span>
                </div>
                <span
                  className={`material-symbols-outlined text-[18px] text-stone-500 transition-transform inline-block ${
                    docsOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
              {docsOpen && (
                <div className="border-t border-cream-200 p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                  {chapters.length === 0 ? (
                    <div className="text-center text-stone-400 text-xs py-3">
                      Khoá học chưa có chương nào.
                    </div>
                  ) : (
                    chapters.map((ch, idx) => {
                      const isSelected = ch.id === selectedChapterId
                      const isCompleted = completions[ch.id]?.is_completed
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setSelectedChapterId(ch.id)
                            setLeftSection('docs')
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-orange-50 text-orange-700 font-bold'
                              : 'text-stone-700 hover:bg-stone-50 font-semibold'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-stone-300'
                            }`}
                          >
                            {isCompleted ? (
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            ) : (
                              idx + 1
                            )}
                          </span>
                          <span className="truncate text-xs flex-1">
                            Chương {idx + 1}: {ch.title}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[14px] text-orange-600">
                              chevron_right
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Item 2: Điểm (bấm trực tiếp, không dropdown) */}
            <button
              type="button"
              onClick={() => setLeftSection('scores')}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-sm text-left transition-colors ${
                leftSection === 'scores'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-cream-200 hover:bg-cream-50'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  leftSection === 'scores' ? 'text-orange-600' : 'text-stone-500'
                }`}
              >
                bar_chart
              </span>
              <span
                className={`font-bold text-sm ${
                  leftSection === 'scores' ? 'text-orange-700' : 'text-stone-800'
                }`}
              >
                Điểm
              </span>
            </button>
          </aside>

          {/* ===== CENTER: Nội dung ===== */}
          <main className="lg:col-span-8 space-y-4">
            {leftSection === 'docs' ? (
              <ChapterView
                chapter={selectedChapter}
                chapterIndex={chapters.findIndex((c) => c.id === selectedChapterId)}
                courseId={courseIdNum}
                topics={selectedChapterTopics}
                lessonsByTopic={lessonsByTopic}
                masteries={masteries}
                completion={selectedChapterCompletion}
              />
            ) : (
              <ScoresView rows={scoreRows} />
            )}
          </main>

          {/* ===== RIGHT: Gợi ý + đánh giá ===== */}
          <aside className="lg:col-span-2 space-y-4">
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
                <div className="py-6 text-center text-[11px] text-stone-400">Đang tải gợi ý…</div>
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
              {chapters.map((ch, idx) => (
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

// ===== Sub-component: hiển thị nội dung 1 chapter =====
function ChapterView({
  chapter,
  chapterIndex,
  courseId,
  topics,
  lessonsByTopic,
  masteries,
  completion,
}: {
  chapter: ChapterSummary | null
  chapterIndex: number
  courseId: number
  topics: TopicSummary[]
  lessonsByTopic: Record<number, LessonSummary[]>
  masteries: Record<number, TopicMastery>
  completion: ChapterCompletion | undefined
}) {
  if (!chapter) {
    return (
      <div className="bg-white border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
        Chọn một chương ở cột bên trái để xem nội dung.
      </div>
    )
  }

  const isCompleted = completion?.is_completed
  const chapterNum = chapterIndex >= 0 ? chapterIndex + 1 : chapter.order_index

  return (
    <div className="space-y-4">
      {/* Tiêu đề chương */}
      <div className="bg-gradient-to-r from-orange-50 to-cream-50 border border-cream-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {chapterNum}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                Chương {chapterNum}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 leading-tight truncate">
                {chapter.title}
              </h2>
            </div>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Hoàn thành {completion?.test_score_percent?.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Render theo từng topic: thanh bài học → thanh luyện tập */}
      {topics.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
          Chương chưa có chủ đề nào.
        </div>
      ) : (
        <>
          {topics.map((t) => {
            const tLessons = lessonsByTopic[t.id] ?? []
            const tMastery = masteries[t.id]
            const tDone = tMastery?.status === 'completed'
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden"
              >
                {/* Thanh bài học (theo topic) */}
                <div className="p-4 bg-[#FFF9F6] border-b border-cream-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-orange-500 text-[18px]">
                      school
                    </span>
                    <h3 className="font-bold text-sm text-stone-800 truncate">
                      Bài học: {t.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {tDone ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Hoàn thành
                      </span>
                    ) : tMastery ? (
                      <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                        {Math.round(tMastery.mastery * 100)}%
                      </span>
                    ) : null}
                    <span className="text-[11px] text-stone-500">
                      {tLessons.length} bài
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-stone-100">
                  {tLessons.length === 0 ? (
                    <div className="p-4 text-center text-stone-400 text-sm">
                      Chủ đề chưa có bài học.
                    </div>
                  ) : (
                    tLessons.map((l) => {
                      const cType = l.content_type
                      const status: 'done' | 'upcoming' = tDone ? 'done' : 'upcoming'
                      return (
                        <div
                          key={l.id}
                          className="hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4 px-4 py-2.5"
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
                              <button
                                type="button"
                                onClick={() => (window.location.href = `/student/courses/${courseId}/learn?lesson=${l.id}`)}
                                className="text-sm font-bold text-stone-800 hover:text-orange-600 transition-colors block truncate"
                              >
                                {l.name}
                              </button>
                              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px] text-stone-400">
                                  {TYPE_ICON[cType] ?? TYPE_ICON.text}
                                </span>
                                {TYPE_LABEL[cType] ?? 'Bài học'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => (window.location.href = `/student/courses/${courseId}/learn?lesson=${l.id}`)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 ${
                              status === 'done'
                                ? 'border border-cream-300 text-orange-600 hover:bg-orange-50'
                                : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                          >
                            {status === 'done' ? 'Học lại' : 'Bắt đầu học'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Thanh luyện tập (theo topic) */}
                <div className="border-t border-cream-200">
                  <Link
                    to={`/student/courses/${chapter.course_id ?? courseId}/learn?tab=practice&topic=${t.id}`}
                    className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50/60 to-cream-50/60 hover:from-orange-100 hover:to-cream-100 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-orange-600 text-[18px]">
                        edit_note
                      </span>
                      <span className="font-bold text-sm text-stone-800">
                        Luyện tập: {t.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tMastery && (
                        <span className="text-[10px] font-semibold text-orange-700 bg-white border border-orange-200 px-1.5 py-0.5 rounded">
                          {Math.round(tMastery.mastery * 100)}%
                        </span>
                      )}
                      <span className="material-symbols-outlined text-[16px] text-orange-600 group-hover:translate-x-0.5 transition-transform">
                        arrow_forward
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Thanh bài kiểm tra chương (cuối cùng) */}
          <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden">
            <Link
              to={`/student/courses/${chapter.course_id ?? courseId}/learn?tab=test&chapter=${chapter.id}`}
              className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-orange-100 to-orange-50 hover:from-orange-200 hover:to-orange-100 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">fact_check</span>
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">
                    Cuối chương
                  </p>
                  <h3 className="font-bold text-sm text-stone-800 truncate">
                    Bài kiểm tra chương
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCompleted && completion?.test_score_percent !== null && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      (completion?.test_score_percent ?? 0) >= PASS_SCORE_PERCENT
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {completion?.test_score_percent?.toFixed(0)}%
                  </span>
                )}
                <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-orange-600 text-white group-hover:bg-orange-700 transition-colors shadow-sm">
                  {isCompleted ? 'Làm lại' : 'Bắt đầu kiểm tra'}
                </span>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

// ===== Sub-component: bảng điểm =====
function ScoresView({ rows }: { rows: ScoreRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-cream-200 rounded-2xl p-6 text-center text-stone-500">
        Chưa có bài luyện tập hoặc kiểm tra nào.
      </div>
    )
  }

  const totalCount = rows.length
  const passCount = rows.filter((r) => r.status === 'pass').length
  const failCount = rows.filter((r) => r.status === 'fail').length
  const notDoneCount = rows.filter((r) => r.status === 'not_done').length

  return (
    <div className="space-y-4">
      {/* Tóm tắt */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-cream-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Đạt
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{passCount}</p>
        </div>
        <div className="bg-white border border-cream-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Chưa đạt
          </p>
          <p className="text-xl font-bold text-red-500 mt-1">{failCount}</p>
        </div>
        <div className="bg-white border border-cream-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Chưa làm
          </p>
          <p className="text-xl font-bold text-stone-500 mt-1">{notDoneCount}</p>
        </div>
      </div>

      {/* Bảng */}
      <div className="bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-[#FFF9F6] border-b border-cream-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-600 text-[18px]">
              bar_chart
            </span>
            <h3 className="font-bold text-sm text-stone-800">Bảng điểm</h3>
            <span className="text-[11px] text-stone-500 ml-auto">
              Tổng {totalCount} mục · đạt từ {PASS_SCORE_PERCENT}%
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-stone-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Mục</th>
                <th className="text-center font-semibold px-4 py-3 w-40">Hoàn thành</th>
                <th className="text-right font-semibold px-4 py-3 w-28">Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`material-symbols-outlined text-[16px] shrink-0 ${
                          r.kind === 'test' ? 'text-orange-600' : 'text-stone-500'
                        }`}
                      >
                        {r.kind === 'test' ? 'fact_check' : 'edit_note'}
                      </span>
                      <span className="font-semibold text-stone-800 truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status === 'pass' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[12px]">check</span>
                        Đạt
                      </span>
                    )}
                    {r.status === 'fail' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                        Chưa đạt
                      </span>
                    )}
                    {r.status === 'not_done' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[12px]">
                          radio_button_unchecked
                        </span>
                        Chưa làm
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.score !== null ? (
                      <span
                        className={`font-bold ${
                          r.status === 'pass'
                            ? 'text-emerald-600'
                            : r.status === 'fail'
                              ? 'text-red-500'
                              : 'text-stone-700'
                        }`}
                      >
                        {r.score}
                        <span className="text-[10px] text-stone-500 font-normal">%</span>
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
