"""Repository for chapter test operations."""
import random
from sqlalchemy.orm import Session, joinedload

from app.chapter_tests.model import ChapterFinalTest, ChapterTestSlot, ChapterTestPool
from app.questions.model import Question


def get_chapter_test(db: Session, chapter_id: int) -> ChapterFinalTest | None:
    """Get chapter final test configuration."""
    return db.query(ChapterFinalTest).filter(
        ChapterFinalTest.chapter_id == chapter_id
    ).options(
        joinedload(ChapterFinalTest.slots).joinedload(ChapterTestSlot.pools),
        joinedload(ChapterFinalTest.pools).joinedload(ChapterTestPool.questions)
    ).first()


def generate_test_questions(db: Session, test: ChapterFinalTest) -> dict[int, Question]:
    """
    Generate test questions by randomly selecting from pools for each slot.

    Business rule (spec section 6.4): a pool can be assigned to multiple slots,
    but within a single test attempt the same question must not appear twice
    from the same pool if the pool still has unused questions.

    Returns:
        Dictionary mapping slot_index -> selected Question
    """
    slot_questions: dict[int, Question] = {}

    # Track questions already selected per pool during this attempt
    used_question_ids_per_pool: dict[int, set[int]] = {}

    # Sort slots by slot_index for deterministic processing order
    for slot in sorted(test.slots, key=lambda s: s.slot_index):
        if not slot.pools:
            continue

        # Get all questions from all pools assigned to this slot,
        # excluding questions already used from each pool in this attempt
        available_questions = []
        for pool in slot.pools:
            used_in_pool = used_question_ids_per_pool.setdefault(pool.id, set())
            for question in pool.questions:
                if question.id not in used_in_pool:
                    available_questions.append(question)

        if available_questions:
            selected_question = random.choice(available_questions)
            slot_questions[slot.slot_index] = selected_question

            # Mark this question as used across all pools it belongs to
            for pool in slot.pools:
                if selected_question in pool.questions:
                    used_question_ids_per_pool.setdefault(pool.id, set()).add(selected_question.id)

    return slot_questions


def get_test_by_id(db: Session, test_id: int) -> ChapterFinalTest | None:
    """Get test by ID with all relations."""
    return db.query(ChapterFinalTest).filter(
        ChapterFinalTest.id == test_id
    ).options(
        joinedload(ChapterFinalTest.slots).joinedload(ChapterTestSlot.pools),
        joinedload(ChapterFinalTest.pools).joinedload(ChapterTestPool.questions)
    ).first()
