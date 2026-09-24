from sqlalchemy.orm import Session

from app.content.repository import list_published_courses


def get_public_courses(db: Session):
    return list_published_courses(db)
