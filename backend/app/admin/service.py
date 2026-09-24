from sqlalchemy.orm import Session

from app.admin.repository import delete_course, get_course, list_courses, save_course
from app.admin.schemas import CourseCreate, CourseUpdate
from app.courses.model import Course
from app.chapters.model import Chapter
from app.topics.model import Topic
from app.lessons.model import Lesson
from app.questions.model import Question
from app.chapter_tests.model import ChapterFinalTest, ChapterTestPool, ChapterTestSlot
from app.admin.repository import delete_chapter, delete_topic, get_chapter, get_topic, list_chapters, list_topics, save_chapter, save_topic
from app.admin.schemas import ChapterCreate, ChapterUpdate, FinalTestCreate, LessonCreate, LessonUpdate, QuestionCreate, QuestionUpdate, TestPoolCreate, TestSlotCreate, TopicCreate, TopicUpdate


def list_admin_courses(db: Session) -> list[Course]:
    return list_courses(db)


def create_course(db: Session, payload: CourseCreate) -> Course:
    return save_course(db, Course(**payload.model_dump()))


def update_course(db: Session, course_id: int, payload: CourseUpdate) -> Course:
    course = get_course(db, course_id)
    if course is None:
        raise LookupError("Course not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    return save_course(db, course)


def remove_course(db: Session, course_id: int) -> None:
    course = get_course(db, course_id)
    if course is None:
        raise LookupError("Course not found")
    delete_course(db, course)


def list_admin_chapters(db: Session, course_id: int) -> list[Chapter]:
    if get_course(db, course_id) is None:
        raise LookupError("Course not found")
    return list_chapters(db, course_id)


def create_chapter(db: Session, course_id: int, payload: ChapterCreate) -> Chapter:
    if get_course(db, course_id) is None:
        raise LookupError("Course not found")
    return save_chapter(db, Chapter(course_id=course_id, **payload.model_dump()))


def update_chapter(db: Session, chapter_id: int, payload: ChapterUpdate) -> Chapter:
    chapter = get_chapter(db, chapter_id)
    if chapter is None:
        raise LookupError("Chapter not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(chapter, field, value)
    return save_chapter(db, chapter)


def remove_chapter(db: Session, chapter_id: int) -> None:
    chapter = get_chapter(db, chapter_id)
    if chapter is None:
        raise LookupError("Chapter not found")
    delete_chapter(db, chapter)


def list_admin_topics(db: Session, chapter_id: int) -> list[Topic]:
    if get_chapter(db, chapter_id) is None:
        raise LookupError("Chapter not found")
    return list_topics(db, chapter_id)


def create_topic(db: Session, chapter_id: int, payload: TopicCreate) -> Topic:
    if get_chapter(db, chapter_id) is None:
        raise LookupError("Chapter not found")
    return save_topic(db, Topic(chapter_id=chapter_id, **payload.model_dump()))


def update_topic(db: Session, topic_id: int, payload: TopicUpdate) -> Topic:
    topic = get_topic(db, topic_id)
    if topic is None:
        raise LookupError("Topic not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    return save_topic(db, topic)


def remove_topic(db: Session, topic_id: int) -> None:
    topic = get_topic(db, topic_id)
    if topic is None:
        raise LookupError("Topic not found")
    delete_topic(db, topic)


def list_admin_lessons(db: Session, topic_id: int) -> list[Lesson]:
    if get_topic(db, topic_id) is None:
        raise LookupError("Topic not found")
    from app.admin.repository import list_lessons
    return list_lessons(db, topic_id)


def create_lesson(db: Session, topic_id: int, payload: LessonCreate) -> Lesson:
    if get_topic(db, topic_id) is None:
        raise LookupError("Topic not found")
    from app.admin.repository import save_lesson
    return save_lesson(db, Lesson(topic_id=topic_id, **payload.model_dump()))


def update_lesson(db: Session, lesson_id: int, payload: LessonUpdate) -> Lesson:
    from app.admin.repository import get_lesson, save_lesson
    lesson = get_lesson(db, lesson_id)
    if lesson is None:
        raise LookupError("Lesson not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    return save_lesson(db, lesson)


def remove_lesson(db: Session, lesson_id: int) -> None:
    from app.admin.repository import delete_lesson, get_lesson
    lesson = get_lesson(db, lesson_id)
    if lesson is None:
        raise LookupError("Lesson not found")
    delete_lesson(db, lesson)


def list_admin_questions(db: Session, topic_id: int) -> list[Question]:
    if get_topic(db, topic_id) is None:
        raise LookupError("Topic not found")
    from app.admin.repository import list_questions
    return list_questions(db, topic_id)


def create_question(db: Session, topic_id: int, payload: QuestionCreate) -> Question:
    if get_topic(db, topic_id) is None:
        raise LookupError("Topic not found")
    from app.admin.repository import save_question
    return save_question(db, Question(topic_id=topic_id, **payload.model_dump()))


def update_question(db: Session, question_id: int, payload: QuestionUpdate) -> Question:
    from app.admin.repository import get_question, save_question
    question = get_question(db, question_id)
    if question is None:
        raise LookupError("Question not found")
    changes = payload.model_dump(exclude_unset=True)
    options = changes.get("options", question.options)
    correct_answer = changes.get("correct_answer", question.correct_answer)
    if len(options) != 4 or len(set(options)) != 4:
        raise ValueError("Question must have four unique options")
    if correct_answer not in options:
        raise ValueError("correct_answer must be one of options")
    level = changes.get("level", question.level)
    if question.purpose.value == "practice" and level is None:
        raise ValueError("Practice questions require a level")
    if question.purpose.value == "chapter_final" and level is not None:
        raise ValueError("Chapter final questions cannot have a level")
    for field, value in changes.items():
        setattr(question, field, value)
    return save_question(db, question)


def remove_question(db: Session, question_id: int) -> None:
    from app.admin.repository import delete_question, get_question
    question = get_question(db, question_id)
    if question is None:
        raise LookupError("Question not found")
    delete_question(db, question)


def create_final_test(db: Session, chapter_id: int, payload: FinalTestCreate) -> ChapterFinalTest:
    if get_chapter(db, chapter_id) is None:
        raise LookupError("Chapter not found")
    from app.admin.repository import get_final_test_by_chapter, save_final_test
    if get_final_test_by_chapter(db, chapter_id) is not None:
        raise ValueError("Chapter already has a final test")
    return save_final_test(db, ChapterFinalTest(chapter_id=chapter_id, **payload.model_dump()))


def get_admin_final_test(db: Session, chapter_id: int) -> ChapterFinalTest:
    from app.admin.repository import get_final_test_by_chapter
    test = get_final_test_by_chapter(db, chapter_id)
    if test is None:
        raise LookupError("Final test not found")
    return test


def create_test_pool(db: Session, test_id: int, payload: TestPoolCreate) -> ChapterTestPool:
    from app.admin.repository import get_final_test, save_pool
    if get_final_test(db, test_id) is None:
        raise LookupError("Final test not found")
    return save_pool(db, ChapterTestPool(test_id=test_id, **payload.model_dump()))


def create_test_slot(db: Session, test_id: int, payload: TestSlotCreate) -> ChapterTestSlot:
    from app.admin.repository import get_final_test, save_slot
    if get_final_test(db, test_id) is None:
        raise LookupError("Final test not found")
    return save_slot(db, ChapterTestSlot(test_id=test_id, **payload.model_dump()))


def assign_question_to_pool(db: Session, pool_id: int, question_id: int) -> ChapterTestPool:
    from app.admin.repository import add_question_to_pool, get_pool, get_question
    pool = get_pool(db, pool_id)
    question = get_question(db, question_id)
    if pool is None or question is None:
        raise LookupError("Pool or question not found")
    if question.purpose.value != "chapter_final":
        raise ValueError("Only chapter final questions can be assigned to a final test pool")
    return add_question_to_pool(db, pool, question)


def assign_pool_to_slot(db: Session, slot_id: int, pool_id: int) -> ChapterTestSlot:
    from app.admin.repository import add_pool_to_slot, get_pool, get_slot
    slot = get_slot(db, slot_id)
    pool = get_pool(db, pool_id)
    if slot is None or pool is None or slot.test_id != pool.test_id:
        raise ValueError("Slot and pool must belong to the same final test")
    return add_pool_to_slot(db, slot, pool)
