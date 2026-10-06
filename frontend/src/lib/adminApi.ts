/**
 * Typed API helpers for admin endpoints.
 * All endpoints require admin role (enforced by backend).
 */
import api from './api'
import type { TopicType } from '@/types/topic'
import type { LessonContentType } from '@/types/lesson'
import type { QuestionFormat, QuestionPurpose } from '@/types/question'

// ---------- Courses ----------
export const courseAdminGet = {
  list: () => api.get<Course[]>('/admin/courses').then((r) => r.data),
  create: (data: CourseCreate) => api.post<Course>('/admin/courses', data).then((r) => r.data),
  update: (id: number, data: CourseUpdate) =>
    api.patch<Course>(`/admin/courses/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/courses/${id}`).then(() => undefined),
  listChapters: (courseId: number) =>
    api.get<Chapter[]>(`/admin/courses/${courseId}/chapters`).then((r) => r.data),
}

// ---------- Chapters ----------
export const chapterAdminGet = {
  list: (courseId: number) =>
    api.get<Chapter[]>(`/admin/courses/${courseId}/chapters`).then((r) => r.data),
  create: (courseId: number, data: ChapterCreate) =>
    api.post<Chapter>(`/admin/courses/${courseId}/chapters`, data).then((r) => r.data),
  update: (id: number, data: ChapterUpdate) =>
    api.patch<Chapter>(`/admin/chapters/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/chapters/${id}`).then(() => undefined),
}

// ---------- Topics ----------
export const topicAdminGet = {
  list: (chapterId: number) =>
    api.get<Topic[]>(`/admin/chapters/${chapterId}/topics`).then((r) => r.data),
  create: (chapterId: number, data: TopicCreate) =>
    api.post<Topic>(`/admin/chapters/${chapterId}/topics`, data).then((r) => r.data),
  update: (id: number, data: TopicUpdate) =>
    api.patch<Topic>(`/admin/topics/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/topics/${id}`).then(() => undefined),
}

// ---------- Lessons ----------
export const lessonAdminGet = {
  list: (topicId: number) =>
    api.get<Lesson[]>(`/admin/topics/${topicId}/lessons`).then((r) => r.data),
  create: (topicId: number, data: LessonCreate) =>
    api.post<Lesson>(`/admin/topics/${topicId}/lessons`, data).then((r) => r.data),
  update: (id: number, data: LessonUpdate) =>
    api.patch<Lesson>(`/admin/lessons/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/lessons/${id}`).then(() => undefined),
}

// ---------- Questions ----------
export const questionAdminGet = {
  list: (topicId: number) =>
    api.get<Question[]>(`/admin/topics/${topicId}/questions`).then((r) => r.data),
  create: (topicId: number, data: QuestionCreate) =>
    api.post<Question>(`/admin/topics/${topicId}/questions`, data).then((r) => r.data),
  update: (id: number, data: QuestionUpdate) =>
    api.patch<Question>(`/admin/questions/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/questions/${id}`).then(() => undefined),
}

// ---------- Final Test (basic) ----------
export const finalTestAdminGet = {
  get: (chapterId: number) =>
    api.get<FinalTest>(`/admin/chapters/${chapterId}/final-test`).then((r) => r.data),
  create: (chapterId: number, data: FinalTestCreate) =>
    api.post<FinalTest>(`/admin/chapters/${chapterId}/final-test`, data).then((r) => r.data),
}

// ---------- Practice Config ----------
export const practiceConfigAdminGet = {
  get: (topicId: number) =>
    api.get<PracticeConfig>(`/admin/practice-config/${topicId}`).then((r) => r.data),
  create: (topicId: number, data: PracticeConfigCreate) =>
    api.post<PracticeConfig>(`/admin/practice-config/${topicId}`, data).then((r) => r.data),
  update: (topicId: number, data: PracticeConfigUpdate) =>
    api.patch<PracticeConfig>(`/admin/practice-config/${topicId}`, data).then((r) => r.data),
  remove: (topicId: number) =>
    api.delete(`/admin/practice-config/${topicId}`).then(() => undefined),
}

// =========================================================================
// Type definitions (mirror backend Pydantic schemas)
// =========================================================================

export interface Course {
  id: number
  name: string
  description: string | null
  is_published: boolean
  created_at: string
}

export interface CourseCreate {
  name: string
  description?: string
  is_published?: boolean
}

export interface CourseUpdate {
  name?: string
  description?: string
  is_published?: boolean
}

export interface Chapter {
  id: number
  course_id: number
  title: string
  description: string | null
  order_index: number
  created_at: string
}

export interface ChapterCreate {
  title: string
  description?: string
  order_index: number
}

export interface ChapterUpdate {
  title?: string
  description?: string
  order_index?: number
}

export interface Topic {
  id: number
  chapter_id: number
  name: string
  description: string | null
  type: TopicType
  order_index: number
  p_init: number
  p_transit: number
  p_slip: number
  p_guess: number
  created_at: string
}

export interface TopicCreate {
  name: string
  description?: string
  type?: TopicType
  order_index: number
  p_init?: number
  p_transit?: number
  p_slip?: number
  p_guess?: number
}

export interface TopicUpdate {
  name?: string
  description?: string
  type?: TopicType
  order_index?: number
}

export interface Lesson {
  id: number
  topic_id: number
  name: string
  content_type: LessonContentType
  content: string
  content_url: string | null
  order_index: number
  created_at: string
}

export interface LessonCreate {
  name: string
  content_type: LessonContentType
  content: string
  content_url?: string
  order_index: number
}

export interface LessonUpdate {
  name?: string
  content_type?: LessonContentType
  content?: string
  content_url?: string
  order_index?: number
}

export interface Question {
  id: number
  topic_id: number
  purpose: QuestionPurpose
  question_format: QuestionFormat
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  level: number | null
  stimulus_id: number | null
  is_ai_generated: boolean
  is_reviewed: boolean
  created_at: string
}

export interface QuestionCreate {
  purpose: QuestionPurpose
  question_format: QuestionFormat
  question_text: string
  options: string[]
  correct_answer: string
  explanation?: string
  level?: number
  stimulus_id?: number
}

export interface QuestionUpdate {
  question_text?: string
  options?: string[]
  correct_answer?: string
  explanation?: string
  level?: number
  stimulus_id?: number
}

export interface FinalTest {
  id: number
  chapter_id: number
  total_questions: number
  pass_percent: number
  max_attempts: number | null
  created_at: string
}

export interface FinalTestCreate {
  total_questions: number
  pass_percent?: number
  max_attempts?: number | null
}

export interface PracticeConfig {
  id: number
  topic_id: number
  questions_per_session: number
  starting_level: number
  level_1_questions: number
  level_2_questions: number
  level_3_questions: number
  level_up_mastery: number
  completion_mastery: number
  review_mastery: number
  max_attempts: number | null
  review_limit: number | null
}

export interface PracticeConfigCreate {
  questions_per_session?: number
  starting_level?: number
  level_1_questions?: number
  level_2_questions?: number
  level_3_questions?: number
  level_up_mastery?: number
  completion_mastery?: number
  review_mastery?: number
  max_attempts?: number | null
  review_limit?: number | null
}

export interface PracticeConfigUpdate {
  questions_per_session?: number
  starting_level?: number
  level_1_questions?: number
  level_2_questions?: number
  level_3_questions?: number
  level_up_mastery?: number
  completion_mastery?: number
  review_mastery?: number
  max_attempts?: number | null
  review_limit?: number | null
}