"""BKT mastery update service.

THAY ĐỔI SO VỚI PHIÊN BẢN CŨ (2026-10-23) — sửa 3 lỗi đã xác minh:

1. `p_transit` trước đây được cộng VÔ ĐIỀU KIỆN kể cả khi trả lời sai
   (`mastery/service.py:63` cũ). Hệ quả: 5 câu sai liên tiếp vẫn để lại
   mastery ~0.23, và user sai 15/19 câu vẫn có mastery 0.8972 → 'completed'.
   → Nay CHỈ cộng transit khi trả lời ĐÚNG.

2. Trước đây `status` chỉ phụ thuộc mastery, nên 2 câu đúng (0.3 → 0.9095)
   là đủ để đánh dấu 'completed'. → Nay phải có ĐỦ BẰNG CHỨNG:
   số câu tối thiểu + độ chính xác gần đây.

3. `review_required` không bao giờ kích hoạt vì mastery sàn ~0.23 < ngưỡng
   0.30 và không có điều kiện chuỗi sai. → Nay dùng CHUỖI SAI LIÊN TIẾP
   làm điều kiện chính, và có vòng lặp thoát trạng thái review.

BKT vẫn được giữ để ước lượng xác suất nắm vững kiến thức — nhưng nó là
*ước lượng*, không phải *trạng thái*. Trạng thái bây giờ cần cả ước lượng
lẫn bằng chứng quan sát được.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.mastery.model import TopicMastery
from app.topics.model import Topic

# ===== HARDCODED BKT THRESHOLDS (không cho admin chỉnh sửa) =====
# Chốt ngày 2026-10-13 (B1+B8 cleanup). Rà lại 2026-10-23 sau audit BKT.
QUESTIONS_PER_SESSION = 8

LEVEL_UP_MASTERY = 0.85        # Cao = khó lên level → học kỹ mới lên
COMPLETION_MASTERY = 0.85      # Cao = khó hoàn thành topic → chắc tay
REVIEW_MASTERY = 0.35          # Thấp = dễ trigger review khi mastery giảm
STARTING_LEVEL = 1             # Luôn bắt đầu từ level 1

# ===== ĐIỀU KIỆN BẰNG CHỨNG (A2 - 2026-10-23) =====
# Mastery cao KHÔNG đủ để coi là thành thạo. Cần thêm:
MIN_ATTEMPTS_FOR_COMPLETION = 8      # tối thiểu 8 câu mới coi là có bằng chứng
MIN_RECENT_ACCURACY = 0.6            # >= 60% trong cửa sổ gần nhất
RECENT_WINDOW = 5                    # cửa sổ "gần đây" = 5 lượt cuối

# ===== VÒNG LẶP ÔN LẠI (B3 - 2026-10-23) =====
CONSECUTIVE_WRONG_FOR_REVIEW = 3     # sai 3 câu liên tiếp → cần ôn lại
CONSECUTIVE_CORRECT_TO_CLEAR = 3     # đúng 3 câu liên tiếp → thoát review
MIN_ATTEMPTS_FOR_REVIEW = 4          # phải làm đủ 4 câu mới xét "cần ôn lại"


def calculate_bkt_update(
    p_mastery: float,
    is_correct: bool,
    p_transit: float,
    p_slip: float,
    p_guess: float
) -> float:
    """
    Update mastery probability using Bayesian Knowledge Tracing.

    Args:
        p_mastery: Current mastery probability (P(L))
        is_correct: Whether the answer was correct
        p_transit: Probability of learning (p_transit)
        p_slip: Probability of slip (knowing but answering wrong)
        p_guess: Probability of guessing correctly

    Returns:
        Updated mastery probability

    Ghi chú (2026-10-23): `p_transit` CHỈ được cộng khi trả lời ĐÚNG.
    Transit là xác suất người học *thực sự học được* kiến thức trong lượt
    luyện — nếu trả lời sai thì chưa có gì để "học", cộng transit chỉ làm
    che giấu việc người học đang làm sai.
    """
    if is_correct:
        # P(L | correct) = P(correct | L) * P(L) / P(correct)
        # P(correct | L) = 1 - p_slip
        # P(correct | not L) = p_guess
        # P(correct) = P(correct | L) * P(L) + P(correct | not L) * P(not L)
        p_correct_given_learned = 1 - p_slip
        p_correct_given_not_learned = p_guess
        p_correct = p_correct_given_learned * p_mastery + p_correct_given_not_learned * (1 - p_mastery)

        if p_correct > 0:
            p_mastery_after_answer = (p_correct_given_learned * p_mastery) / p_correct
        else:
            p_mastery_after_answer = p_mastery
    else:
        # P(L | incorrect) = P(incorrect | L) * P(L) / P(incorrect)
        # P(incorrect | L) = p_slip
        # P(incorrect | not L) = 1 - p_guess
        p_incorrect_given_learned = p_slip
        p_incorrect_given_not_learned = 1 - p_guess
        p_incorrect = p_incorrect_given_learned * p_mastery + p_incorrect_given_not_learned * (1 - p_mastery)

        if p_incorrect > 0:
            p_mastery_after_answer = (p_incorrect_given_learned * p_mastery) / p_incorrect
        else:
            p_mastery_after_answer = p_mastery

    # Apply learning opportunity — CHỈ khi trả lời đúng.
    # P(L_new) = P(L_old) + (1 - P(L_old)) * p_transit
    if is_correct:
        p_mastery_new = p_mastery_after_answer + (1 - p_mastery_after_answer) * p_transit
    else:
        p_mastery_new = p_mastery_after_answer

    # Clamp between 0 and 1
    return max(0.0, min(1.0, p_mastery_new))


def compute_recent_accuracy(results: list[bool], window: int = RECENT_WINDOW) -> float:
    """Accuracy trong `window` lượt cuối. results là list bool, cũ → mới."""
    if not results:
        return 0.0
    recent = results[-window:]
    return sum(1 for r in recent if r) / len(recent)


def apply_evidence(
    mastery: TopicMastery,
    is_correct: bool,
    was_review_required: bool,
    lesson_ok: bool,
) -> None:
    """
    Cập nhật counters + luật level/status dựa trên bằng chứng quan sát được.

    Args:
        mastery: record đã có mastery mới (sau calculate_bkt_update)
        is_correct: kết quả lượt này
        was_review_required: trạng thái review_required TRƯỚC lượt này
        lesson_ok: đã xem bài giảng (hoặc topic không có bài giảng) chưa
    """
    # --- Cập nhật counters ---
    mastery.practice_attempts += 1
    if is_correct:
        mastery.correct_count += 1
        mastery.consecutive_correct += 1
        mastery.consecutive_wrong = 0
    else:
        mastery.wrong_count += 1
        mastery.consecutive_wrong += 1
        mastery.consecutive_correct = 0

    mastery.recent_accuracy = compute_recent_accuracy(
        _recent_results_from_mastery(mastery, is_correct)
    )

    # --- Luật level ---
    if mastery.mastery >= LEVEL_UP_MASTERY and mastery.current_level < 3:
        mastery.current_level = min(3, mastery.current_level + 1)
    elif mastery.mastery < REVIEW_MASTERY and mastery.current_level > 1:
        mastery.current_level = max(1, mastery.current_level - 1)

    # --- Luật status ---
    previous_status = mastery.status
    new_status = _decide_status(mastery, is_correct, was_review_required, lesson_ok)

    # Ghi mốc lần đầu vào review (dùng để đòi xem bài giảng SAU khi bị yêu cầu).
    if new_status == "review_required" and previous_status != "review_required":
        mastery.review_triggered_at = datetime.now(timezone.utc)

    mastery.status = new_status


def _recent_results_from_mastery(mastery: TopicMastery, is_correct: bool) -> list[bool]:
    """
    Xấp xỉ chuỗi kết quả gần đây từ counters đã lưu.

    Đây là xấp xỉ (không truy vấn `attempts`) vì counters consecutive chỉ cho
    biết đoạn đuôi. Độ chính xác đủ cho mục đích hiển thị `recent_accuracy`.
    Nếu cần chính xác tuyệt đối, dùng `compute_recent_accuracy_from_db`.

    Quy ước thứ tự: cũ → mới.
    """
    results: list[bool] = []
    if is_correct:
        tail_len = min(mastery.consecutive_correct, RECENT_WINDOW)
        head_other = min(mastery.wrong_count, RECENT_WINDOW - tail_len)
    else:
        tail_len = min(mastery.consecutive_wrong, RECENT_WINDOW)
        head_other = min(mastery.correct_count, RECENT_WINDOW - tail_len)
    # Phần trước: ngược lại với kết quả hiện tại (chuỗi đã bị "đứt")
    if is_correct:
        results.extend([False] * head_other)
    else:
        results.extend([True] * head_other)
    # Phần đuôi: chuỗi hiện tại
    if is_correct:
        results.extend([True] * tail_len)
    else:
        results.extend([False] * tail_len)
    return results[-RECENT_WINDOW:]


def _decide_status(
    mastery: TopicMastery,
    is_correct: bool,
    was_review_required: bool,
    lesson_ok: bool,
) -> str:
    """
    Quyết định status mới.

    Thứ tự ưu tiên:
    1. Đang trong review → chỉ thoát khi đủ CẢ 2 điều kiện:
       lesson_ok AND consecutive_correct >= CONSECUTIVE_CORRECT_TO_CLEAR
    2. Mới vào review: chuỗi sai >= CONSECUTIVE_WRONG_FOR_REVIEW
       HOẶC mastery < REVIEW_MASTERY
    3. Hoàn thành: mastery >= COMPLETION_MASTERY
       AND practice_attempts >= MIN_ATTEMPTS_FOR_COMPLETION
       AND recent_accuracy >= MIN_RECENT_ACCURACY
    4. in_progress
    """
    # 1. Đang review → cần điều kiện thoát
    if was_review_required:
        cleared = (
            mastery.consecutive_correct >= CONSECUTIVE_CORRECT_TO_CLEAR
            and lesson_ok
        )
        if cleared:
            mastery.review_resolved_at = datetime.now(timezone.utc)
            # Thoát review → áp lại luật hoàn thành (nếu đủ evidence)
            if _has_completion_evidence(mastery):
                return "completed"
            return "in_progress"
        return "review_required"

    # 2. Mới vào review
    # Cần đủ số lượt tối thiểu trước — nếu không, người mới sai câu đầu tiên
    # (mastery 0.3 → 0.054) sẽ lập tức bị đánh dấu "cần ôn lại", quá phạt.
    if (
        mastery.practice_attempts >= MIN_ATTEMPTS_FOR_REVIEW
        and (
            mastery.consecutive_wrong >= CONSECUTIVE_WRONG_FOR_REVIEW
            or mastery.mastery < REVIEW_MASTERY
        )
    ):
        return "review_required"

    # 3. Hoàn thành (cần đủ bằng chứng)
    if _has_completion_evidence(mastery):
        return "completed"

    # 4. Đang học
    return "in_progress"


def _has_completion_evidence(mastery: TopicMastery) -> bool:
    """Đủ bằng chứng để coi là thành thạo chưa?"""
    return (
        mastery.mastery >= COMPLETION_MASTERY
        and mastery.practice_attempts >= MIN_ATTEMPTS_FOR_COMPLETION
        and mastery.recent_accuracy >= MIN_RECENT_ACCURACY
    )


def _lesson_viewed_after_trigger(mastery: TopicMastery) -> bool:
    """
    User đã xem bài giảng SAU khi bị yêu cầu ôn lại chưa?

    - Chưa từng vào review → không cần xem (True, để không chặn người mới).
    - Đã xem bài giảng nhưng chưa từng vào review → False (cần xem lại
      SAU lần sai, vì lần xem trước không liên quan tới chỗ sai).
    - Đã vào review → so lesson_viewed_at >= review_triggered_at.
    """
    if mastery.review_triggered_at is None:
        return True
    if mastery.lesson_viewed_at is None:
        return False
    # So sánh an toàn cho timezone-naive DB.
    viewed = mastery.lesson_viewed_at
    triggered = mastery.review_triggered_at
    if viewed.tzinfo is None:
        viewed = viewed.replace(tzinfo=timezone.utc)
    if triggered.tzinfo is None:
        triggered = triggered.replace(tzinfo=timezone.utc)
    return viewed >= triggered


def topic_has_lessons(db: Session, topic_id: int) -> bool:
    """Topic này có bài giảng không? (quyết định bước "xem bài giảng" có bắt buộc không)"""
    from app.lessons.model import Lesson

    count = (
        db.query(Lesson.id)
        .filter(Lesson.topic_id == topic_id)
        .limit(1)
        .count()
    )
    return count > 0


def update_mastery_after_answer(
    db: Session,
    user_id: int,
    topic_id: int,
    is_correct: bool,
) -> TopicMastery:
    """
    Update student's topic mastery after answering a question.

    Args:
        db: Database session
        user_id: Student user ID
        topic_id: Topic ID
        is_correct: Whether the answer was correct

    Returns:
        Updated TopicMastery record
    """
    # Get or create mastery record
    mastery = db.query(TopicMastery).filter(
        TopicMastery.user_id == user_id,
        TopicMastery.topic_id == topic_id
    ).first()

    if mastery is None:
        # Create new mastery record with topic's initial BKT params
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if topic is None:
            raise LookupError(f"Topic {topic_id} not found")

        mastery = TopicMastery(
            user_id=user_id,
            topic_id=topic_id,
            mastery=topic.p_init,
            current_level=STARTING_LEVEL,
            practice_attempts=0,
            status="in_progress"
        )
        db.add(mastery)
        db.flush()

    # Get topic BKT parameters
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if topic is None:
        raise LookupError(f"Topic {topic_id} not found")

    # Nhớ trạng thái review TRƯỚC khi cập nhật (để áp luật thoát đúng)
    was_review_required = mastery.status == "review_required"

    # Calculate new mastery using BKT
    new_mastery = calculate_bkt_update(
        p_mastery=mastery.mastery,
        is_correct=is_correct,
        p_transit=topic.p_transit,
        p_slip=topic.p_slip,
        p_guess=topic.p_guess
    )
    mastery.mastery = new_mastery

    # Bước "xem bài giảng" (B3):
    # - Topic KHÔNG có bài giảng → coi như đã đạt (12/16 topic hiện chưa có
    #   lesson; không thể đòi user xem cái không tồn tại).
    # - Topic CÓ bài giảng → phải xem SAU khi bị yêu cầu ôn lại, tức
    #   lesson_viewed_at >= review_triggered_at. Nếu user đã xem bài giảng từ
    #   trước khi sai thì không được tính là đã ôn lại.
    if not topic_has_lessons(db, topic_id):
        lesson_ok = True
    else:
        lesson_ok = _lesson_viewed_after_trigger(mastery)

    # Cập nhật counters + level + status theo bằng chứng
    apply_evidence(
        mastery,
        is_correct=is_correct,
        was_review_required=was_review_required,
        lesson_ok=lesson_ok,
    )

    # B42: KHÔNG commit ở đây. Caller (learning.service.submit_practice_answer)
    # sẽ commit cùng với attempt trong 1 transaction duy nhất.
    db.flush()
    db.refresh(mastery)

    return mastery


def get_or_create_mastery(
    db: Session,
    user_id: int,
    topic_id: int
) -> TopicMastery:
    """
    Get existing mastery record or create a new one with initial values.

    Args:
        db: Database session
        user_id: Student user ID
        topic_id: Topic ID

    Returns:
        TopicMastery record
    """
    mastery = db.query(TopicMastery).filter(
        TopicMastery.user_id == user_id,
        TopicMastery.topic_id == topic_id
    ).first()

    if mastery is None:
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if topic is None:
            raise LookupError(f"Topic {topic_id} not found")

        mastery = TopicMastery(
            user_id=user_id,
            topic_id=topic_id,
            mastery=topic.p_init,
            current_level=STARTING_LEVEL,
            practice_attempts=0,
            status="in_progress"
        )
        db.add(mastery)
        db.commit()
        db.refresh(mastery)

    return mastery


def mark_lesson_viewed(db: Session, user_id: int, topic_id: int) -> TopicMastery:
    """
    Đánh dấu user đã mở bài giảng của topic (bước đầu của vòng lặp ôn lại).
    """
    mastery = get_or_create_mastery(db, user_id, topic_id)
    mastery.lesson_viewed_at = datetime.now(timezone.utc)
    db.flush()
    db.refresh(mastery)
    return mastery
