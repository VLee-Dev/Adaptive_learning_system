from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from core.database import get_db
from app.enrollments.repository import get_enrollment
from app.enrollments.schemas import EnrollmentResponse
from app.enrollments.service import enroll_user
from app.users.model import User

router = APIRouter(prefix="/courses", tags=["enrollments"])


@router.get("/{course_id}/enrollment-status", response_model=dict)
def enrollment_status(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về trạng thái enrollment của user hiện tại với course.

    Dùng bởi FE để chắc chắn is_enrolled đúng khi cache/private API
    trả về is_enrolled sai (vd public endpoint không lấy user).
    """
    enrollment = get_enrollment(db, current_user.id, course_id)
    if enrollment is None:
        return {"is_enrolled": False, "status": None, "enrolled_at": None}
    return {
        "is_enrolled": True,
        "status": enrollment.status.value,
        "enrolled_at": enrollment.enrolled_at.isoformat(),
    }


@router.post("/{course_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return enroll_user(db, current_user.id, course_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
