"""add full_name to users and name/content to lessons

Revision ID: e5f6a7b8c9d0_add_user_and_lesson_fields
Revises: a1b2c3d4e5f6
Create Date: 2026-09-29 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0_add_user_and_lesson_fields'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add full_name and is_active to users
    op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))

    # Add name and content to lessons, make content_url nullable
    op.add_column('lessons', sa.Column('name', sa.String(length=255), nullable=False, server_default='Lesson'))
    op.add_column('lessons', sa.Column('content', sa.Text(), nullable=False, server_default=''))
    op.alter_column('lessons', 'content_url', nullable=True)


def downgrade() -> None:
    op.drop_column('lessons', 'content')
    op.drop_column('lessons', 'name')
    op.alter_column('lessons', 'content_url', nullable=False)
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'full_name')
