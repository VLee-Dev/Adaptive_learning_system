from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.courses.model import Course
from app.chapters.model import Chapter
from app.topics.model import Topic
from app.lessons.model import Lesson


def list_published_courses(db: Session) -> list[Course]:
    return list(db.scalars(select(Course).where(Course.is_published.is_(True)).order_by(Course.created_at, Course.id)).all())


def get_course_by_id(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def list_chapters_by_course(db: Session, course_id: int) -> list[Chapter]:
    return list(db.scalars(
        select(Chapter)
        .where(Chapter.course_id == course_id)
        .order_by(Chapter.order_index, Chapter.id)
    ).all())


def get_chapter_by_id(db: Session, chapter_id: int) -> Chapter | None:
    return db.get(Chapter, chapter_id)


def list_topics_by_chapter(db: Session, chapter_id: int) -> list[Topic]:
    return list(db.scalars(
        select(Topic)
        .where(Topic.chapter_id == chapter_id)
        .order_by(Topic.order_index, Topic.id)
    ).all())


def get_topic_by_id(db: Session, topic_id: int) -> Topic | None:
    return db.get(Topic, topic_id)


def list_lessons_by_topic(db: Session, topic_id: int) -> list[Lesson]:
    return list(db.scalars(
        select(Lesson)
        .where(Lesson.topic_id == topic_id)
        .order_by(Lesson.order_index, Lesson.id)
    ).all())


def get_lesson_by_id(db: Session, lesson_id: int) -> Lesson | None:
    return db.get(Lesson, lesson_id)
