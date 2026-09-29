from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.lessons.model import LessonContentType
from app.topics.model import TopicType


class CourseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime


class CourseDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_published: bool
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
