"""Per-user statistics for individual questions (used by adaptive selection).

Mỗi dòng theo dõi user đó hay sai câu nào, để hệ thống chọn câu hỏi
"weak-first" (ưu tiên ôn lại đúng chỗ sai) thay vì chỉ dựa vào level.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, utcnow

if TYPE_CHECKING:
    from app.questions.model import Question
    from app.users.model import User


# ===== ĐIỂM YẾU CÓ SUY GIẢM (2026-10-23) =====
# Tỉ lệ sai LŨY KẾA cả lịch sử không bao giờ giảm: một câu user sai 3/5 lần
# sẽ giữ tỉ lệ sai = 0.6 mãi mãi, kể cả sau khi đã ôn lại và làm đúng.
# Máy chọn câu bám theo tỉ lệ sai lũy kếa nên luôn trả lại đúng câu đó →
# vòng lặp ôn không bao giờ thoát (5/18 topic trong DB trước đây bị kẹt ở
# `review_required` với mastery vẫn >= 0.58).
#
# `weakness` thay thế tỉ lệ sai lũy kếa cho mục đích chọn câu: tăng nhanh khi
# sai và suy giảm khi đúng, nên bằng chứng cũ tự mờ đi theo thời gian.
WEAKNESS_INCREMENT = 0.45   # mỗi lần sai: weakness += (1 - weakness) * 0.45
WEAKNESS_DECAY = 0.45       # mỗi lần đúng: weakness *= 0.45


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
    # Điểm yếu hiện hành (0..1) — dùng để chọn câu. Xem WEAKNESS_* ở trên.
    weakness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="question_stats")
    question: Mapped["Question"] = relationship(back_populates="stats")
