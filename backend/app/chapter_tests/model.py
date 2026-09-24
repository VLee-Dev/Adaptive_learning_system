from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from app.chapters.model import Chapter
    from app.questions.model import Question

chapter_test_pool_questions = Table(
    "chapter_test_pool_questions",
    Base.metadata,
    Column("pool_id", ForeignKey("chapter_test_pools.id", ondelete="CASCADE"), primary_key=True),
    Column("question_id", ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
)

chapter_test_slot_pools = Table(
    "chapter_test_slot_pools",
    Base.metadata,
    Column("slot_id", ForeignKey("chapter_test_slots.id", ondelete="CASCADE"), primary_key=True),
    Column("pool_id", ForeignKey("chapter_test_pools.id", ondelete="CASCADE"), primary_key=True),
)


class ChapterFinalTest(Base):
    __tablename__ = "chapter_final_tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, unique=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    pass_percent: Mapped[float] = mapped_column(Float, default=70.0, nullable=False)
    max_attempts: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    chapter: Mapped["Chapter"] = relationship(back_populates="final_test")
    slots: Mapped[list["ChapterTestSlot"]] = relationship(back_populates="test", cascade="all, delete-orphan", order_by="ChapterTestSlot.slot_index")
    pools: Mapped[list["ChapterTestPool"]] = relationship(back_populates="test", cascade="all, delete-orphan")


class ChapterTestPool(Base):
    __tablename__ = "chapter_test_pools"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("chapter_final_tests.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    test: Mapped["ChapterFinalTest"] = relationship(back_populates="pools")
    questions: Mapped[list["Question"]] = relationship(secondary=chapter_test_pool_questions, back_populates="chapter_test_pools")
    slots: Mapped[list["ChapterTestSlot"]] = relationship(secondary=chapter_test_slot_pools, back_populates="pools")


class ChapterTestSlot(Base):
    __tablename__ = "chapter_test_slots"
    __table_args__ = (UniqueConstraint("test_id", "slot_index", name="uq_chapter_test_slots_test_order"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("chapter_final_tests.id", ondelete="CASCADE"), nullable=False)
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    test: Mapped["ChapterFinalTest"] = relationship(back_populates="slots")
    pools: Mapped[list["ChapterTestPool"]] = relationship(secondary=chapter_test_slot_pools, back_populates="slots")
