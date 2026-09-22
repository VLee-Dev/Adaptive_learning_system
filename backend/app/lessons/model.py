from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.topics.model import Topic


class LessonContentType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    TEXT = "text"


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    content_type: Mapped[LessonContentType] = mapped_column(SqlEnum(LessonContentType, name="lesson_content_type", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    content_url: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    topic: Mapped["Topic"] = relationship(back_populates="lessons")
