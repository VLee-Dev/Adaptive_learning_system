"""Service layer for chapter final test execution."""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.chapter_tests.repository import get_chapter_test, generate_test_questions
from app.chapters.model import Chapter
from app.completions.model import ChapterCompletion, CourseCompletion
from app.completions.repository import (
    create_chapter_completion,
    get_chapter_completion,
    get_completed_chapters_count,
    create_course_completion,
    get_course_completion
)
from app.learning.chapter_test_schemas import (
    ChapterTestStartResponse,
    ChapterTestSubmitResponse,
    TestQuestionResponse,
    TestAnswerResult,
    ChapterCompletionResponse
)

# In-memory storage for test sessions (should be Redis in production)
_test_sessions: dict[str, dict] = {}


def start_chapter_test(db: Session, user_id: int, chapter_id: int) -> ChapterTestStartResponse:
    """
    Start a chapter final test session.

    Args:
        db: Database session
        user_id: Student user ID
        chapter_id: Chapter ID

    Returns:
        ChapterTestStartResponse with generated questions
    """
    # Check if chapter exists
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise LookupError("Chapter not found")

    # Get test configuration
    test = get_chapter_test(db, chapter_id)
    if test is None:
        raise LookupError("Chapter final test not configured")

    # Generate test questions
    slot_questions = generate_test_questions(db, test)

    if len(slot_questions) != test.total_questions:
        raise ValueError(f"Expected {test.total_questions} questions, but generated {len(slot_questions)}")

    # Create test session
    session_id = str(uuid.uuid4())
    _test_sessions[session_id] = {
        "user_id": user_id,
        "chapter_id": chapter_id,
        "test_id": test.id,
        "slot_questions": {slot_idx: q.id for slot_idx, q in slot_questions.items()},
        "started_at": datetime.utcnow().isoformat()
    }

    # Build response
    questions = [
        TestQuestionResponse(
            question_id=question.id,
            slot_index=slot_index,
            text=question.question_text,
            options=question.options,
            stimulus_id=question.stimulus_id
        )
        for slot_index, question in sorted(slot_questions.items())
    ]

    return ChapterTestStartResponse(
        test_session_id=session_id,
        chapter_id=chapter_id,
        total_questions=test.total_questions,
        pass_percent=test.pass_percent,
        questions=questions
    )


def submit_chapter_test(
    db: Session,
    user_id: int,
    session_id: str,
    answers: dict[int, str]
) -> ChapterTestSubmitResponse:
    """
    Submit chapter final test and calculate results.

    Args:
        db: Database session
        user_id: Student user ID
        session_id: Test session ID
        answers: Dictionary mapping slot_index -> selected_answer

    Returns:
        ChapterTestSubmitResponse with results and completion status
    """
    # Retrieve test session
    session = _test_sessions.get(session_id)
    if session is None:
        raise LookupError("Test session not found or expired")

    if session["user_id"] != user_id:
        raise ValueError("Test session does not belong to this user")

    chapter_id = session["chapter_id"]
    slot_questions = session["slot_questions"]  # slot_index -> question_id

    # Get test configuration
    test = get_chapter_test(db, chapter_id)
    if test is None:
        raise LookupError("Chapter final test not found")

    # Grade the test
    detailed_results = []
    correct_count = 0

    from app.questions.repository import get_question_by_id

    for slot_index, question_id in slot_questions.items():
        question = get_question_by_id(db, question_id)
        if question is None:
            continue

        selected_answer = answers.get(slot_index, "")
        is_correct = selected_answer == question.correct_answer

        if is_correct:
            correct_count += 1

        detailed_results.append(TestAnswerResult(
            slot_index=slot_index,
            question_id=question_id,
            selected_answer=selected_answer,
            correct_answer=question.correct_answer,
            is_correct=is_correct,
            explanation=question.explanation
        ))

    # Calculate score
    total_questions = test.total_questions
    score_percent = (correct_count / total_questions * 100) if total_questions > 0 else 0
    passed = score_percent >= test.pass_percent

    # Create chapter completion if passed
    chapter_completed = False
    if passed:
        existing_completion = get_chapter_completion(db, user_id, chapter_id)
        if existing_completion is None:
            completion = ChapterCompletion(
                user_id=user_id,
                chapter_id=chapter_id,
                test_score_percent=score_percent
            )
            create_chapter_completion(db, completion)
            chapter_completed = True

            # Check if course is completed (all chapters done)
            chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
            if chapter:
                check_and_complete_course(db, user_id, chapter.course_id)

    # Clean up session
    del _test_sessions[session_id]

    return ChapterTestSubmitResponse(
        passed=passed,
        score_percent=score_percent,
        pass_percent=test.pass_percent,
        correct_count=correct_count,
        total_questions=total_questions,
        chapter_completed=chapter_completed,
        detailed_results=detailed_results
    )


def check_and_complete_course(db: Session, user_id: int, course_id: int):
    """
    Check if all chapters in a course are completed, and if so, create course completion.

    Args:
        db: Database session
        user_id: Student user ID
        course_id: Course ID
    """
    # Count total chapters in course
    total_chapters = db.query(Chapter).filter(Chapter.course_id == course_id).count()

    # Count completed chapters
    completed_chapters = get_completed_chapters_count(db, user_id, course_id)

    # If all chapters completed, create course completion
    if completed_chapters >= total_chapters and total_chapters > 0:
        existing = get_course_completion(db, user_id, course_id)
        if existing is None:
            completion = CourseCompletion(
                user_id=user_id,
                course_id=course_id
            )
            create_course_completion(db, completion)


def get_chapter_completion_status(
    db: Session,
    user_id: int,
    chapter_id: int
) -> ChapterCompletionResponse:
    """
    Get completion status for a chapter.

    Args:
        db: Database session
        user_id: Student user ID
        chapter_id: Chapter ID

    Returns:
        ChapterCompletionResponse with completion details
    """
    completion = get_chapter_completion(db, user_id, chapter_id)

    if completion:
        return ChapterCompletionResponse(
            chapter_id=chapter_id,
            is_completed=True,
            test_score_percent=completion.test_score_percent,
            completed_at=completion.completed_at.isoformat()
        )
    else:
        return ChapterCompletionResponse(
            chapter_id=chapter_id,
            is_completed=False
        )
