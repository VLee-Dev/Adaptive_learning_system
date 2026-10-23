from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, utcnow

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

    # --- Bằng chứng tích lũy (A2) ---
    # BKT là ước lượng xác suất; nó KHÔNG nói được user đã làm bao nhiêu câu,
    # sai bao nhiêu, hay đang sai liên tiếp. Các cột này bổ sung phần "bằng
    # chứng" để quyết định level / completed / review_required có căn cứ.
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consecutive_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consecutive_wrong: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recent_accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # --- Vòng lặp ôn lại (B3) ---
    # review_triggered_at: lúc user lần đầu bị đưa vào review_required.
    # lesson_viewed_at: lần cuối user mở bài giảng của topic.
    # review_resolved_at: lúc user thoát khỏi trạng thái review_required.
    # Điều kiện thoát = lesson_viewed_at >= review_triggered_at
    # (phải xem bài giảng SAU khi bị yêu cầu ôn lại, không phải xem từ trước).
    review_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    lesson_viewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="topic_mastery_records")
    topic: Mapped["Topic"] = relationship(back_populates="mastery_records")


# NOTE: PracticeConfiguration đã bị xoá (cleanup B1+B8).
# Lý do: BKT thresholds + level config hardcode trong `mastery/service.py` cho
# gọn, dễ tìm ngưỡng ổn. Sau này nếu cần per-topic config, sẽ tạo lại bảng mới
# với schema phù hợp.
