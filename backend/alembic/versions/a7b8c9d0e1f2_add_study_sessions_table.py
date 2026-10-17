"""add study_sessions table for tracking real study time

Revision ID: a7b8c9d0e1f2
Revises: c1cc3590dc34
Create Date: 2026-10-17 15:50:00.000000

Bảng study_sessions lưu các phiên học thực tế:
- Mỗi lần user mở trang practice/chapter-test → tạo 1 row (started_at)
- Khi submit answer, chuyển tab, đóng tab, hoặc idle > 10 phút → update ended_at + duration_seconds
- Calendar "Lịch học" group theo local date, sum duration_seconds, nếu ≥ 60s → tích chân mèo

Cấu trúc:
- kind: 'practice' | 'chapter_test' — loại phiên học
- reference_id: topic_id hoặc chapter_id
- duration_seconds: tổng thời gian học (giây)
- started_at, ended_at: timestamp UTC

Auto-stop phía server: nếu session > 4 giờ không cập nhật → coi như abandoned.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'c1cc3590dc34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'study_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_study_sessions_user_started',
        'study_sessions',
        ['user_id', 'started_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_study_sessions_user_started', table_name='study_sessions')
    op.drop_table('study_sessions')
