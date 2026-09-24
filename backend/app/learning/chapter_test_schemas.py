"""Schemas for chapter final test."""
from pydantic import BaseModel


class ChapterTestStartResponse(BaseModel):
    """Response when starting a chapter final test."""
    test_session_id: str
    chapter_id: int
    total_questions: int
    pass_percent: float
    questions: list["TestQuestionResponse"]


class TestQuestionResponse(BaseModel):
    """A question in the chapter final test."""
    question_id: int
    slot_index: int
    text: str
    options: list[str]
    stimulus_id: int | None = None


class ChapterTestSubmitRequest(BaseModel):
    """Request to submit chapter final test answers."""
    test_session_id: str
    answers: dict[int, str]  # slot_index -> selected_answer


class ChapterTestSubmitResponse(BaseModel):
    """Response after submitting chapter final test."""
    passed: bool
    score_percent: float
    pass_percent: float
    correct_count: int
    total_questions: int
    chapter_completed: bool
    detailed_results: list["TestAnswerResult"]


class TestAnswerResult(BaseModel):
    """Result for a single test question."""
    slot_index: int
    question_id: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str | None = None


class ChapterCompletionResponse(BaseModel):
    """Response for chapter completion status."""
    chapter_id: int
    is_completed: bool
    test_score_percent: float | None = None
    completed_at: str | None = None

    class Config:
        from_attributes = True
