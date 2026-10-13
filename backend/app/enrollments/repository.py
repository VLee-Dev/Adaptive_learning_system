from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.chapters.model import Chapter
from app.completions.model import ChapterCompletion, CourseCompletion
from app.courses.model import Course
from app.enrollments.model import CourseEnrollment
from app.learning_events.model import LearningEvent
from app.topics.model import Topic


def get_course(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def get_enrollment(db: Session, user_id: int, course_id: int) -> CourseEnrollment | None:
    return db.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id,
        )
    )


def save_enrollment(db: Session, enrollment: CourseEnrollment) -> CourseEnrollment:
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def list_enrollments_for_user(db: Session, user_id: int) -> list[dict]:
    """B32: List enrolled courses + progress for the student dashboard.

    - course_id, course_name: from courses
    - progress: % chapter completed in that course (0–100)
    - completed: course_completions record exists
    - last_accessed: created_at của LearningEvent mới nhất trong topics của course
                     (dựa trên topic_id qua chapter), null nếu chưa có event
    """
    enrollments = db.scalars(
        select(CourseEnrollment)
        .where(CourseEnrollment.user_id == user_id)
        .order_by(CourseEnrollment.enrolled_at.desc())
    ).all()

    results: list[dict] = []
    for enr in enrollments:
        course = db.get(Course, enr.course_id)
        if course is None:
            continue

        # Progress = completed chapters / total chapters * 100
        total_chapters = db.scalar(
            select(func.count(Chapter.id)).where(Chapter.course_id == course.id)
        ) or 0
        completed_chapters = db.scalar(
            select(func.count(ChapterCompletion.id)).where(
                ChapterCompletion.user_id == user_id,
                ChapterCompletion.chapter_id.in_(
                    select(Chapter.id).where(Chapter.course_id == course.id)
                ),
            )
        ) or 0
        progress = (completed_chapters / total_chapters * 100) if total_chapters > 0 else 0.0

        # Completed = course_completions record exists
        completed = db.scalar(
            select(CourseCompletion.id).where(
                CourseCompletion.user_id == user_id,
                CourseCompletion.course_id == course.id,
            )
        ) is not None

        # Last accessed: max(LearningEvent.created_at) for topics trong course
        last_accessed = db.scalar(
            select(func.max(LearningEvent.created_at))
            .join(Topic, Topic.id == LearningEvent.topic_id)
            .join(Chapter, Chapter.id == Topic.chapter_id)
            .where(
                LearningEvent.user_id == user_id,
                Chapter.course_id == course.id,
            )
        )

        results.append({
            "course_id": course.id,
            "course_name": course.name,
            "progress": float(progress),
            "completed": completed,
            "last_accessed": last_accessed,
        })

    return results
