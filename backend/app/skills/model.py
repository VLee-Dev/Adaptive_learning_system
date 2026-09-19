from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, Enum as SqlEnum, Float, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.attempts.model import Attempt
    from app.lessons.model import Lesson
    from app.mastery.model import StudentSkillMastery
    from app.questions.model import Question
    from app.recommendations.model import Recommendation
    from app.skill_test_results.model import SkillTestResult
    from app.stimuli.model import Stimulus


class SkillType(str, Enum):
    GRAMMAR = "grammar"
    LISTENING = "listening"


skill_prerequisites = Table(
    "skill_prerequisites",
    Base.metadata,
    Column("skill_id", ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
    Column("prerequisite_skill_id", ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[SkillType] = mapped_column(SqlEnum(SkillType, name="skill_type", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    p_init: Mapped[float] = mapped_column(Float, default=0.3, nullable=False)
    p_transit: Mapped[float] = mapped_column(Float, default=0.2, nullable=False)
    p_slip: Mapped[float] = mapped_column(Float, default=0.1, nullable=False)
    p_guess: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    prerequisites: Mapped[list["Skill"]] = relationship(
        secondary=skill_prerequisites,
        primaryjoin=id == skill_prerequisites.c.skill_id,
        secondaryjoin=id == skill_prerequisites.c.prerequisite_skill_id,
        back_populates="dependents",
    )
    dependents: Mapped[list["Skill"]] = relationship(
        secondary=skill_prerequisites,
        primaryjoin=id == skill_prerequisites.c.prerequisite_skill_id,
        secondaryjoin=id == skill_prerequisites.c.skill_id,
        back_populates="prerequisites",
    )
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="skill", cascade="all, delete-orphan")
    stimuli: Mapped[list["Stimulus"]] = relationship(back_populates="skill", cascade="all, delete-orphan")
    questions: Mapped[list["Question"]] = relationship(back_populates="skill", cascade="all, delete-orphan")
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="skill")
    mastery_records: Mapped[list["StudentSkillMastery"]] = relationship(back_populates="skill")
    test_results: Mapped[list["SkillTestResult"]] = relationship(back_populates="skill")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="recommended_skill")
