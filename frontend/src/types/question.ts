/** Mirror of backend app/questions/model.py enums */
export type QuestionPurpose = 'practice' | 'chapter_final'
export type QuestionFormat =
  | 'standard'
  | 'fill_blank'
  | 'listening'
  | 'reading'
  | 'image'

export const QUESTION_PURPOSES: { value: QuestionPurpose; label: string }[] = [
  { value: 'practice', label: 'Luyện tập' },
  { value: 'chapter_final', label: 'Kiểm tra cuối chương' },
]

export const QUESTION_FORMATS: { value: QuestionFormat; label: string }[] = [
  { value: 'standard', label: 'Trắc nghiệm chuẩn' },
  { value: 'fill_blank', label: 'Điền vào chỗ trống' },
  { value: 'listening', label: 'Nghe' },
  { value: 'reading', label: 'Đọc hiểu' },
  { value: 'image', label: 'Hình ảnh' },
]