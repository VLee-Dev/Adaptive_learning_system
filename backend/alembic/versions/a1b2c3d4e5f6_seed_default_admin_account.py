"""seed_default_admin_account

Revision ID: a1b2c3d4e5f6
Revises: e5f6a7b8c9d0
Create Date: 2026-09-24 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, Enum
from datetime import datetime
import bcrypt


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e5f6a7b8c9d0_add_user_and_lesson_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def upgrade() -> None:
    """Create default admin account."""
    # Define users table structure for data insertion
    users = table('users',
        column('email', String),
        column('hashed_password', String),
        column('role', String),
        column('full_name', String),
        column('is_active', sa.Boolean),
        column('created_at', sa.DateTime),
    )

    # Check if admin already exists
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT COUNT(*) FROM users WHERE email = 'admin@adaptive.com'")
    ).scalar()

    if result == 0:
        # Insert default admin account
        op.bulk_insert(users, [
            {
                'email': 'admin@adaptive.com',
                'hashed_password': hash_password('Admin@123'),
                'role': 'admin',
                'full_name': 'System Administrator',
                'is_active': True,
                'created_at': datetime.utcnow(),
            }
        ])
        print("Default admin account created: admin@adaptive.com / Admin@123")
        print("CHANGE THIS PASSWORD IN PRODUCTION!")
    else:
        print("Admin account already exists, skipping...")


def downgrade() -> None:
    """Remove default admin account."""
    op.execute(
        sa.text("DELETE FROM users WHERE email = 'admin@adaptive.com'")
    )
    print("Default admin account removed")
