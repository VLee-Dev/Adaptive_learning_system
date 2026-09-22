from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.chapters.model import Chapter
    from app.lessons.model import Lesson
    from app.mastery.model import PracticeConfiguration, TopicMastery
    from app.questions.model import Question
    from app.stimuli.model import Stimulus


class TopicType(str, Enum):
    GENERAL = "general"
    GRAMMAR = "grammar"
    LISTENING = "listening"


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("chapter_id", "order_index", name="uq_topics_chapter_order"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[TopicType] = mapped_column(SqlEnum(TopicType, name="topic_type", values_callable=lambda enum: [item.value for item in enum]), default=TopicType.GENERAL, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    p_init: Mapped[float] = mapped_column(Float, default=0.3, nullable=False)
    p_transit: Mapped[float] = mapped_column(Float, default=0.2, nullable=False)
    p_slip: Mapped[float] = mapped_column(Float, default=0.1, nullable=False)
    p_guess: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    chapter: Mapped["Chapter"] = relationship(back_populates="topics")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="topic", cascade="all, delete-orphan", order_by="Lesson.order_index")
    questions: Mapped[list["Question"]] = relationship(back_populates="topic", cascade="all, delete-orphan")
    stimuli: Mapped[list["Stimulus"]] = relationship(back_populates="topic", cascade="all, delete-orphan")
    practice_configuration: Mapped["PracticeConfiguration | None"] = relationship(back_populates="topic", uselist=False, cascade="all, delete-orphan")
    mastery_records: Mapped[list["TopicMastery"]] = relationship(back_populates="topic")
