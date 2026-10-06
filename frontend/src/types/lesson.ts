/** Mirror of backend app/lessons/model.py:LessonContentType */
export type LessonContentType = 'image' | 'video' | 'text'

export const LESSON_CONTENT_TYPES: { value: LessonContentType; label: string }[] = [
  { value: 'text', label: 'Văn bản' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'video', label: 'Video' },
]