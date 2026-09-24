"""Schemas for practice sessions and learning flow."""
from pydantic import BaseModel


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
