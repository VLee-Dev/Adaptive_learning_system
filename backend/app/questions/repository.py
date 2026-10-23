"""Database queries for questions."""
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.questions.model import Question, QuestionPurpose
from app.questions.stat_model import QuestionStat


def get_question_by_id(db: Session, question_id: int) -> Question | None:
    """Get a question by ID."""
    return db.query(Question).filter(Question.id == question_id).first()


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
) -> QuestionStat:
    """
    Cập nhật thống kê theo câu sau mỗi lượt trả lời (C2).

    Dùng get-or-create + update thay vì upsert để giữ logic đơn giản và
    tương thích với mọi backend (không phụ thuộc ON CONFLICT).

    Ngoài `attempts`/`wrong` (thống kê lũy kếa để hiển thị), hàm này duy trì
    `weakness` — điểm yếu hiện hành dùng để CHỌN câu. `weakness` tăng khi sai
    và suy giảm khi đúng, nên bằng chứng cũ tự mờ đi thay vì đè vĩnh viễn
    (xem `app/questions/stat_model.py`).
    """
    from app.questions.stat_model import WEAKNESS_DECAY, WEAKNESS_INCREMENT

    stat = (
        db.query(QuestionStat)
        .filter(
            QuestionStat.user_id == user_id,
            QuestionStat.question_id == question_id,
        )
        .first()
    )
    if stat is None:
        # `weakness=0.0` phải set TƯỜNG MINH: default của cột chỉ được SQLAlchemy
        # gán lúc INSERT, nên đọc `stat.weakness` ngay sau `db.add()` sẽ là None
        # → `None + (1 - None) * 0.45` → TypeError → 500. Lỗi này chỉ xảy ra ở
        # LẦN ĐẦU user làm một câu (tạo stat mới), nên rất dễ lọt.
        stat = QuestionStat(
            user_id=user_id,
            question_id=question_id,
            attempts=0,
            wrong=0,
            weakness=0.0,
        )
        db.add(stat)

    stat.attempts += 1
    if is_correct:
        # Đúng → bằng chứng cũ mờ đi, nhưng không xoá hẳn (vẫn là "chỗ dễ sai").
        stat.weakness = max(0.0, stat.weakness * WEAKNESS_DECAY)
    else:
        stat.wrong += 1
        stat.weakness = stat.weakness + (1.0 - stat.weakness) * WEAKNESS_INCREMENT

    return stat
