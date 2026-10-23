"""BKT mastery service — luật luyện tập tối giản (2026-10-23).

## Triết lý

BKT (Bayesian Knowledge Tracing) là *ước lượng xác suất nắm vững kiến thức*,
không phải trạng thái. Vì vậy ở đây BKT chỉ quyết định **level** và **một nửa
điều kiện pass**; các quyết định còn lại dựa trên bằng chứng quan sát được
(số câu, chuỗi đúng/sai).

## Ba thay đổi lớn so với phiên bản trước

1. **Rate-limit bước nhảy** (`MASTERY_CAP_UP` / `MASTERY_CAP_DOWN`).
   BKT thuần phản ứng quá nhanh: mô phỏng với mọi bộ tham số hợp lý đều cho
   5 câu đúng liên tiếp → ~0.999. Hạ `p_transit` xuống 0.04 cũng không chậm
   đi, vì bước Bayes đã đẩy mastery lên ~0.99 trước khi `p_transit` kịp
   tác động. → Can thiệp **sau** Bayes: giới hạn độ chênh mỗi lượt.

2. **Level là hàm thuần của mastery**, không phải biến tích lũy.
   Trước đây level tăng/giảm theo kiểu bước nhảy (+1/-1 mỗi lượt vượt ngưỡng)
   nên một lượt đúng có thể đưa mastery lên 0.97 → level nhảy thẳng 1→3 rồi
   đứng yên, và khi mastery chỉ tụt nhẹ (0.97 → 0.90) thì vẫn giữ level 3.

3. **`review_required` không còn là trạng thái.** Yêu cầu mới coi "hãy học kỹ
   hơn" là *một thông báo* kèm link về bài giảng, không phải chặn lộ trình.
   Vì vậy `status` chỉ còn `in_progress` | `completed`.

## Các luật nghiệp vụ

| Luật | Điều kiện |
|---|---|
| Level | ≥0.70 → 3 · <0.35 → 1 · còn lại → 2 (vào luôn là 2) |
| Cảnh báo | 5 sai liên tiếp **HOẶC** (BKT <0.30 **VÀ** 3 sai liên tiếp) |
| Pass | (5 đúng liên tiếp **VÀ** BKT ≥0.85) **HOẶC** (≥20 câu **VÀ** ≥10 đúng) |
"""
from sqlalchemy.orm import Session

from app.mastery.model import TopicMastery
from app.topics.model import Topic

# ===== LUẬT LEVEL (2026-10-23) =====
# Vào luôn level 2. Level là hàm thuần của mastery nên luôn khớp với BKT hiện tại.
STARTING_LEVEL = 2
LEVEL_UP_MASTERY = 0.70        # ≥ 0.70 → level 3
LEVEL_DOWN_MASTERY = 0.35      # < 0.35 → level 1
MAX_LEVEL = 3
MIN_LEVEL = 1

# ===== RATE LIMIT BKT =====
# BKT thuần phản ứng quá nhanh (xem docstring đầu file). Giới hạn bước nhảy mỗi
# lượt để mastery lên chậm VÀ giảm chậm.
#
# Tham số đã kiểm chứng bằng mô phỏng (14 kịch bản):
#   5 sai  từ 0.30 → 0.0003   (dưới ngưỡng cảnh báo 0.30 ✓)
#   5 sai  từ 0.50 → 0.0146   ✓
#   5 sai  từ 0.70 → 0.2000   ✓
#   5 sai  từ 0.90 → 0.4000   (chưa dưới 0.30 — xem Task 3, luật đã đổi sang OR)
#   5 đúng từ 0.30 → 0.9760   (≥ ngưỡng pass 0.85 ✓)
MASTERY_CAP_UP = 0.15          # tối đa +0.15 mỗi câu đúng
MASTERY_CAP_DOWN = 0.10        # tối đa -0.10 mỗi câu sai

# ===== LUẬT CẢNH BÁO (thông báo, KHÔNG phải trạng thái) =====
WARN_MASTERY = 0.30                    # ngưỡng BKT "đã nắm chưa chắc"
CONSECUTIVE_WRONG_FOR_WARN = 5         # sai 5 câu liên tiếp → nhắc học lại
CONSECUTIVE_WRONG_LOW_MASTERY = 3      # sai 3 câu liên tiếp + BKT<0.30 → nhắc sớm
WARNING_MESSAGE = "Bạn hãy học kỹ hơn chủ đề này"

# ===== LUẬT PASS =====
PASS_MASTERY = 0.85
CONSECUTIVE_CORRECT_TO_PASS = 5        # 5 câu đúng liên tiếp
MAX_QUESTIONS_PER_TOPIC = 20          # giới hạn số câu của một lượt thi
MIN_CORRECT_TO_PASS = 10               # trong 20 câu, đúng ≥10 → pass

# ===== STATUS =====
STATUS_IN_PROGRESS = "in_progress"
STATUS_COMPLETED = "completed"


def calculate_bkt_update(
    p_mastery: float,
    is_correct: bool,
    p_transit: float,
    p_slip: float,
    p_guess: float
) -> float:
    """
    Update mastery probability using Bayesian Knowledge Tracing + rate-limit.

    Args:
        p_mastery: Current mastery probability (P(L))
        is_correct: Whether the answer was correct
        p_transit: Probability of learning (p_transit)
        p_slip: Probability of slip (knowing but answering wrong)
        p_guess: Probability of guessing correctly

    Returns:
        Updated mastery probability, trong [0, 1]

    Ghi chú: `p_transit` CHỈ được cộng khi trả lời ĐÚNG. Transit là xác suất
    người học *thực sự học được* kiến thức trong lượt luyện — nếu trả lời sai
    thì chưa có gì để "học", cộng transit chỉ là che giấu việc đang làm sai.
    """
    if is_correct:
        # P(L | correct) = P(correct | L) * P(L) / P(correct)
        p_correct_given_learned = 1 - p_slip
        p_correct_given_not_learned = p_guess
        p_correct = (
            p_correct_given_learned * p_mastery
            + p_correct_given_not_learned * (1 - p_mastery)
        )
        if p_correct > 0:
            p_mastery_after_answer = (p_correct_given_learned * p_mastery) / p_correct
        else:
            p_mastery_after_answer = p_mastery
    else:
        # P(L | incorrect) = P(incorrect | L) * P(L) / P(incorrect)
        p_incorrect_given_learned = p_slip
        p_incorrect_given_not_learned = 1 - p_guess
        p_incorrect = (
            p_incorrect_given_learned * p_mastery
            + p_incorrect_given_not_learned * (1 - p_mastery)
        )
        if p_incorrect > 0:
            p_mastery_after_answer = (p_incorrect_given_learned * p_mastery) / p_incorrect
        else:
            p_mastery_after_answer = p_mastery

    # Apply learning opportunity — CHỈ khi trả lời đúng.
    if is_correct:
        p_mastery_new = p_mastery_after_answer + (1 - p_mastery_after_answer) * p_transit
    else:
        p_mastery_new = p_mastery_after_answer

    # Rate-limit bước nhảy (xem MASTERY_CAP_UP / MASTERY_CAP_DOWN).
    raw = max(0.0, min(1.0, p_mastery_new))
    if raw > p_mastery:
        return min(raw, p_mastery + MASTERY_CAP_UP)
    return max(raw, p_mastery - MASTERY_CAP_DOWN)


def decide_level(mastery_value: float) -> int:
    """
    Level là hàm thuần của mastery.

    ≥0.70 → 3 · <0.35 → 1 · còn lại → 2.

    Trước đây level tăng/giảm theo kiểu bước nhảy (+1/-1 mỗi lượt vượt ngưỡng),
    nên một lượt đúng có thể đưa mastery lên 0.97 → level nhảy thẳng 1→3 rồi
    đứng yên, và khi mastery chỉ tụt nhẹ (0.97 → 0.90) thì vẫn giữ level 3.
    Dạng hàm thuần này khiến level luôn khớp với mastery hiện tại.
    """
    if mastery_value >= LEVEL_UP_MASTERY:
        return MAX_LEVEL
    if mastery_value < LEVEL_DOWN_MASTERY:
        return MIN_LEVEL
    return STARTING_LEVEL


def should_warn(mastery: TopicMastery) -> bool:
    """
    Có nên nhắc "hãy học kỹ hơn" không?

    Điều kiện OR:
    - sai 5 câu liên tiếp → nhắc (không cần xét mastery)
    - HOẶC sai 3 câu liên tiếp khi BKT < 0.30 → nhắc sớm hơn

    Đây là *thông báo*, không phải trạng thái — người học vẫn làm tiếp được.
    """
    if mastery.consecutive_wrong >= CONSECUTIVE_WRONG_FOR_WARN:
        return True
    return (
        mastery.mastery < WARN_MASTERY
        and mastery.consecutive_wrong >= CONSECUTIVE_WRONG_LOW_MASTERY
    )


def has_passed(mastery: TopicMastery) -> bool:
    """
    Pass khi thỏa MỘT trong hai đường:

    1. Chuỗi: 5 câu đúng liên tiếp VÀ BKT ≥ 0.85.
       Điều kiện BKT là độc lập — không phải "5 câu phải đẩy BKT lên 0.85".
       Với rate-limit, 5 câu đúng từ p_init=0.30 cho BKT 0.976 (đã kiểm chứng),
       nên hai vế thường xảy ra cùng lúc; vế BKT chặn trường hợp chuỗi đúng
       kéo dài nhưng BKT vẫn thấp (ví dụ đang hồi từ 5 câu sai).

    2. Số lượng: làm đủ 20 câu VÀ đúng ≥ 10.
       Đường này cho người học tiến bộ đều đặn mà không cần chuỗi đúng hoàn hảo.
       `correct_count` là số câu đúng đã ghi nhận (bằng `practice_attempts -
       wrong_count`).
    """
    streak_ok = (
        mastery.consecutive_correct >= CONSECUTIVE_CORRECT_TO_PASS
        and mastery.mastery >= PASS_MASTERY
    )
    volume_ok = (
        mastery.practice_attempts >= MAX_QUESTIONS_PER_TOPIC
        and mastery.correct_count >= MIN_CORRECT_TO_PASS
    )
    return streak_ok or volume_ok


def apply_evidence(mastery: TopicMastery, is_correct: bool) -> None:
    """
    Cập nhật counters + luật level/status dựa trên bằng chứng quan sát được.

    Args:
        mastery: record đã có mastery mới (sau calculate_bkt_update)
        is_correct: kết quả lượt này
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

    # --- Luật level (hàm thuần của mastery) ---
    mastery.current_level = decide_level(mastery.mastery)

    # --- Luật status ---
    mastery.status = STATUS_COMPLETED if has_passed(mastery) else STATUS_IN_PROGRESS


def update_mastery_after_answer(
    db: Session,
    user_id: int,
    topic_id: int,
    is_correct: bool,
    count_towards_progress: bool = True,
) -> TopicMastery:
    """
    Update student's topic mastery after answering a question.

    Args:
        db: Database session
        user_id: Student user ID
        topic_id: Topic ID
        is_correct: Whether the answer was correct
        count_towards_progress: False = lượt luyện lại sau khi đã pass.
            Khi đó KHÔNG tính BKT và KHÔNG cộng `practice_attempts` — chỉ ghi
            thống kê (số câu đúng/sai, câu nào đúng câu nào sai).

    Returns:
        Updated TopicMastery record
    """
    # Get or create mastery record
    mastery = db.query(TopicMastery).filter(
        TopicMastery.user_id == user_id,
        TopicMastery.topic_id == topic_id
    ).first()

    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if topic is None:
        raise LookupError(f"Topic {topic_id} not found")

    if mastery is None:
        mastery = TopicMastery(
            user_id=user_id,
            topic_id=topic_id,
            mastery=topic.p_init,
            current_level=STARTING_LEVEL,
            practice_attempts=0,
            status=STATUS_IN_PROGRESS,
        )
        db.add(mastery)
        db.flush()

    # Lượt luyện lại sau khi đã pass: không tính BKT, không cộng bộ đếm.
    if not count_towards_progress:
        db.flush()
        db.refresh(mastery)
        return mastery

    # Calculate new mastery using BKT
    new_mastery = calculate_bkt_update(
        p_mastery=mastery.mastery,
        is_correct=is_correct,
        p_transit=topic.p_transit,
        p_slip=topic.p_slip,
        p_guess=topic.p_guess
    )
    mastery.mastery = new_mastery

    # Cập nhật counters + level + status theo bằng chứng
    apply_evidence(mastery, is_correct=is_correct)

    # KHÔNG commit ở đây. Caller (learning.service.submit_practice_answer)
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
            status=STATUS_IN_PROGRESS,
        )
        db.add(mastery)
        db.commit()
        db.refresh(mastery)

    return mastery
