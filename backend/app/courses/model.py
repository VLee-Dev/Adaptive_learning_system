from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.chapters.model import Chapter
    from app.enrollments.model import CourseEnrollment


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="course", cascade="all, delete-orphan", order_by="Chapter.order_index")
    enrollments: Mapped[list["CourseEnrollment"]] = relationship(back_populates="course", cascade="all, delete-orphan")
