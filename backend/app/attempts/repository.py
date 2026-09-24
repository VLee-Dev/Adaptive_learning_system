"""Repository for attempt history."""
from sqlalchemy.orm import Session

from app.attempts.model import Attempt


def create_attempt(db: Session, attempt: Attempt) -> Attempt:
    """Create a new attempt record."""
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def get_recent_attempts(db: Session, user_id: int, topic_id: int, limit: int = 10) -> list[Attempt]:
    """Get recent attempts for a user in a topic."""
    return db.query(Attempt).filter(
        Attempt.user_id == user_id,
        Attempt.topic_id == topic_id
    ).order_by(Attempt.created_at.desc()).limit(limit).all()


def get_attempted_question_ids(db: Session, user_id: int, topic_id: int) -> list[int]:
    """Get list of question IDs the user has already attempted in this topic."""
    attempts = db.query(Attempt.question_id).filter(
        Attempt.user_id == user_id,
        Attempt.topic_id == topic_id
    ).distinct().all()

    return [a.question_id for a in attempts]
