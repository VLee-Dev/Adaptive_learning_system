"""Database queries for questions."""
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.questions.model import Question, QuestionPurpose


def get_practice_questions_by_level(
    db: Session,
    topic_id: int,
    level: int,
    exclude_question_ids: list[int] | None = None
) -> list[Question]:
    """
    Get practice questions for a topic at a specific level.

    Args:
        db: Database session
        topic_id: Topic ID
        level: Question level (1, 2, or 3)
        exclude_question_ids: List of question IDs to exclude

    Returns:
        List of questions
    """
    query = db.query(Question).filter(
        and_(
            Question.topic_id == topic_id,
            Question.purpose == QuestionPurpose.PRACTICE,
            Question.level == level
        )
    )

    if exclude_question_ids:
        query = query.filter(Question.id.notin_(exclude_question_ids))

    return query.all()


def get_question_by_id(db: Session, question_id: int) -> Question | None:
    """Get a question by ID."""
    return db.query(Question).filter(Question.id == question_id).first()


def get_questions_by_topic(db: Session, topic_id: int, purpose: QuestionPurpose | None = None) -> list[Question]:
    """Get all questions for a topic, optionally filtered by purpose."""
    query = db.query(Question).filter(Question.topic_id == topic_id)

    if purpose:
        query = query.filter(Question.purpose == purpose)

    return query.all()
