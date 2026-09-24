"""Repository for completion records."""
from sqlalchemy.orm import Session

from app.completions.model import ChapterCompletion, CourseCompletion


def get_chapter_completion(db: Session, user_id: int, chapter_id: int) -> ChapterCompletion | None:
    """Get chapter completion record."""
    return db.query(ChapterCompletion).filter(
        ChapterCompletion.user_id == user_id,
        ChapterCompletion.chapter_id == chapter_id
    ).first()


def create_chapter_completion(db: Session, completion: ChapterCompletion) -> ChapterCompletion:
    """Create chapter completion record."""
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


def get_course_completion(db: Session, user_id: int, course_id: int) -> CourseCompletion | None:
    """Get course completion record."""
    return db.query(CourseCompletion).filter(
        CourseCompletion.user_id == user_id,
        CourseCompletion.course_id == course_id
    ).first()


def create_course_completion(db: Session, completion: CourseCompletion) -> CourseCompletion:
    """Create course completion record."""
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


def get_completed_chapters_count(db: Session, user_id: int, course_id: int) -> int:
    """Count completed chapters for a course."""
    from app.chapters.model import Chapter

    return db.query(ChapterCompletion).join(
        Chapter, ChapterCompletion.chapter_id == Chapter.id
    ).filter(
        ChapterCompletion.user_id == user_id,
        Chapter.course_id == course_id
    ).count()
