"""Database queries for questions."""
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.questions.model import Question, QuestionPurpose
from app.questions.stat_model import QuestionStat


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


# ===== C2: adaptive selection support =====


def get_all_practice_questions(
    db: Session,
    topic_id: int,
    exclude_question_ids: list[int] | None = None,
) -> list[Question]:
    """Tất cả câu practice của topic (bỏ filter level) — dùng cho C2."""
    query = db.query(Question).filter(
        and_(
            Question.topic_id == topic_id,
            Question.purpose == QuestionPurpose.PRACTICE,
        )
    )
    if exclude_question_ids:
        query = query.filter(Question.id.notin_(exclude_question_ids))
    return query.all()


def get_question_wrong_rates(
    db: Session,
    user_id: int,
    question_ids: list[int],
) -> dict[int, QuestionStat]:
    """Lấy thống kê sai của user cho danh sách câu (weak-first cho C2)."""
    if not question_ids:
        return {}
    rows = (
        db.query(QuestionStat)
        .filter(
            QuestionStat.user_id == user_id,
            QuestionStat.question_id.in_(question_ids),
        )
        .all()
    )
    return {r.question_id: r for r in rows}


def upsert_question_stat(
    db: Session,
    user_id: int,
    question_id: int,
    is_correct: bool,
    created_at=None,
) -> QuestionStat:
    """
    Cập nhật thống kê theo câu sau mỗi lượt trả lời (C2).

    Dùng get-or-create + update thay vì upsert để giữ logic đơn giản và
    tương thích với mọi backend (không phụ thuộc ON CONFLICT).
    """
    stat = (
        db.query(QuestionStat)
        .filter(
            QuestionStat.user_id == user_id,
            QuestionStat.question_id == question_id,
        )
        .first()
    )
    if stat is None:
        stat = QuestionStat(user_id=user_id, question_id=question_id, attempts=0, wrong=0)
        db.add(stat)

    stat.attempts += 1
    if not is_correct:
        stat.wrong += 1
        stat.last_wrong_at = created_at

    return stat
