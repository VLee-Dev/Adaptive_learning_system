"""Service layer for practice learning flow."""
import calendar
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.attempts.model import Attempt
from app.attempts.repository import (
    create_attempt,
    get_recent_attempted_question_ids,
)
from app.mastery.service import (
    get_or_create_mastery,
    update_mastery_after_answer,
    mark_lesson_viewed,
    QUESTIONS_PER_SESSION,
)
from app.questions.repository import (
    get_all_practice_questions,
    get_question_by_id,
    get_question_wrong_rates,
    upsert_question_stat,
)
from app.topics.model import Topic
from app.learning.schemas import (
    AnswerSubmitResponse,
    QuestionResponse,
    TopicMasteryResponse,
    QuestionSelection,
)


# ===== C2: cấu hình chọn câu hỏi =====
# Topic chỉ có ~10 câu practice (level 1: 4, level 2: 3, level 3: 3) nên các
# ngưỡng này cố ý nhỏ — mục tiêu là "thử đúng chỗ sai trước, nhưng không
# bắt user làm câu quá khó so với trình độ".
WRONG_RATE_THRESHOLD = 0.4   # câu này user sai >= 40% số lần đã làm → "hay sai"
MAX_LEVEL_OFFSET = 1         # lệch level tối đa so với current_level


def _build_question_response(
    question,
    current_level: int,
    reason: str,
    is_retry: bool,
) -> QuestionResponse:
    return QuestionResponse(
        question_id=question.id,
        text=question.question_text,
        options=question.options,
        level=question.level or current_level,
        stimulus_id=question.stimulus_id,
        selection_reason=reason,
        is_retry=is_retry,
    )


def _pool_with_scores(
    questions: list,
    wrong_rates: dict[int, float],
    recent_ids: set[int],
) -> list[tuple]:
    """
    Chấm điểm câu hỏi theo thứ tự ưu tiên weak-first (C2).

    Điểm cao = nên chọn trước:
      + hay sai (wrong_rate cao) trong cửa sổ gần đây → ưu tiên mạnh
      + chưa làm gần đây → ưu tiên nhẹ (tránh lặp)
    """
    scored = []
    for q in questions:
        wr = wrong_rates.get(q.id, 0.0)
        recently_attempted = q.id in recent_ids
        score = 0.0
        if wr >= WRONG_RATE_THRESHOLD:
            score += 10.0 + wr * 5.0
        elif wr > 0:
            score += wr * 2.0
        if not recently_attempted:
            score += 3.0
        else:
            score -= 2.0  # phạt nhẹ câu vừa làm → tránh lặp ngay
        scored.append((q, score))
    # Ổn định: sắp theo score giảm dần, tie-break theo id để deterministic
    scored.sort(key=lambda item: (-item[1], item[0].id))
    return scored


def select_next_question(
    db: Session,
    user_id: int,
    topic_id: int,
    current_level: int,
    status: str,
) -> QuestionSelection:
    """
    Chọn câu hỏi tiếp theo theo chiến lược weak-first + khoá mềm level (C2).

    Thứ tự ưu tiên khi đang học bình thường:
      1. Câu CHƯA LÀM gần đây ở level hiện tại
      2. Câu HAY SAI ở level hiện tại (ôn lại đúng chỗ sai)
      3. Câu chưa làm ở level thấp hơn (dễ hơn — khi đang gặp khó)
      4. Câu chưa làm ở level cao hơn (khó hơn — khi đang ổn định)

    Khi status == 'review_required' → weak-only: chỉ câu hay sai + câu chưa
    làm ở level thấp hơn, bỏ qua việc tăng độ khó.

    Returns:
        QuestionSelection — kèm note giải thích khi không có câu phù hợp.
    """
    recent_ids = set(get_recent_attempted_question_ids(db, user_id, topic_id))
    all_questions = get_all_practice_questions(db, topic_id)
    wrong_rates = {
        qid: st.wrong_rate
        for qid, st in get_question_wrong_rates(
            db, user_id, [q.id for q in all_questions]
        ).items()
    }

    def pick(pool: list, reason: str) -> QuestionSelection | None:
        if not pool:
            return None
        scored = _pool_with_scores(pool, wrong_rates, recent_ids)
        # random.choice trên nhóm cùng điểm cao nhất để phá băng
        top_score = scored[0][1]
        tied = [q for q, s in scored if s == top_score]
        chosen = random.choice(tied)
        return QuestionSelection(
            question=_build_question_response(
                chosen, current_level, reason, chosen.id in recent_ids
            ),
            note=None,
        )

    is_review = status == "review_required"

    def by_level(level: int) -> list:
        return [q for q in all_questions if (q.level or 1) == level]

    def unseen(pool: list) -> list:
        return [q for q in pool if q.id not in recent_ids]

    def weak(pool: list) -> list:
        return [
            q for q in pool
            if wrong_rates.get(q.id, 0.0) >= WRONG_RATE_THRESHOLD
        ]

    if is_review:
        # Weak-only: ôn lại đúng chỗ sai, không tăng độ khó.
        for level in [current_level, current_level - 1]:
            if level < 1:
                continue
            result = pick(weak(by_level(level)), "Ôn lại chỗ bạn hay sai")
            if result:
                return result
        # Hết câu hay sai → câu chưa làm ở level không cao hơn hiện tại.
        for level in [current_level, current_level - 1]:
            if level < 1:
                continue
            result = pick(unseen(by_level(level)), "Củng cố bằng câu mới ở level dễ hơn")
            if result:
                return result
        return QuestionSelection(
            question=None,
            note=(
                "Bạn đã làm hết các câu trong chủ đề này. Hãy xem lại bài giảng "
                "rồi thử lại, hoặc chuyển sang chủ đề khác."
            ),
        )

    # --- Đang học bình thường ---
    # 1. Câu chưa làm ở level hiện tại
    result = pick(unseen(by_level(current_level)), "Câu mới ở level hiện tại")
    if result:
        return result

    # 2. Câu hay sai ở level hiện tại
    result = pick(weak(by_level(current_level)), "Ôn lại chỗ bạn hay sai")
    if result:
        return result

    # 3. Câu chưa làm ở level thấp hơn (gặp khó → dễ hơn)
    for level in range(current_level - 1, 0, -1):
        result = pick(unseen(by_level(level)), "Câu mới ở level dễ hơn")
        if result:
            return result

    # 4. Câu chưa làm ở level cao hơn (ổn định → khó hơn)
    for level in range(current_level + 1, current_level + MAX_LEVEL_OFFSET + 2):
        result = pick(unseen(by_level(level)), "Câu mới ở level khó hơn")
        if result:
            return result

    # 5. Câu chưa làm ở bất kỳ level nào (bank mỏng, vẫn còn câu mới)
    result = pick(unseen(all_questions), "Câu mới")
    if result:
        return result

    # 6. Hết câu chưa làm → quay lại câu hay sai đã làm (ôn lại cũ)
    result = pick(weak(all_questions), "Ôn lại câu cũ")
    if result:
        return result

    return QuestionSelection(
        question=None,
        note="Chưa có câu hỏi luyện tập cho chủ đề này.",
    )


def get_next_practice_question(db: Session, user_id: int, topic_id: int) -> QuestionResponse | None:
    """
    Get the next practice question for a student based on their current mastery level.

    Args:
        db: Database session
        user_id: Student user ID
        topic_id: Topic ID

    Returns:
        QuestionResponse or None if no questions available
    """
    mastery = get_or_create_mastery(db, user_id, topic_id)
    selection = select_next_question(
        db,
        user_id,
        topic_id,
        current_level=mastery.current_level,
        status=mastery.status,
    )
    return selection.question


def submit_practice_answer(
    db: Session,
    user_id: int,
    topic_id: int,
    question_id: int,
    selected_answer: str
) -> AnswerSubmitResponse:
    """
    Submit an answer to a practice question and update mastery.

    Args:
        db: Database session
        user_id: Student user ID
        topic_id: Topic ID
        question_id: Question ID
        selected_answer: Answer selected by student

    Returns:
        AnswerSubmitResponse with feedback and updated state
    """
    # Get the question
    question = get_question_by_id(db, question_id)
    if question is None:
        raise LookupError("Question not found")

    if question.topic_id != topic_id:
        raise ValueError("Question does not belong to this topic")

    # Check if answer is correct
    is_correct = selected_answer == question.correct_answer

    # B42: Tạo attempt + update mastery trong CÙNG 1 transaction.
    # Trước đây create_attempt() và update_mastery_after_answer() mỗi cái
    # commit riêng → nếu cái sau fail, attempt rỗng vẫn được lưu → data sai.
    attempt = Attempt(
        user_id=user_id,
        question_id=question_id,
        topic_id=topic_id,
        selected_answer=selected_answer,
        is_correct=is_correct,
    )
    db.add(attempt)
    db.flush()  # cần attempt.id để tạo LearningEvent

    # C2: cập nhật thống kê sai theo từng câu (dùng để chọn câu weak-first).
    upsert_question_stat(db, user_id, question_id, is_correct)

    # Nhớ trạng thái review trước khi cập nhật (để biết có cần ghi remedial event).
    from app.mastery.repository import get_mastery

    mastery_before = get_mastery(db, user_id, topic_id)
    was_review = mastery_before.status == "review_required" if mastery_before else False

    # Update mastery using BKT (cùng transaction)
    updated_mastery = update_mastery_after_answer(db, user_id, topic_id, is_correct)

    # B3: ghi nhận lần đầu chuyển vào review_required — đây là điểm khởi động
    # vòng lặp "học lại → củng cố". Trước đây LearningEventType.REMEDIAL_TRIGGERED
    # được định nghĩa nhưng KHÔNG nơi nào gọi, nên không ai học lại bài giảng.
    entered_review = (
        updated_mastery.status == "review_required" and not was_review
    )
    if entered_review:
        _record_remedial_triggered(db, user_id, topic_id, attempt.id)

    # Commit duy nhất cho cả attempt + mastery update + stats
    db.commit()
    db.refresh(updated_mastery)
    db.refresh(attempt)

    # Get next question if practice should continue
    next_question = None
    selection_note = None
    if updated_mastery.status != "completed":
        selection = select_next_question(
            db,
            user_id,
            topic_id,
            current_level=updated_mastery.current_level,
            status=updated_mastery.status,
        )
        next_question = selection.question
        selection_note = selection.note

    return AnswerSubmitResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        updated_mastery=updated_mastery.mastery,
        current_level=updated_mastery.current_level,
        status=updated_mastery.status,
        next_question=next_question,
        selection_note=selection_note,
        review_progress=_build_review_progress(db, user_id, topic_id, updated_mastery),
        suggested_lesson_id=_first_lesson_id(db, topic_id)
        if updated_mastery.status == "review_required"
        else None,
    )


def _record_remedial_triggered(db: Session, user_id: int, topic_id: int, attempt_id: int) -> None:
    """Ghi LearningEvent loại remedial để truy vết vòng lặp ôn lại (B3)."""
    from app.learning_events.model import LearningEvent, LearningEventType

    db.add(
        LearningEvent(
            user_id=user_id,
            attempt_id=attempt_id,
            topic_id=topic_id,
            event_type=LearningEventType.REMEDIAL_TRIGGERED,
        )
    )


def _first_lesson_id(db: Session, topic_id: int) -> int | None:
    """Lesson đầu tiên của topic (để FE gửi user đọc bài giảng khi bị yêu cầu ôn)."""
    from app.lessons.model import Lesson

    lesson = (
        db.query(Lesson.id)
        .filter(Lesson.topic_id == topic_id)
        .order_by(Lesson.order_index)
        .first()
    )
    return lesson[0] if lesson else None


def _build_review_progress(db: Session, user_id: int, topic_id: int, mastery) -> dict:
    """
    Tiến độ thoát trạng thái review (B3).

    FE hiển thị: "đã xem bài giảng ✓ · đúng 2/3 câu củng cố" để user biết
    còn thiếu gì để thoát.
    """
    from app.mastery.service import (
        CONSECUTIVE_CORRECT_TO_CLEAR,
        topic_has_lessons,
    )

    has_lessons = topic_has_lessons(db, topic_id)
    if has_lessons:
        lesson_ok = mastery.lesson_viewed_at is not None and (
            mastery.review_triggered_at is None
            or mastery.lesson_viewed_at >= mastery.review_triggered_at
        )
    else:
        lesson_ok = True

    return {
        "lesson_required": has_lessons,
        "lesson_completed": lesson_ok,
        "correct_required": CONSECUTIVE_CORRECT_TO_CLEAR,
        "correct_done": min(mastery.consecutive_correct, CONSECUTIVE_CORRECT_TO_CLEAR),
        "consecutive_wrong": mastery.consecutive_wrong,
        "recent_accuracy": round(mastery.recent_accuracy, 3),
    }


def mark_review_lesson_viewed(
    db: Session,
    user_id: int,
    topic_id: int,
) -> TopicMasteryResponse:
    """
    B3: user đã xem bài giảng của topic → cập nhật lesson_viewed_at.

    Đây là bước đầu tiên trong điều kiện thoát `review_required`.
    Bước còn lại: làm đúng CONSECUTIVE_CORRECT_TO_CLEAR câu liên tiếp.
    """
    from app.learning.schemas import TopicMasteryResponse

    mark_lesson_viewed(db, user_id, topic_id)
    db.commit()

    mastery = get_or_create_mastery(db, user_id, topic_id)
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if topic is None:
        raise LookupError("Topic not found")

    return TopicMasteryResponse(
        topic_id=topic.id,
        topic_name=topic.name,
        mastery=mastery.mastery,
        current_level=mastery.current_level,
        practice_attempts=mastery.practice_attempts,
        status=mastery.status,
        correct_count=mastery.correct_count,
        wrong_count=mastery.wrong_count,
        consecutive_correct=mastery.consecutive_correct,
        consecutive_wrong=mastery.consecutive_wrong,
        recent_accuracy=round(mastery.recent_accuracy, 3),
        review_progress=_build_review_progress(db, user_id, topic_id, mastery),
    )


def get_topic_mastery_status(db: Session, user_id: int, topic_id: int) -> TopicMasteryResponse:
    """
    Get current mastery status for a topic.

    Args:
        db: Database session
        user_id: Student user ID
        topic_id: Topic ID

    Returns:
        TopicMasteryResponse with current mastery information
    """
    mastery = get_or_create_mastery(db, user_id, topic_id)
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise LookupError("Topic not found")

    return TopicMasteryResponse(
        topic_id=topic.id,
        topic_name=topic.name,
        mastery=mastery.mastery,
        current_level=mastery.current_level,
        practice_attempts=mastery.practice_attempts,
        status=mastery.status,
        correct_count=mastery.correct_count,
        wrong_count=mastery.wrong_count,
        consecutive_correct=mastery.consecutive_correct,
        consecutive_wrong=mastery.consecutive_wrong,
        recent_accuracy=round(mastery.recent_accuracy, 3),
        review_progress=_build_review_progress(db, user_id, topic_id, mastery),
    )


def get_monthly_streak(
    db: Session,
    user_id: int,
    year: int,
    month: int,
    tz_offset_minutes: int = 0,
) -> "MonthlyStreakResponse":
    """Trả về mini-calendar streak cho tháng `year-month` theo giờ local của user.

    Tính tổng duration_seconds của study_sessions, group theo local date,
    trả về dict { 'YYYY-MM-DD': phút }. Quy ước "≥ 1 phút = có học" do FE xử lý.

    Args:
        user_id: ID student
        year, month: tháng cần xem (1-12)
        tz_offset_minutes: offset phút local-UTC. Việt Nam (UTC+7) = -420.

    Returns:
        MonthlyStreakResponse: days_in_month, first_weekday (0=Mon), minutes_per_day
    """
    from app.learning.schemas import MonthlyStreakResponse
    from app.study_sessions.service import get_minutes_per_day

    # Auto-close các session cũ trước khi tính
    from app.study_sessions.repository import auto_abandon_stale
    auto_abandon_stale(db, user_id)

    minutes_per_day = get_minutes_per_day(db, user_id, year, month, tz_offset_minutes)

    # Tính first_weekday theo local
    local_tz = timezone(timedelta(minutes=-tz_offset_minutes))
    start_local = datetime(year, month, 1, 0, 0, 0, tzinfo=local_tz)
    first_weekday = start_local.weekday()
    days_in_month = calendar.monthrange(year, month)[1]

    return MonthlyStreakResponse(
        year=year,
        month=month,
        days_in_month=days_in_month,
        first_weekday=first_weekday,
        minutes_per_day=minutes_per_day,
    )
