/** Mirror of backend app/topics/model.py:TopicType */
export type TopicType = 'general' | 'grammar' | 'listening'

export const TOPIC_TYPES: { value: TopicType; label: string }[] = [
  { value: 'general', label: 'Tổng quát' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'listening', label: 'Nghe' },
]