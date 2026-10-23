from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.lessons.model import LessonContentType
from app.topics.model import TopicType


class CourseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    image_url: str | None
    enrollment_count: int
    created_at: datetime
    is_enrolled: bool = False  # True nếu user hiện tại đã đăng ký (chỉ khi auth)


class CourseDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    image_url: str | None
    is_published: bool
    enrollment_count: int
    is_enrolled: bool  # False cho public; BE endpoint không require auth nên luôn False
    created_at: datetime


class ChapterSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    description: str | None
    order_index: int


class TopicSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chapter_id: int
    name: str
    description: str | None
    type: TopicType
    order_index: int
    # FE cần course_id để dựng link tới trang học
    # (/student/courses/:courseId/learn?tab=practice&topic=:id) sau khi
    # route /student/topics/:topicId/practice bị gỡ.
    # KHÔNG lấy từ ORM vì Topic chỉ có chapter_id — phải join qua Chapter.
    course_id: int = 0


class LessonSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    name: str
    content_type: LessonContentType
    order_index: int


class LessonDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    name: str
    content_type: LessonContentType
    content: str
    content_url: str | None
    order_index: int
    created_at: datetime
