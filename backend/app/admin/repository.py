from sqlalchemy import select
from sqlalchemy.orm import Session

from app.courses.model import Course
from app.chapters.model import Chapter
from app.topics.model import Topic
from app.lessons.model import Lesson
from app.questions.model import Question
from app.chapter_tests.model import ChapterFinalTest, ChapterTestPool, ChapterTestSlot, chapter_test_pool_questions, chapter_test_slot_pools


def list_courses(db: Session) -> list[Course]:
    return list(db.scalars(select(Course).order_by(Course.created_at, Course.id)).all())


def get_course(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def save_course(db: Session, course: Course) -> Course:
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course: Course) -> None:
    db.delete(course)
    db.commit()


def list_chapters(db: Session, course_id: int) -> list[Chapter]:
    return list(db.scalars(select(Chapter).where(Chapter.course_id == course_id).order_by(Chapter.order_index)).all())


def get_chapter(db: Session, chapter_id: int) -> Chapter | None:
    return db.get(Chapter, chapter_id)


def save_chapter(db: Session, chapter: Chapter) -> Chapter:
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


def delete_chapter(db: Session, chapter: Chapter) -> None:
    db.delete(chapter)
    db.commit()


def list_topics(db: Session, chapter_id: int) -> list[Topic]:
    return list(db.scalars(select(Topic).where(Topic.chapter_id == chapter_id).order_by(Topic.order_index)).all())


def get_topic(db: Session, topic_id: int) -> Topic | None:
    return db.get(Topic, topic_id)


def save_topic(db: Session, topic: Topic) -> Topic:
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def delete_topic(db: Session, topic: Topic) -> None:
    db.delete(topic)
    db.commit()


def list_lessons(db: Session, topic_id: int) -> list[Lesson]:
    return list(db.scalars(select(Lesson).where(Lesson.topic_id == topic_id).order_by(Lesson.order_index)).all())


def get_lesson(db: Session, lesson_id: int) -> Lesson | None:
    return db.get(Lesson, lesson_id)


def save_lesson(db: Session, lesson: Lesson) -> Lesson:
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


def delete_lesson(db: Session, lesson: Lesson) -> None:
    db.delete(lesson)
    db.commit()


def list_questions(db: Session, topic_id: int) -> list[Question]:
    return list(db.scalars(select(Question).where(Question.topic_id == topic_id).order_by(Question.purpose, Question.level, Question.id)).all())


def get_question(db: Session, question_id: int) -> Question | None:
    return db.get(Question, question_id)


def save_question(db: Session, question: Question) -> Question:
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question: Question) -> None:
    db.delete(question)
    db.commit()


def get_final_test(db: Session, test_id: int) -> ChapterFinalTest | None:
    return db.get(ChapterFinalTest, test_id)


def get_final_test_by_chapter(db: Session, chapter_id: int) -> ChapterFinalTest | None:
    return db.scalar(select(ChapterFinalTest).where(ChapterFinalTest.chapter_id == chapter_id))


def save_final_test(db: Session, test: ChapterFinalTest) -> ChapterFinalTest:
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


def get_pool(db: Session, pool_id: int) -> ChapterTestPool | None:
    return db.get(ChapterTestPool, pool_id)


def save_pool(db: Session, pool: ChapterTestPool) -> ChapterTestPool:
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return pool


def get_slot(db: Session, slot_id: int) -> ChapterTestSlot | None:
    return db.get(ChapterTestSlot, slot_id)


def save_slot(db: Session, slot: ChapterTestSlot) -> ChapterTestSlot:
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def get_question(db: Session, question_id: int) -> Question | None:
    return db.get(Question, question_id)


def add_question_to_pool(db: Session, pool: ChapterTestPool, question: Question) -> ChapterTestPool:
    pool.questions.append(question)
    db.commit()
    db.refresh(pool)
    return pool


def add_pool_to_slot(db: Session, slot: ChapterTestSlot, pool: ChapterTestPool) -> ChapterTestSlot:
    slot.pools.append(pool)
    db.commit()
    db.refresh(slot)
    return slot
