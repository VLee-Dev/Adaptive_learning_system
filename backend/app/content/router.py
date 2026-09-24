from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.content.schemas import CourseSummary
from app.content.service import get_public_courses
from core.database import get_db

router = APIRouter(tags=["content"])


@router.get("/courses", response_model=list[CourseSummary])
def list_courses(db: Session = Depends(get_db)):
    return get_public_courses(db)
