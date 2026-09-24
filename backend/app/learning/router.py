"""Router for student learning flow - practice sessions and chapter tests."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from core.database import get_db
from app.learning.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    QuestionResponse,
    TopicMasteryResponse
)
from app.learning.chapter_test_schemas import (
    ChapterTestStartResponse,
    ChapterTestSubmitRequest,
    ChapterTestSubmitResponse,
    ChapterCompletionResponse
)
from app.learning.service import (
    get_next_practice_question,
    get_topic_mastery_status,
    submit_practice_answer
)
from app.learning.chapter_test_service import (
    start_chapter_test,
    submit_chapter_test,
    get_chapter_completion_status
)
from app.users.model import User

router = APIRouter(prefix="/learning", tags=["learning"])


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
