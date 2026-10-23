"""Per-user statistics for individual questions (used by adaptive selection - C2).

Mỗi dòng theo dõi user đó hay sai câu nào, để hệ thống chọn câu hỏi
"weak-first" (ưu tiên ôn lại đúng chỗ sai) thay vì chỉ dựa vào level.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, utcnow

if TYPE_CHECKING:
    from app.questions.model import Question
    from app.users.model import User


class QuestionStat(Base):
    """Thống kê tổng hợp của 1 user với 1 câu hỏi cụ thể."""

    __tablename__ = "question_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_question_stats_user_question"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_wrong_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="question_stats")
    question: Mapped["Question"] = relationship(back_populates="stats")

    @property
    def wrong_rate(self) -> float:
        """Tỉ lệ sai (0..1). Trả 0 nếu chưa làm câu này."""
        if self.attempts <= 0:
            return 0.0
        return self.wrong / self.attempts
