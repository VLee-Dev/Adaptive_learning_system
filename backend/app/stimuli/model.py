from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.questions.model import Question
    from app.skills.model import Skill


class StimulusType(str, Enum):
    TEXT_PASSAGE = "text_passage"
    IMAGE = "image"
    AUDIO = "audio"


class Stimulus(Base):
    __tablename__ = "stimuli"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[StimulusType] = mapped_column(SqlEnum(StimulusType, name="stimulus_type", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    skill: Mapped["Skill"] = relationship(back_populates="stimuli")
    questions: Mapped[list["Question"]] = relationship(back_populates="stimulus")
