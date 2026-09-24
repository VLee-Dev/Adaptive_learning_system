from sqlalchemy.orm import Session

from app.enrollments.model import CourseEnrollment, EnrollmentStatus
from app.enrollments.repository import get_course, get_enrollment, save_enrollment


def enroll_user(db: Session, user_id: int, course_id: int) -> CourseEnrollment:
    course = get_course(db, course_id)
    if course is None or not course.is_published:
        raise LookupError("Course not found")

    existing = get_enrollment(db, user_id, course_id)
    if existing is not None:
        return existing

    return save_enrollment(
        db,
        CourseEnrollment(user_id=user_id, course_id=course_id, status=EnrollmentStatus.ACTIVE),
    )
