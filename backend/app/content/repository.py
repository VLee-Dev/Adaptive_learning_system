from sqlalchemy import select
from sqlalchemy.orm import Session

from app.courses.model import Course


def list_published_courses(db: Session) -> list[Course]:
    return list(db.scalars(select(Course).where(Course.is_published.is_(True)).order_by(Course.created_at, Course.id)).all())
