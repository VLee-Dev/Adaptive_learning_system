from sqlalchemy import select
from sqlalchemy.orm import Session

from app.courses.model import Course
from app.enrollments.model import CourseEnrollment


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
