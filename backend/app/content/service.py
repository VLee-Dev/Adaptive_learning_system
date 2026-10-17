from sqlalchemy.orm import Session

from app.content.repository import (
    get_chapter_by_id, get_course_by_id, get_lesson_by_id, get_topic_by_id,
    list_chapters_by_course, list_lessons_by_topic, list_published_courses,
    list_topics_by_chapter,
)
from app.content.schemas import CourseDetail
from app.enrollments.model import CourseEnrollment
from sqlalchemy import select, func


def _enrollment_count(db: Session, course_id: int) -> int:
    """Count active enrollments for a course."""
    return db.execute(
        select(func.count(CourseEnrollment.id))
        .where(CourseEnrollment.course_id == course_id)
    ).scalar() or 0


def get_public_courses(db: Session, user_id: int | None = None):
    """Lấy danh sách khóa học public.

    Nếu `user_id` được cung cấp, mỗi course sẽ có `is_enrolled` phản ánh
    đúng enrollment của user đó.
    """
    courses = list_published_courses(db)
    for c in courses:
        c.enrollment_count = _enrollment_count(db, c.id)
        if user_id is None:
            c.is_enrolled = False
        else:
            from app.enrollments.repository import get_enrollment
            c.is_enrolled = get_enrollment(db, user_id, c.id) is not None
    return courses


def get_course_detail(db: Session, course_id: int, user_id: int | None = None) -> CourseDetail:
    """Trả về CourseDetail cho trang public.

    Nếu `user_id` được cung cấp (student đã đăng nhập), `is_enrolled`
    sẽ phản ánh đúng enrollment của user đó. Ngược lại (guest) luôn False.
    """
    course = get_course_by_id(db, course_id)
    if course is None:
        raise LookupError("Course not found")
    course.enrollment_count = _enrollment_count(db, course.id)
    if user_id is None:
        course.is_enrolled = False
    else:
        from app.enrollments.repository import get_enrollment
        course.is_enrolled = get_enrollment(db, user_id, course_id) is not None
    return CourseDetail.model_validate(course)


def get_course_chapters(db: Session, course_id: int):
    if get_course_by_id(db, course_id) is None:
        raise LookupError("Course not found")
    return list_chapters_by_course(db, course_id)


def get_chapter_detail(db: Session, chapter_id: int):
    chapter = get_chapter_by_id(db, chapter_id)
    if chapter is None:
        raise LookupError("Chapter not found")
    return chapter


def get_chapter_topics(db: Session, chapter_id: int):
    if get_chapter_by_id(db, chapter_id) is None:
        raise LookupError("Chapter not found")
    return list_topics_by_chapter(db, chapter_id)


def get_topic_detail(db: Session, topic_id: int):
    topic = get_topic_by_id(db, topic_id)
    if topic is None:
        raise LookupError("Topic not found")
    return topic


def get_topic_lessons(db: Session, topic_id: int):
    if get_topic_by_id(db, topic_id) is None:
        raise LookupError("Topic not found")
    return list_lessons_by_topic(db, topic_id)


def get_lesson_detail(db: Session, lesson_id: int):
    lesson = get_lesson_by_id(db, lesson_id)
    if lesson is None:
        raise LookupError("Lesson not found")
    return lesson
