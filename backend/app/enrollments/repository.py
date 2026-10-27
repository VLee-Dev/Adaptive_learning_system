from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.attempts.model import Attempt
from app.chapters.model import Chapter
from app.completions.model import ChapterCompletion, CourseCompletion
from app.courses.model import Course
from app.enrollments.model import CourseEnrollment
from app.study_sessions.model import StudySession
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
    - last_accessed: thời điểm tương tác mới nhất từ attempts hoặc study_sessions
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

        # Last accessed: mốc thời gian user tương tác gần nhất với course.
        # Lấy max từ attempts và study_sessions vì đây là hai nguồn hoạt động
        # thực tế còn được ghi trong hệ thống.
        topic_ids_in_course = select(Topic.id).where(Topic.chapter_id.in_(
            select(Chapter.id).where(Chapter.course_id == course.id)
        ))

        last_attempt = db.scalar(
            select(func.max(Attempt.created_at)).where(
                Attempt.user_id == user_id,
                Attempt.topic_id.in_(topic_ids_in_course),
            )
        )
        # StudySession.reference_id là topic_id (kind='practice') → dùng để
        # suy ra course qua topic.
        last_session = db.scalar(
            select(func.max(StudySession.started_at)).where(
                StudySession.user_id == user_id,
                StudySession.reference_id.in_(topic_ids_in_course),
            )
        )

        candidates = [t for t in (last_attempt, last_session) if t is not None]
        last_accessed = max(candidates) if candidates else None

        results.append({
            "course_id": course.id,
            "course_name": course.name,
            "progress": float(progress),
            "completed": completed,
            "last_accessed": last_accessed,
        })

    return results
