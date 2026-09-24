from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.questions.model import Question
    from app.topics.model import Topic


class StimulusType(str, Enum):
    TEXT_PASSAGE = "text_passage"
    IMAGE = "image"
    AUDIO = "audio"


class Stimulus(Base):
    __tablename__ = "stimuli"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[StimulusType] = mapped_column(SqlEnum(StimulusType, name="stimulus_type", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    topic: Mapped["Topic"] = relationship(back_populates="stimuli")
    questions: Mapped[list["Question"]] = relationship(back_populates="stimulus")
