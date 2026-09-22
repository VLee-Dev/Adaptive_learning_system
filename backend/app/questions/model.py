from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.attempts.model import Attempt
    from app.chapter_tests.model import ChapterTestPool
    from app.recommendations.model import Recommendation
    from app.stimuli.model import Stimulus
    from app.topics.model import Topic


class QuestionPurpose(str, Enum):
    PRACTICE = "practice"
    CHAPTER_FINAL = "chapter_final"


class QuestionFormat(str, Enum):
    STANDARD = "standard"
    FILL_BLANK = "fill_blank"
    LISTENING = "listening"
    READING = "reading"
    IMAGE = "image"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    stimulus_id: Mapped[int | None] = mapped_column(ForeignKey("stimuli.id", ondelete="SET NULL"))
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    purpose: Mapped[QuestionPurpose] = mapped_column(SqlEnum(QuestionPurpose, name="question_purpose", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    question_format: Mapped[QuestionFormat] = mapped_column(SqlEnum(QuestionFormat, name="question_format", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text)
    level: Mapped[int | None] = mapped_column(Integer)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    source_attempt_id: Mapped[int | None] = mapped_column(ForeignKey("attempts.id", ondelete="SET NULL", use_alter=True, name="fk_questions_source_attempt_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    stimulus: Mapped["Stimulus | None"] = relationship(back_populates="questions")
    topic: Mapped["Topic"] = relationship(back_populates="questions")
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="question", foreign_keys="Attempt.question_id")
    source_attempt: Mapped["Attempt | None"] = relationship(foreign_keys=[source_attempt_id], post_update=True)
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="recommended_question")
    chapter_test_pools: Mapped[list["ChapterTestPool"]] = relationship(secondary="chapter_test_pool_questions", back_populates="questions")
