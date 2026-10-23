"""Service layer for practice learning flow."""
import calendar
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.attempts.model import Attempt
from app.attempts.repository import (
    get_attempted_question_ids,
    get_recent_attempted_question_ids,
)
from app.mastery.service import (
    MAX_QUESTIONS_PER_TOPIC,
    get_or_create_mastery,
    should_warn,
    update_mastery_after_answer,
    WARNING_MESSAGE,
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
WRONG_RATE_THRESHOLD = 0.4   # weakness >= 0.4 → coi là "hay sai" (xem stat_model)
MAX_LEVEL_OFFSET = 1         # lệch level tối đa so với current_level

# Phạt lặp trong cùng 1 phiên (C3). Mỗi câu chỉ nên xuất hiện 1 lần nếu còn
# câu khác chưa làm — trước đây người học phải làm cùng một câu 3-4 lần mới đủ
# số lượt, với bank 10 câu thì phiên luyện gần như là lặp.
REPEAT_PENALTY_IN_SESSION = 25.0    # phạt mạnh câu đã hiện trong phiên


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
    weakness: dict[int, float],
    recent_ids: set[int],
    in_session_ids: set[int] | None = None,
) -> list[tuple]:
    """
    Chấm điểm câu hỏi theo thứ tự ưu tiên weak-first (C2 + C3).

    Điểm cao = nên chọn trước:
      + hay sai (`weakness` cao, có suy giảm theo số lần làm đúng)
      + chưa làm gần đây → ưu tiên nhẹ (tránh lặp)
      - đã hiện trong phiên này → phạt mạnh để câu khác có cơ hội
    """
    in_session_ids = in_session_ids or set()
    scored = []
    for q in questions:
        w = weakness.get(q.id, 0.0)
        recently_attempted = q.id in recent_ids
        score = 0.0
        if w >= WRONG_RATE_THRESHOLD:
            score += 10.0 + w * 5.0
        elif w > 0:
            score += w * 2.0
        if not recently_attempted:
            score += 3.0
        else:
            score -= 2.0  # phạt nhẹ câu vừa làm → tránh lặp ngay
        if q.id in in_session_ids:
            score -= REPEAT_PENALTY_IN_SESSION
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
    in_session_ids: set[int] | None = None,
) -> QuestionSelection:
    """
    Chọn câu hỏi tiếp theo: weak-first + khoá mềm level (C2), có phạt lặp (C3).

    Điểm khác biệt so với bản trước:

    - Dùng `weakness` (có suy giảm khi làm đúng) thay vì `wrong_rate` lũy kếa.
      Trước đây một câu sai 3/5 lần giữ wrong_rate = 0.6 vĩnh viễn, nên vòng
      lặp ôn không bao giờ thoát được.
    - Phạt câu đã hiện trong phiên (`in_session_ids`) để câu chưa làm được
      ưu tiên: giảm tình trạng làm cùng một câu 3-4 lần.
    - Ưu tiên câu CHƯA TỪNG LÀM (lịch sử trọn đời) trước câu "chưa làm gần
      đây". Trước đây cửa sổ 12 lượt với bank 10 câu nghĩa là gần như mọi câu
      đều bị coi là đã làm, rơi thẳng xuống nhóm ôn câu cũ.

    Không còn nhánh riêng cho `review_required`: cảnh báo "hãy học kỹ hơn" là
    *thông báo*, không phải trạng thái — luồng chọn câu giống hệt nhau.

    Returns:
        QuestionSelection: kèm note giải thích khi không có câu phù hợp.
    """
    in_session_ids = in_session_ids or set()
    # Câu đã từng làm bao giờ (không phải chỉ 12 lượt gần nhất) để ưu tiên
    # câu mới thật sự.
    ever_ids = set(get_attempted_question_ids(db, user_id, topic_id))
    recent_ids = set(get_recent_attempted_question_ids(db, user_id, topic_id))
    all_questions = get_all_practice_questions(db, topic_id)
    if not all_questions:
        return QuestionSelection(
            question=None,
            note="Chủ đề này chưa có câu hỏi luyện tập nào.",
        )

    weakness = {
        qid: st.weakness
        for qid, st in get_question_wrong_rates(
            db, user_id, [q.id for q in all_questions]
        ).items()
    }

    def pick(pool: list, reason: str) -> QuestionSelection | None:
        if not pool:
            return None
        scored = _pool_with_scores(pool, weakness, recent_ids, in_session_ids)
        # random.choice trên nhóm cùng điểm cao nhất để phá băng
        top_score = scored[0][1]
        tied = [q for q, s in scored if s == top_score]
        chosen = random.choice(tied)
        return QuestionSelection(
            question=_build_question_response(
                chosen, current_level, reason, chosen.id in ever_ids
            ),
            note=None,
        )

    def by_level(level: int) -> list:
        return [q for q in all_questions if (q.level or 1) == level]

    def never_seen(pool: list) -> list:
        """Chưa TỪNG làm: ưu tiên cao nhất, tránh lặp tới mức người học chán."""
        return [q for q in pool if q.id not in ever_ids]

    def not_recent(pool: list) -> list:
        return [q for q in pool if q.id not in recent_ids]

    def weak(pool: list) -> list:
        return [
            q for q in pool
            if weakness.get(q.id, 0.0) >= WRONG_RATE_THRESHOLD
        ]

    # --- Đang học bình thường ---
    # 1. Câu chưa từng làm ở level hiện tại
    result = pick(never_seen(by_level(current_level)), "Câu mới ở level hiện tại")
    if result:
        return result

    # 2. Câu hay sai ở level hiện tại
    result = pick(weak(by_level(current_level)), "Ôn lại chỗ bạn hay sai")
    if result:
        return result

    # 3. Câu chưa từng làm ở level dễ hơn (gặp khó thì dễ hơn)
    for level in range(current_level - 1, 0, -1):
        result = pick(never_seen(by_level(level)), "Câu mới ở level dễ hơn")
        if result:
            return result

    # 4. Câu chưa từng làm ở level khó hơn (ổn định thì khó hơn)
    for offset in range(1, MAX_LEVEL_OFFSET + 1):
        result = pick(
            never_seen(by_level(current_level + offset)),
            "Câu mới ở level khó hơn",
        )
        if result:
            return result

    # 5. Câu chưa làm GẦN ĐÂY ở bất kỳ level nào (đã từng làm nhưng lâu rồi)
    result = pick(not_recent(all_questions), "Câu đã làm lâu rồi, thử lại")
    if result:
        return result

    # 6. Câu chưa từng làm ở bất kỳ level nào (bank mỏng)
    result = pick(never_seen(all_questions), "Câu mới")
    if result:
        return result

    # 7. Hết câu mới: quay lại câu hay sai để ôn (chấp nhận lặp)
    result = pick(weak(all_questions), "Ôn lại câu cũ")
    if result:
        return result

    # 8. Không còn câu nào đủ "hay sai": ôn lại câu ít sai nhất.
    result = pick(all_questions, "Ôn lại câu đã làm")
    if result:
        return result

    return QuestionSelection(
        question=None,
        note="Chưa có câu hỏi luyện tập cho chủ đề này.",
    )



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
    db.flush()

    # C2: cập nhật thống kê sai theo từng câu (dùng để chọn câu weak-first).
    upsert_question_stat(db, user_id, question_id, is_correct)

    # Đã pass trước đó chưa? Nếu rồi → lượt luyện lại: KHÔNG tính BKT,
    # KHÔNG cộng `practice_attempts`. Chỉ ghi thống kê câu đúng/sai.
    #
    # Query trực tiếp, KHÔNG dùng `get_or_create_mastery`: hàm đó `db.commit()`
    # khi tạo mới → sẽ commit nửa chừng, phá vỡ tính nguyên tử của transaction
    # (attempt + stats + mastery phải vào chung 1 lần commit).
    from app.mastery.repository import get_mastery

    mastery_before = get_mastery(db, user_id, topic_id)
    already_passed = mastery_before is not None and mastery_before.status == "completed"

    # Update mastery using BKT (cùng transaction)
    updated_mastery = update_mastery_after_answer(
        db,
        user_id,
        topic_id,
        is_correct,
        count_towards_progress=not already_passed,
    )

    # Commit duy nhất cho cả attempt + mastery update + stats
    db.commit()
    db.refresh(updated_mastery)
    db.refresh(attempt)

    attempts_used = updated_mastery.practice_attempts
    passed = updated_mastery.status == "completed"

    # --- Lượt luyện lại sau khi đã pass ---
    if already_passed:
        summary = _build_extra_practice_summary(db, user_id, topic_id)
        return AnswerSubmitResponse(
            is_correct=is_correct,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            updated_mastery=updated_mastery.mastery,
            current_level=updated_mastery.current_level,
            status=updated_mastery.status,
            next_question=None,
            selection_note="Bạn đã hoàn thành chủ đề này. Lượt này chỉ để ôn thêm.",
            attempts_used=attempts_used,
            attempts_limit=MAX_QUESTIONS_PER_TOPIC,
            passed=True,
            is_extra_practice=True,
            summary=summary,
        )

    # --- Lượt thi bình thường ---
    # Chọn câu tiếp theo (nếu chưa đủ 20 câu).
    next_question = None
    selection_note = None
    if passed:
        selection_note = "Bạn đã hoàn thành chủ đề này."
    elif attempts_used >= MAX_QUESTIONS_PER_TOPIC:
        selection_note = (
            f"Bạn đã làm đủ {MAX_QUESTIONS_PER_TOPIC} câu. "
            "Hãy xem lại kết quả rồi quay lại nếu muốn ôn thêm."
        )
    else:
        selection = select_next_question(
            db,
            user_id,
            topic_id,
            current_level=updated_mastery.current_level,
            status=updated_mastery.status,
        )
        next_question = selection.question
        selection_note = selection.note

    # --- Thông báo "hãy học kỹ hơn" (KHÔNG phải trạng thái) ---
    warning = None
    lesson_url = None
    suggested_lesson_id = None
    if should_warn(updated_mastery):
        warning = WARNING_MESSAGE
        suggested_lesson_id = _first_lesson_id(db, topic_id)
        if suggested_lesson_id is not None:
            lesson_url = f"/student/lessons/{suggested_lesson_id}"

    return AnswerSubmitResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        updated_mastery=updated_mastery.mastery,
        current_level=updated_mastery.current_level,
        status=updated_mastery.status,
        next_question=next_question,
        selection_note=selection_note,
        warning=warning,
        lesson_url=lesson_url,
        suggested_lesson_id=suggested_lesson_id,
        attempts_used=attempts_used,
        attempts_limit=MAX_QUESTIONS_PER_TOPIC,
        passed=passed,
        is_extra_practice=False,
        summary=_build_attempt_summary(db, user_id, topic_id, attempts_used),
    )


def _build_attempt_summary(
    db: Session, user_id: int, topic_id: int, attempts_used: int
) -> "PracticeSummary":
    """Tổng kết lượt thi hiện tại (số câu đúng/sai trong `attempts_used` lượt)."""
    from app.learning.schemas import PracticeSummary

    rows = (
        db.query(Attempt.is_correct)
        .filter(
            Attempt.user_id == user_id,
            Attempt.topic_id == topic_id,
        )
        .order_by(Attempt.created_at.desc(), Attempt.id.desc())
        .limit(attempts_used)
        .all()
    )
    results = [bool(r.is_correct) for r in rows]
    correct = sum(1 for r in results if r)
    total = len(results)
    return PracticeSummary(
        total=total,
        correct=correct,
        wrong=total - correct,
        accuracy=round(correct / total, 3) if total else 0.0,
    )


def _build_extra_practice_summary(
    db: Session, user_id: int, topic_id: int
) -> "PracticeSummary":
    """Tổng kết lượt luyện lại: câu nào đúng, câu nào sai."""
    from app.learning.schemas import PracticeAnswerResult, PracticeSummary

    rows = (
        db.query(Attempt.question_id, Attempt.is_correct)
        .filter(
            Attempt.user_id == user_id,
            Attempt.topic_id == topic_id,
        )
        .order_by(Attempt.created_at.desc(), Attempt.id.desc())
        .limit(50)
        .all()
    )
    results = [
        PracticeAnswerResult(question_id=qid, is_correct=bool(ok))
        for qid, ok in rows
    ]
    correct = sum(1 for r in results if r.is_correct)
    total = len(results)
    return PracticeSummary(
        total=total,
        correct=correct,
        wrong=total - correct,
        accuracy=round(correct / total, 3) if total else 0.0,
        results=results,
    )


def _first_lesson_id(db: Session, topic_id: int) -> int | None:
    """Lesson đầu tiên của topic (để FE gửi user đọc bài giảng khi được nhắc học lại)."""
    from app.lessons.model import Lesson

    lesson = (
        db.query(Lesson.id)
        .filter(Lesson.topic_id == topic_id)
        .order_by(Lesson.order_index)
        .first()
    )
    return lesson[0] if lesson else None


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
        passed=mastery.status == "completed",
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
