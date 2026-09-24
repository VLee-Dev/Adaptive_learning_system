from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.chapters.model import Chapter
    from app.courses.model import Course
    from app.users.model import User


class ChapterCompletion(Base):
    __tablename__ = "chapter_completions"
    __table_args__ = (UniqueConstraint("user_id", "chapter_id", name="uq_chapter_completions_user_chapter"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    test_score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="chapter_completions")
    chapter: Mapped["Chapter"] = relationship(back_populates="completions")


class CourseCompletion(Base):
    __tablename__ = "course_completions"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_course_completions_user_course"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="course_completions")
    course: Mapped["Course"] = relationship()
