"""Repository for attempt history."""
from sqlalchemy.orm import Session

from app.attempts.model import Attempt

# Cửa sổ "gần đây" khi chọn câu hỏi (C2). Topic chỉ có ~10 câu practice nên
# loại vĩnh viễn mọi câu từng làm sẽ khiến user hết bank và lặp lại câu cũ.
RECENT_ATTEMPT_WINDOW = 12


def get_attempted_question_ids(db: Session, user_id: int, topic_id: int) -> list[int]:
    """Get list of question IDs the user has already attempted in this topic."""
    attempts = db.query(Attempt.question_id).filter(
        Attempt.user_id == user_id,
        Attempt.topic_id == topic_id
    ).distinct().all()

    return [a.question_id for a in attempts]


def get_recent_attempted_question_ids(
    db: Session,
    user_id: int,
    topic_id: int,
    window: int = RECENT_ATTEMPT_WINDOW,
) -> list[int]:
    """
    Câu đã làm trong `window` lượt gần nhất (C2).

    Khác `get_attempted_question_ids`: cái này loại VĨNH VIỄN mọi câu từng làm,
    nên với topic chỉ có 10 câu practice thì user bị "hết bank" và buộc phải
    lặp lại câu cũ. Cửa sổ gần đây giữ được tính "tránh lặp" mà vẫn cho user
    quay lại ôn những câu cũ khi cần (đúng mục tiêu weak-first).
    """
    attempts = (
        db.query(Attempt.question_id)
        .filter(
            Attempt.user_id == user_id,
            Attempt.topic_id == topic_id,
        )
        .order_by(Attempt.created_at.desc(), Attempt.id.desc())
        .limit(window)
        .all()
    )
    return [a.question_id for a in attempts]
