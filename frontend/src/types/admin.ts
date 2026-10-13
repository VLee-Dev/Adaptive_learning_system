/**
 * Re-export các type admin từ lib/adminApi.
 *
 * Một số page (AdminCourseListPage, AdminCourseDetailPage, AdminChapterDetailPage,
 * AdminLessonEditorPage, AdminQuestionEditorPage) import từ '@/types/admin' để
 * dễ tìm. File lib/adminApi.ts định nghĩa interface + typed helpers cùng nhau,
 * nên ở đây chỉ re-export để chuẩn hoá đường dẫn import.
 *
 * Nếu sau này tách types ra riêng (giống topic.ts/lesson.ts/question.ts) thì
 * chỉ cần đổi nguồn re-export.
 *
 * NOTE: PracticeConfig đã xoá (B1+B8). BKT thresholds hardcode trong BE.
 */

export type {
  Course,
  CourseCreate,
  CourseUpdate,
  Chapter,
  ChapterCreate,
  ChapterUpdate,
  Topic,
  TopicCreate,
  TopicUpdate,
  Lesson,
  LessonCreate,
  LessonUpdate,
  Question,
  QuestionCreate,
  QuestionUpdate,
  FinalTest,
  FinalTestCreate,
} from '@/lib/adminApi'
