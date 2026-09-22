from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.attempts.model import Attempt
    from app.completions.model import ChapterCompletion, CourseCompletion
    from app.enrollments.model import CourseEnrollment
    from app.learning_events.model import LearningEvent
    from app.recommendations.model import Recommendation
    from app.mastery.model import TopicMastery


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole, name="user_role", values_callable=lambda enum: [item.value for item in enum]), default=UserRole.STUDENT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    attempts: Mapped[list["Attempt"]] = relationship(back_populates="user")
    learning_events: Mapped[list["LearningEvent"]] = relationship(back_populates="user")
    topic_mastery_records: Mapped[list["TopicMastery"]] = relationship(back_populates="user")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="user")
    enrollments: Mapped[list["CourseEnrollment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chapter_completions: Mapped[list["ChapterCompletion"]] = relationship(back_populates="user")
    course_completions: Mapped[list["CourseCompletion"]] = relationship(back_populates="user")
