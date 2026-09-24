from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from core.database import get_db
from app.enrollments.schemas import EnrollmentResponse
from app.enrollments.service import enroll_user
from app.users.model import User

router = APIRouter(prefix="/courses", tags=["enrollments"])


@router.post("/{course_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return enroll_user(db, current_user.id, course_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
