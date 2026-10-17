"""Schemas for practice sessions and learning flow."""
from pydantic import BaseModel, Field


class PracticeStartRequest(BaseModel):
    """Request to start a practice session for a topic."""
    topic_id: int


class PracticeStartResponse(BaseModel):
    """Response when starting a practice session."""
    session_id: str
    topic_id: int
    current_level: int
    current_mastery: float
    questions_remaining: int


class QuestionResponse(BaseModel):
    """Response containing a practice question."""
    question_id: int
    text: str
    options: list[str]
    level: int
    stimulus_id: int | None = None


class AnswerSubmitRequest(BaseModel):
    """Request to submit an answer to a practice question."""
    question_id: int
    selected_answer: str


class AnswerSubmitResponse(BaseModel):
    """Response after submitting an answer."""
    is_correct: bool
    correct_answer: str
    explanation: str | None = None
    updated_mastery: float
    current_level: int
    status: str  # "in_progress", "completed", "review_required"
    next_question: QuestionResponse | None = None


class TopicMasteryResponse(BaseModel):
    """Response with topic mastery information."""
    topic_id: int
    topic_name: str
    mastery: float
    current_level: int
    practice_attempts: int
    status: str

    class Config:
        from_attributes = True


class MonthlyStreakResponse(BaseModel):
    """Mini calendar: lịch học theo tháng.

    Frontend gửi `year`, `month` (1-12) và `tz_offset_minutes` (phút offset local
    của user so với UTC, vd Việt Nam = -420). Backend query study_sessions trong
    khoảng [start_utc, end_utc) tương ứng với 00:00 ngày đầu tháng → 00:00 ngày
    đầu tháng sau theo giờ local, group theo local date, trả dict {YYYY-MM-DD: phút}.
    """
    year: int
    month: int = Field(ge=1, le=12)
    days_in_month: int
    first_weekday: int = Field(ge=0, le=6, description="0=Mon, 6=Sun theo ISO weekday")
    minutes_per_day: dict[str, int] = Field(
        default_factory=dict,
        description="Map 'YYYY-MM-DD' (local date) → tổng phút học trong ngày đó"
    )


class StartStudySessionRequest(BaseModel):
    """Request để bắt đầu 1 phiên học (khi user mở trang practice / chapter test)."""
    kind: str = Field(pattern="^(practice|chapter_test)$")
    reference_id: int | None = None


class StartStudySessionResponse(BaseModel):
    session_id: int
    started_at: str
    kind: str
    reference_id: int | None


class HeartbeatStudySessionRequest(BaseModel):
    """Heartbeat mỗi 30s: cập nhật duration_seconds hiện tại."""
    duration_seconds: int = Field(ge=0, le=86400)


class StopStudySessionResponse(BaseModel):
    session_id: int
    duration_seconds: int
    ended_at: str
