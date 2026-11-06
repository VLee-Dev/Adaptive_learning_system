from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.attempts.model import Attempt
from app.auth.dependencies import _decode_token
from app.auth.service import JWT_ALGORITHM, create_access_token
from app.chapters.model import Chapter
from app.config import settings
from app.completions.model import ChapterCompletion, CourseCompletion
from app.courses.model import Course
from app.enrollments.model import CourseEnrollment, EnrollmentStatus
from app.chapter_tests.model import (
    ChapterFinalTest,
    ChapterTestPool,
    ChapterTestSlot,
)
from app.learning.service import submit_practice_answer
from app.mastery.model import TopicMastery
from app.mastery.service import (
    PASS_MASTERY,
    STATUS_COMPLETED,
    STATUS_IN_PROGRESS,
    apply_evidence,
    calculate_bkt_update,
    decide_level,
    has_passed,
    should_warn,
)
from app.questions.model import Question, QuestionFormat, QuestionPurpose
from app.topics.model import Topic, TopicType
from app.users.model import User, UserRole
from app.users.service import hash_password


def make_topic(db, *, p_init=0.3):
    from app.chapters.model import Chapter
    from app.courses.model import Course

    course = Course(name="Test course", is_published=True)
    chapter = Chapter(course=course, title="Test chapter", order_index=1)
    topic = Topic(
        chapter=chapter,
        name="Test topic",
        order_index=1,
        type=TopicType.GENERAL,
        p_init=p_init,
        p_transit=0.2,
        p_slip=0.1,
        p_guess=0.25,
    )
    db.add(course)
    db.flush()
    return topic


def make_student(db, *, active=True):
    user = User(
        email="student@example.com",
        hashed_password=hash_password("CorrectPassword123"),
        role=UserRole.STUDENT,
        is_active=active,
    )
    db.add(user)
    db.flush()
    return user


def make_question(db, topic, answer="A"):
    question = Question(
        topic=topic,
        purpose=QuestionPurpose.PRACTICE,
        question_format=QuestionFormat.STANDARD,
        question_text="Choose the answer",
        options=["A", "B"],
        correct_answer=answer,
        explanation="Explanation",
        level=2,
    )
    db.add(question)
    db.flush()
    return question


def make_final_test(db, chapter, question, *, pass_percent=70.0):
    final_test = ChapterFinalTest(
        chapter_id=chapter.id,
        total_questions=1,
        pass_percent=pass_percent,
    )
    pool = ChapterTestPool(test=final_test, name="Final pool")
    slot = ChapterTestSlot(test=final_test, slot_index=1)
    pool.questions.append(question)
    slot.pools.append(pool)
    db.add(final_test)
    db.flush()
    return final_test


def complete_topic(db, student, topic):
    mastery = TopicMastery(
        user_id=student.id,
        topic_id=topic.id,
        mastery=0.9,
        current_level=3,
        status=STATUS_COMPLETED,
        practice_attempts=5,
        correct_count=5,
        consecutive_correct=5,
    )
    db.add(mastery)
    db.flush()
    return mastery


def make_mastery(*, mastery=0.3, **values):
    defaults = dict(
        user_id=1,
        topic_id=1,
        mastery=mastery,
        current_level=2,
        status=STATUS_IN_PROGRESS,
        practice_attempts=0,
        correct_count=0,
        wrong_count=0,
        consecutive_correct=0,
        consecutive_wrong=0,
    )
    defaults.update(values)
    return TopicMastery(**defaults)


def test_bkt_correct_answer_is_capped_and_learns():
    updated = calculate_bkt_update(0.3, True, 0.2, 0.1, 0.25)

    assert 0.3 < updated <= 0.45


def test_bkt_wrong_answer_does_not_apply_transit_and_respects_down_cap():
    updated = calculate_bkt_update(0.7, False, 1.0, 0.1, 0.25)

    assert updated < 0.7
    assert updated >= 0.6


@pytest.mark.parametrize(
    ("mastery", "level"),
    [(0.34, 1), (0.35, 2), (0.69, 2), (0.70, 3)],
)
def test_level_boundaries(mastery, level):
    assert decide_level(mastery) == level


def test_warning_requires_low_mastery_and_three_wrong_or_five_wrong():
    assert not should_warn(make_mastery(mastery=0.29, consecutive_wrong=2))
    assert should_warn(make_mastery(mastery=0.29, consecutive_wrong=3))
    assert should_warn(make_mastery(mastery=0.9, consecutive_wrong=5))


def test_pass_requires_mastery_for_correct_streak():
    assert not has_passed(
        make_mastery(
            mastery=PASS_MASTERY - 0.01,
            consecutive_correct=5,
        )
    )
    assert has_passed(make_mastery(mastery=PASS_MASTERY, consecutive_correct=5))


def test_pass_volume_path_requires_twenty_attempts_and_ten_correct():
    assert not has_passed(
        make_mastery(practice_attempts=19, correct_count=19)
    )
    assert has_passed(make_mastery(practice_attempts=20, correct_count=10))


def test_apply_evidence_resets_opposite_streak_and_updates_status():
    mastery = make_mastery(
        mastery=PASS_MASTERY,
        consecutive_wrong=2,
        consecutive_correct=4,
    )

    apply_evidence(mastery, is_correct=True)

    assert mastery.consecutive_correct == 5
    assert mastery.consecutive_wrong == 0
    assert mastery.practice_attempts == 1
    assert mastery.status == STATUS_COMPLETED


def test_student_answer_updates_mastery_attempt_and_counters(db):
    topic = make_topic(db)
    student = make_student(db)
    question = make_question(db, topic)

    response = submit_practice_answer(db, student.id, topic.id, question.id, "A")
    mastery = db.query(TopicMastery).one()

    assert response.is_correct is True
    assert mastery.practice_attempts == 1
    assert mastery.correct_count == 1
    assert mastery.mastery > topic.p_init
    assert db.query(Attempt).count() == 1


def test_three_wrong_answers_return_review_warning_with_lesson_link(db):
    from app.lessons.model import Lesson, LessonContentType

    topic = make_topic(db, p_init=0.2)
    db.add(
        Lesson(
            topic=topic,
            name="Review lesson",
            content_type=LessonContentType.TEXT,
            content="Review",
            order_index=1,
        )
    )
    student = make_student(db)
    question = make_question(db, topic)
    db.commit()

    responses = [
        submit_practice_answer(db, student.id, topic.id, question.id, "B")
        for _ in range(3)
    ]

    assert responses[-1].warning == "Bạn hãy học kỹ hơn chủ đề này"
    assert responses[-1].suggested_lesson_id is not None
    assert responses[-1].lesson_url.startswith("/student/lessons/")
    assert responses[-1].status == STATUS_IN_PROGRESS


def test_five_correct_answers_can_pass_topic(db):
    topic = make_topic(db, p_init=0.3)
    student = make_student(db)
    question = make_question(db, topic)

    responses = [
        submit_practice_answer(db, student.id, topic.id, question.id, "A")
        for _ in range(5)
    ]
    mastery = db.query(TopicMastery).one()

    assert responses[-1].passed is True
    assert mastery.status == STATUS_COMPLETED
    assert mastery.consecutive_correct == 5


def test_extra_practice_after_pass_records_attempt_without_progress(db):
    topic = make_topic(db)
    student = make_student(db)
    question = make_question(db, topic)
    mastery = TopicMastery(
        user_id=student.id,
        topic_id=topic.id,
        mastery=0.9,
        current_level=3,
        status=STATUS_COMPLETED,
        practice_attempts=20,
        correct_count=15,
        wrong_count=5,
        consecutive_correct=5,
        consecutive_wrong=0,
    )
    db.add(mastery)
    db.commit()

    response = submit_practice_answer(db, student.id, topic.id, question.id, "B")
    db.refresh(mastery)

    assert response.is_extra_practice is True
    assert response.passed is True
    assert mastery.mastery == 0.9
    assert mastery.practice_attempts == 20
    assert mastery.wrong_count == 5
    assert db.query(Attempt).count() == 1


def test_login_rejects_wrong_password_and_accepts_correct_password(api_client, db):
    make_student(db)
    db.commit()

    wrong = api_client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "WrongPassword123"},
    )
    correct = api_client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "CorrectPassword123"},
    )

    assert wrong.status_code == 401
    assert correct.status_code == 200
    assert correct.json()["token_type"] == "bearer"


def test_invalid_and_expired_tokens_are_rejected():
    assert _decode_token("not-a-jwt") is None
    expired = jwt.encode(
        {
            "sub": "1",
            "role": "student",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        settings.jwt_secret_key,
        algorithm=JWT_ALGORITHM,
    )

    assert _decode_token(expired) is None


def test_protected_endpoint_requires_authentication(api_client):
    response = api_client.get("/learning/topics/1/mastery")

    assert response.status_code == 401


def test_inactive_user_cannot_access_protected_endpoint(api_client, db):
    student = make_student(db, active=False)
    token = create_access_token(student.id, student.role.value)

    response = api_client.get(
        "/learning/topics/1/mastery",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_passing_chapter_final_test_creates_chapter_completion(db):
    topic = make_topic(db)
    student = make_student(db)
    question = make_question(db, topic)
    db.add(CourseEnrollment(user_id=student.id, course_id=topic.chapter.course_id))
    complete_topic(db, student, topic)
    make_final_test(db, topic.chapter, question)
    db.commit()

    from app.learning.chapter_test_service import start_chapter_test, submit_chapter_test

    started = start_chapter_test(db, student.id, topic.chapter.id)
    result = submit_chapter_test(
        db,
        student.id,
        started.test_session_id,
        {started.questions[0].slot_index: "A"},
    )

    completion = db.query(ChapterCompletion).one()
    assert result.passed is True
    assert result.chapter_completed is True
    assert completion.chapter_id == topic.chapter.id
    assert completion.test_score_percent == 100.0


def test_failing_chapter_final_test_does_not_create_completion(db):
    topic = make_topic(db)
    student = make_student(db)
    question = make_question(db, topic)
    db.add(CourseEnrollment(user_id=student.id, course_id=topic.chapter.course_id))
    complete_topic(db, student, topic)
    make_final_test(db, topic.chapter, question, pass_percent=70.0)
    db.commit()

    from app.learning.chapter_test_service import start_chapter_test, submit_chapter_test

    started = start_chapter_test(db, student.id, topic.chapter.id)
    result = submit_chapter_test(
        db,
        student.id,
        started.test_session_id,
        {started.questions[0].slot_index: "B"},
    )

    assert result.passed is False
    assert result.chapter_completed is False
    assert db.query(ChapterCompletion).count() == 0


def test_passing_last_chapter_creates_course_completion(db):
    course = Course(name="Complete me", is_published=True)
    chapter = Chapter(course=course, title="Only chapter", order_index=1)
    topic = Topic(
        chapter=chapter,
        name="Only topic",
        order_index=1,
        type=TopicType.GENERAL,
        p_init=0.3,
        p_transit=0.2,
        p_slip=0.1,
        p_guess=0.25,
    )
    db.add(course)
    db.flush()
    student = make_student(db)
    question = make_question(db, topic)
    db.add(CourseEnrollment(user_id=student.id, course_id=course.id))
    complete_topic(db, student, topic)
    make_final_test(db, chapter, question)
    db.commit()

    from app.learning.chapter_test_service import start_chapter_test, submit_chapter_test

    started = start_chapter_test(db, student.id, chapter.id)
    result = submit_chapter_test(
        db,
        student.id,
        started.test_session_id,
        {started.questions[0].slot_index: "A"},
    )

    assert result.chapter_completed is True
    assert db.query(CourseCompletion).filter_by(
        user_id=student.id, course_id=course.id
    ).one()


def test_student_can_enroll_published_course_and_read_status(api_client, db):
    course = Course(name="Published course", is_published=True)
    db.add(course)
    student = make_student(db)
    db.commit()
    token = create_access_token(student.id, student.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    enrolled = api_client.post(f"/courses/{course.id}/enroll", headers=headers)
    status_response = api_client.get(
        f"/courses/{course.id}/enrollment-status", headers=headers
    )

    assert enrolled.status_code == 201
    assert enrolled.json()["status"] == EnrollmentStatus.ACTIVE.value
    assert status_response.status_code == 200
    assert status_response.json()["is_enrolled"] is True
    assert db.query(CourseEnrollment).count() == 1


def test_student_cannot_enroll_unpublished_course(api_client, db):
    course = Course(name="Draft course", is_published=False)
    db.add(course)
    student = make_student(db)
    db.commit()
    token = create_access_token(student.id, student.role.value)

    response = api_client.post(
        f"/courses/{course.id}/enroll",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert db.query(CourseEnrollment).count() == 0


def test_student_is_forbidden_from_admin_api(api_client, db):
    student = make_student(db)
    db.commit()
    token = create_access_token(student.id, student.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    list_response = api_client.get("/admin/courses", headers=headers)
    create_response = api_client.post(
        "/admin/courses",
        headers=headers,
        json={"name": "Unauthorized course", "is_published": True},
    )

    assert list_response.status_code == 403
    assert create_response.status_code == 403
    assert db.query(Course).count() == 0
