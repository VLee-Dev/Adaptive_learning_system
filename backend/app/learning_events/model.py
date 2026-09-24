from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.attempts.model import Attempt
    from app.topics.model import Topic
    from app.users.model import User


class LearningEventType(str, Enum):
    ANSWER = "answer"
    AI_EXPLANATION_SHOWN = "ai_explanation_shown"
    REMEDIAL_TRIGGERED = "remedial_triggered"


class LearningEvent(Base):
    __tablename__ = "learning_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[LearningEventType] = mapped_column(SqlEnum(LearningEventType, name="learning_event_type", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="learning_events")
    attempt: Mapped["Attempt"] = relationship(back_populates="learning_events")
    topic: Mapped["Topic"] = relationship()
