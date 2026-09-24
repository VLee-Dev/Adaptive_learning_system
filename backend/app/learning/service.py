"""Service layer for practice learning flow."""
import random
from sqlalchemy.orm import Session

from app.attempts.model import Attempt
from app.attempts.repository import create_attempt, get_attempted_question_ids
from app.mastery.service import get_or_create_mastery, update_mastery_after_answer
from app.mastery.repository import get_practice_config
from app.questions.repository import get_practice_questions_by_level, get_question_by_id
from app.topics.model import Topic
from app.learning.schemas import (
    AnswerSubmitResponse,
    QuestionResponse,
    TopicMasteryResponse
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
    # Get or create mastery record
    mastery = get_or_create_mastery(db, user_id, topic_id)

    # Get practice configuration
    config = get_practice_config(db, topic_id)
    if config is None:
        raise LookupError("Practice configuration not found for this topic")

    # Determine which level to use
    current_level = mastery.current_level

    # Get questions already attempted to avoid repeating
    attempted_ids = get_attempted_question_ids(db, user_id, topic_id)

    # Try to get a question from current level first
    available_questions = get_practice_questions_by_level(
        db, topic_id, current_level, attempted_ids
    )

    # If no questions at current level, try adjacent levels
    if not available_questions:
        for level in [current_level - 1, current_level + 1]:
            if 1 <= level <= 3:
                available_questions = get_practice_questions_by_level(
                    db, topic_id, level, attempted_ids
                )
                if available_questions:
                    break

    # If still no questions, allow repeating questions
    if not available_questions:
        available_questions = get_practice_questions_by_level(db, topic_id, current_level, None)

    if not available_questions:
        return None

    # Select a random question from available ones
    question = random.choice(available_questions)

    return QuestionResponse(
        question_id=question.id,
        text=question.question_text,
        options=question.options,
        level=question.level or current_level,
        stimulus_id=question.stimulus_id
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

    # Create attempt record
    attempt = Attempt(
        user_id=user_id,
        question_id=question_id,
        topic_id=topic_id,
        selected_answer=selected_answer,
        is_correct=is_correct
    )
    create_attempt(db, attempt)

    # Update mastery using BKT
    updated_mastery = update_mastery_after_answer(db, user_id, topic_id, is_correct)

    # Get next question if practice should continue
    next_question = None
    if updated_mastery.status != "completed":
        next_question = get_next_practice_question(db, user_id, topic_id)

    return AnswerSubmitResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        updated_mastery=updated_mastery.mastery,
        current_level=updated_mastery.current_level,
        status=updated_mastery.status,
        next_question=next_question
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
        status=mastery.status
    )
