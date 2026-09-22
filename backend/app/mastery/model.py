from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.topics.model import Topic
    from app.users.model import User


class TopicMastery(Base):
    __tablename__ = "topic_mastery"
    __table_args__ = (UniqueConstraint("user_id", "topic_id", name="uq_topic_mastery_user_topic"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    mastery: Mapped[float] = mapped_column(Float, nullable=False)
    current_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    practice_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="in_progress", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="topic_mastery_records")
    topic: Mapped["Topic"] = relationship(back_populates="mastery_records")


class PracticeConfiguration(Base):
    __tablename__ = "practice_configurations"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, unique=True)
    questions_per_session: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    starting_level: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    level_1_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level_2_questions: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    level_3_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level_up_mastery: Mapped[float] = mapped_column(Float, default=0.65, nullable=False)
    completion_mastery: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    review_mastery: Mapped[float] = mapped_column(Float, default=0.4, nullable=False)
    max_attempts: Mapped[int | None] = mapped_column(Integer)
    review_limit: Mapped[int | None] = mapped_column(Integer)

    topic: Mapped["Topic"] = relationship(back_populates="practice_configuration")
