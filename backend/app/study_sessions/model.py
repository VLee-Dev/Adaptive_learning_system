"""Model for study sessions - tracks real study time per user."""
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.users.model import User


class StudySessionKind(str, Enum):
    PRACTICE = "practice"
    CHAPTER_TEST = "chapter_test"


class StudySession(Base):
    """Một phiên học thực tế: user mở trang practice/chapter-test → tạo row,
    kết thúc khi submit answer / chuyển tab / đóng tab / idle quá lâu.

    Frontend gửi heartbeat mỗi 30s để cập nhật duration_seconds tăng dần.
    """

    __tablename__ = "study_sessions"
    __table_args__ = (
        Index("ix_study_sessions_user_started", "user_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user: Mapped["User"] = relationship()
