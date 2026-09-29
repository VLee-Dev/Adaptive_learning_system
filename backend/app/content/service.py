from sqlalchemy.orm import Session

from app.content.repository import (
    get_chapter_by_id, get_course_by_id, get_lesson_by_id, get_topic_by_id,
    list_chapters_by_course, list_lessons_by_topic, list_published_courses,
    list_topics_by_chapter,
)


def get_public_courses(db: Session):
    return list_published_courses(db)


def get_course_detail(db: Session, course_id: int):
    course = get_course_by_id(db, course_id)
    if course is None:
        raise LookupError("Course not found")
    return course


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
