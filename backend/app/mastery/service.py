"""BKT mastery update service."""
from sqlalchemy.orm import Session

from app.mastery.model import TopicMastery
from app.topics.model import Topic

# ===== HARDCODED BKT THRESHOLDS (không cho admin chỉnh sửa) =====
QUESTIONS_PER_SESSION = 8      # Tăng từ 5 → 8 để có thêm evidence
LEVEL_UP_MASTERY = 0.75         # Tăng từ 0.65 → 0.75 để khó lên level hơn
COMPLETION_MASTERY = 0.90       # Tăng từ 0.85 → 0.90 để khó pass hơn
REVIEW_MASTERY = 0.50           # Tăng từ 0.4 → 0.5 để dễ trigger review hơn
STARTING_LEVEL = 1              # Luôn bắt đầu từ level 1


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

    # Apply learning opportunity: P(L_new) = P(L_old) + (1 - P(L_old)) * p_transit
    p_mastery_new = p_mastery_after_answer + (1 - p_mastery_after_answer) * p_transit

    # Clamp between 0 and 1
    return max(0.0, min(1.0, p_mastery_new))


def update_mastery_after_answer(
    db: Session,
    user_id: int,
    topic_id: int,
    is_correct: bool
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
            current_level=1,
            practice_attempts=0,
            status="in_progress"
        )
        db.add(mastery)
        db.flush()

    # Get topic BKT parameters
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if topic is None:
        raise LookupError(f"Topic {topic_id} not found")

    # Calculate new mastery using BKT
    new_mastery = calculate_bkt_update(
        p_mastery=mastery.mastery,
        is_correct=is_correct,
        p_transit=topic.p_transit,
        p_slip=topic.p_slip,
        p_guess=topic.p_guess
    )

    # Update mastery record
    mastery.mastery = new_mastery
    mastery.practice_attempts += 1

    # Update level based on hardcoded thresholds
    if new_mastery >= LEVEL_UP_MASTERY and mastery.current_level < 3:
        mastery.current_level = min(3, mastery.current_level + 1)
    elif new_mastery < REVIEW_MASTERY and mastery.current_level > 1:
        mastery.current_level = max(1, mastery.current_level - 1)

    # Update status based on hardcoded thresholds
    if new_mastery >= COMPLETION_MASTERY:
        mastery.status = "completed"
    elif new_mastery < REVIEW_MASTERY:
        mastery.status = "review_required"
    else:
        mastery.status = "in_progress"

    db.commit()
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
