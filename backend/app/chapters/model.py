from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.chapter_tests.model import ChapterFinalTest
    from app.completions.model import ChapterCompletion
    from app.courses.model import Course
    from app.topics.model import Topic


class Chapter(Base):
    __tablename__ = "chapters"
    __table_args__ = (UniqueConstraint("course_id", "order_index", name="uq_chapters_course_order"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    course: Mapped["Course"] = relationship(back_populates="chapters")
    topics: Mapped[list["Topic"]] = relationship(back_populates="chapter", cascade="all, delete-orphan", order_by="Topic.order_index")
    final_test: Mapped["ChapterFinalTest | None"] = relationship(back_populates="chapter", uselist=False, cascade="all, delete-orphan")
    completions: Mapped[list["ChapterCompletion"]] = relationship(back_populates="chapter")
