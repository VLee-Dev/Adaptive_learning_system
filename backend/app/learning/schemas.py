"""Schemas for practice sessions and learning flow."""
from pydantic import BaseModel, Field


class QuestionResponse(BaseModel):
    """Response containing a practice question."""
    question_id: int
    text: str
    options: list[str]
    level: int
    stimulus_id: int | None = None
    # C2: giải thích vì sao chọn câu này (ưu tiên câu hay sai, tránh lặp...)
    selection_reason: str | None = None
    # True nếu đây là câu user đã làm trước đó (đang ôn lại)
    is_retry: bool = False


class QuestionSelection(BaseModel):
    """Kết quả chọn câu hỏi: câu được chọn + ghi chú khi không có câu phù hợp."""
    question: QuestionResponse | None = None
    note: str | None = None


class PracticeNextResponse(BaseModel):
    """GET /practice/next.

    Trả 200 kèm `question: null` + `note` khi hết câu phù hợp, thay vì 404.
    "Hết câu phù hợp" là trạng thái BÌNH THƯỜNG (đã ôn xong), FE cần thông
    báo đúng chứ không phải màn lỗi "Chưa có câu hỏi".
    """
    question: QuestionResponse | None = None
    note: str | None = None
    # Topic đã pass → đây là lượt luyện lại (không tính BKT).
    passed: bool = False
    is_extra_practice: bool = False
    # Số câu đã làm / tổng số câu của lượt thi (để FE hiện thanh tiến độ).
    attempts_used: int = 0
    attempts_limit: int = 20


class AnswerSubmitRequest(BaseModel):
    """Request to submit an answer to a practice question."""
    question_id: int
    selected_answer: str


class PracticeAnswerResult(BaseModel):
    """Kết quả 1 câu trong lượt luyện lại (sau khi đã pass).

    Chỉ ghi thống kê — không tính BKT, không cộng `practice_attempts`.
    """
    question_id: int
    is_correct: bool
    # Đáp án đúng (rỗng nếu không lấy được — FE chỉ cần đúng/sai).
    correct_answer: str = ""


class PracticeSummary(BaseModel):
    """Tổng kết lượt luyện tập."""
    total: int = 0
    correct: int = 0
    wrong: int = 0
    accuracy: float = 0.0
    # Danh sách câu đúng/sai (chỉ có ở lượt luyện lại sau khi đã pass).
    results: list[PracticeAnswerResult] = Field(default_factory=list)


class AnswerSubmitResponse(BaseModel):
    """Response after submitting an answer."""
    is_correct: bool
    correct_answer: str
    explanation: str | None = None
    updated_mastery: float
    current_level: int
    status: str  # "in_progress" | "completed"
    next_question: QuestionResponse | None = None
    # C2: lý do không có câu tiếp theo (bank hết câu phù hợp)
    selection_note: str | None = None

    # --- Thông báo "hãy học kỹ hơn" (KHÔNG phải trạng thái) ---
    # Điều kiện: 5 sai liên tiếp, HOẶC 3 sai liên tiếp khi BKT < 0.30.
    # `lesson_url` trỏ về bài giảng để người học đọc lại.
    warning: str | None = None
    lesson_url: str | None = None
    suggested_lesson_id: int | None = None

    # --- Lượt thi ---
    attempts_used: int = 0
    attempts_limit: int = 20
    # Topic đã đạt yêu cầu pass.
    passed: bool = False
    # Lượt luyện lại sau khi đã pass → không tính BKT.
    is_extra_practice: bool = False
    summary: PracticeSummary = Field(default_factory=PracticeSummary)


class TopicMasteryResponse(BaseModel):
    """Response with topic mastery information."""
    topic_id: int
    topic_name: str
    mastery: float
    current_level: int
    practice_attempts: int
    status: str
    # Bằng chứng quan sát được (mastery là ước lượng, không phải trạng thái)
    correct_count: int = 0
    wrong_count: int = 0
    consecutive_correct: int = 0
    consecutive_wrong: int = 0
    # Người học đã đạt yêu cầu pass chủ đề này chưa?
    passed: bool = False

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
