from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.topics.model import TopicType
from app.lessons.model import LessonContentType
from app.questions.model import QuestionFormat, QuestionPurpose


class CourseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    is_published: bool = False


class CourseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    is_published: bool | None = None


class CourseAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_published: bool
    created_at: datetime


class ChapterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    order_index: int = Field(ge=1)


class ChapterUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    order_index: int | None = Field(default=None, ge=1)


class ChapterAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    description: str | None
    order_index: int
    created_at: datetime


class TopicCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    type: TopicType = TopicType.GENERAL
    order_index: int = Field(ge=1)
    p_init: float = Field(default=0.3, ge=0, le=1)
    p_transit: float = Field(default=0.2, ge=0, le=1)
    p_slip: float = Field(default=0.1, ge=0, le=1)
    p_guess: float = Field(default=0.25, ge=0, le=1)


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    type: TopicType | None = None
    order_index: int | None = Field(default=None, ge=1)


class TopicAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chapter_id: int
    name: str
    description: str | None
    type: TopicType
    order_index: int
    p_init: float
    p_transit: float
    p_slip: float
    p_guess: float
    created_at: datetime


class LessonCreate(BaseModel):
    content_type: LessonContentType
    content_url: str = Field(min_length=1)
    order_index: int = Field(ge=1)


class LessonUpdate(BaseModel):
    content_type: LessonContentType | None = None
    content_url: str | None = Field(default=None, min_length=1)
    order_index: int | None = Field(default=None, ge=1)


class LessonAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    content_type: LessonContentType
    content_url: str
    order_index: int
    created_at: datetime


class QuestionCreate(BaseModel):
    purpose: QuestionPurpose
    question_format: QuestionFormat
    question_text: str = Field(min_length=1)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str = Field(min_length=1, max_length=255)
    explanation: str | None = None
    level: int | None = Field(default=None, ge=1, le=3)
    stimulus_id: int | None = None

    @model_validator(mode="after")
    def validate_question(self):
        if len(set(self.options)) != 4:
            raise ValueError("Question options must be unique")
        if self.correct_answer not in self.options:
            raise ValueError("correct_answer must be one of options")
        if self.purpose == QuestionPurpose.PRACTICE and self.level is None:
            raise ValueError("Practice questions require level 1, 2, or 3")
        if self.purpose == QuestionPurpose.CHAPTER_FINAL and self.level is not None:
            raise ValueError("Chapter final questions cannot have a level")
        return self


class QuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    options: list[str] | None = Field(default=None, min_length=4, max_length=4)
    correct_answer: str | None = Field(default=None, min_length=1, max_length=255)
    explanation: str | None = None
    level: int | None = Field(default=None, ge=1, le=3)
    stimulus_id: int | None = None


class QuestionAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    purpose: QuestionPurpose
    question_format: QuestionFormat
    question_text: str
    options: list[str]
    correct_answer: str
    explanation: str | None
    level: int | None
    stimulus_id: int | None
    is_ai_generated: bool
    is_reviewed: bool
    created_at: datetime


class FinalTestCreate(BaseModel):
    total_questions: int = Field(ge=1)
    pass_percent: float = Field(default=70, ge=0, le=100)
    max_attempts: int | None = Field(default=None, ge=1)


class FinalTestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chapter_id: int
    total_questions: int
    pass_percent: float
    max_attempts: int | None
    created_at: datetime


class TestPoolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class TestPoolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_id: int
    name: str
    description: str | None


class TestSlotCreate(BaseModel):
    slot_index: int = Field(ge=1)
    is_required: bool = True


class TestSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_id: int
    slot_index: int
    is_required: bool
