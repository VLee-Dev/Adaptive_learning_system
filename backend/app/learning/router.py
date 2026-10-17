"""Router for student learning flow - practice sessions and chapter tests."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from core.database import get_db
from app.learning.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    HeartbeatStudySessionRequest,
    MonthlyStreakResponse,
    QuestionResponse,
    StartStudySessionRequest,
    StartStudySessionResponse,
    StopStudySessionResponse,
    TopicMasteryResponse
)
from app.learning.chapter_test_schemas import (
    ChapterTestStartResponse,
    ChapterTestSubmitRequest,
    ChapterTestSubmitResponse,
    ChapterCompletionResponse
)
from app.learning.service import (
    get_monthly_streak,
    get_next_practice_question,
    get_topic_mastery_status,
    submit_practice_answer
)
from app.learning.chapter_test_service import (
    start_chapter_test,
    submit_chapter_test,
    get_chapter_completion_status
)
from app.enrollments.repository import list_enrollments_for_user
from app.users.model import User
from datetime import datetime

router = APIRouter(prefix="/learning", tags=["learning"])


@router.get("/enrollments")
def list_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """B32: List courses the student is enrolled in, with progress.

    Response shape (FE expects):
    [
      {
        "course_id": int,
        "course_name": str,
        "progress": float,        # 0–100, % chapter completed
        "completed": bool,        # course_completions record exists
        "last_accessed": str|null # ISO 8601 UTC, từ LearningEvent mới nhất
      },
      ...
    ]
    """
    rows = list_enrollments_for_user(db, current_user.id)
    return [
        {
            "course_id": r["course_id"],
            "course_name": r["course_name"],
            "progress": round(r["progress"], 2),
            "completed": r["completed"],
            "last_accessed": r["last_accessed"].isoformat()
                if isinstance(r["last_accessed"], datetime)
                else r["last_accessed"],
        }
        for r in rows
    ]


@router.get("/topics/{topic_id}/mastery", response_model=TopicMasteryResponse)
def get_mastery(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current mastery status for a topic."""
    try:
        return get_topic_mastery_status(db, current_user.id, topic_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/topics/{topic_id}/practice/next", response_model=QuestionResponse)
def get_practice_question(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get next practice question for a topic."""
    try:
        question = get_next_practice_question(db, current_user.id, topic_id)
        if question is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No practice questions available for this topic"
            )
        return question
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/topics/{topic_id}/practice/answer", response_model=AnswerSubmitResponse)
def submit_answer(
    topic_id: int,
    payload: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an answer to a practice question."""
    try:
        return submit_practice_answer(
            db,
            current_user.id,
            topic_id,
            payload.question_id,
            payload.selected_answer
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/chapters/{chapter_id}/test/start", response_model=ChapterTestStartResponse)
def start_test(
    chapter_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a chapter final test."""
    try:
        return start_chapter_test(db, current_user.id, chapter_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/chapters/test/submit", response_model=ChapterTestSubmitResponse)
def submit_test(
    payload: ChapterTestSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit chapter final test answers."""
    try:
        return submit_chapter_test(db, current_user.id, payload.test_session_id, payload.answers)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/chapters/{chapter_id}/completion", response_model=ChapterCompletionResponse)
def get_completion(
    chapter_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chapter completion status."""
    return get_chapter_completion_status(db, current_user.id, chapter_id)


@router.get("/monthly-streak")
def get_monthly_streak_endpoint(
    year: int,
    month: int,
    tz_offset_minutes: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mini calendar: tổng PHÚT học theo từng ngày trong tháng, theo giờ local user.

    Tính từ bảng `study_sessions` (realtime — không phải count attempts).
    Quy ước hiển thị "có học" = ≥ 1 phút do FE quyết định.

    Query params:
      - year: năm (vd 2026)
      - month: tháng 1-12
      - tz_offset_minutes: offset phút local-UTC. Việt Nam UTC+7 → -420.
    """
    if not 1 <= month <= 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="month must be between 1 and 12",
        )
    return get_monthly_streak(db, current_user.id, year, month, tz_offset_minutes)


# --- Study session tracking -------------------------------------------------

@router.post("/study-sessions/start", response_model=StartStudySessionResponse, status_code=status.HTTP_201_CREATED)
def start_study_session(
    payload: StartStudySessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bắt đầu 1 phiên học. Frontend gọi khi user mở trang practice/chapter-test."""
    from app.study_sessions.service import start_session

    sess = start_session(
        db,
        current_user.id,
        payload.kind,
        payload.reference_id,
    )
    return StartStudySessionResponse(
        session_id=sess.id,
        started_at=sess.started_at.isoformat() if sess.started_at else "",
        kind=sess.kind,
        reference_id=sess.reference_id,
    )


@router.post("/study-sessions/{session_id}/heartbeat", response_model=StartStudySessionResponse)
def heartbeat_study_session(
    session_id: int,
    payload: HeartbeatStudySessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """FE gọi mỗi 30s để cập nhật thời lượng thực tế. Server cap theo elapsed time."""
    from app.study_sessions.service import heartbeat

    sess = heartbeat(db, session_id, current_user.id, payload.duration_seconds)
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found",
        )
    return StartStudySessionResponse(
        session_id=sess.id,
        started_at=sess.started_at.isoformat() if sess.started_at else "",
        kind=sess.kind,
        reference_id=sess.reference_id,
    )


@router.post("/study-sessions/{session_id}/stop", response_model=StopStudySessionResponse)
def stop_study_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kết thúc phiên học (submit answer, chuyển tab, đóng tab, idle quá lâu)."""
    from app.study_sessions.service import stop_session

    sess = stop_session(db, session_id, current_user.id)
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found",
        )
    return StopStudySessionResponse(
        session_id=sess.id,
        duration_seconds=sess.duration_seconds,
        ended_at=sess.ended_at.isoformat() if sess.ended_at else "",
    )
