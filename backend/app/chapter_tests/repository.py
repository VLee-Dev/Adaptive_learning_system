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

    Returns:
        Dictionary mapping slot_index -> selected Question
    """
    slot_questions: dict[int, Question] = {}

    for slot in test.slots:
        if not slot.pools:
            continue

        # Get all questions from all pools assigned to this slot
        available_questions = []
        for pool in slot.pools:
            available_questions.extend(pool.questions)

        if available_questions:
            # Randomly select one question
            selected_question = random.choice(available_questions)
            slot_questions[slot.slot_index] = selected_question

    return slot_questions


def get_test_by_id(db: Session, test_id: int) -> ChapterFinalTest | None:
    """Get test by ID with all relations."""
    return db.query(ChapterFinalTest).filter(
        ChapterFinalTest.id == test_id
    ).options(
        joinedload(ChapterFinalTest.slots).joinedload(ChapterTestSlot.pools),
        joinedload(ChapterFinalTest.pools).joinedload(ChapterTestPool.questions)
    ).first()
