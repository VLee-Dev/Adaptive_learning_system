"""seed_default_admin_account

Revision ID: a1b2c3d4e5f6
Revises: 676fd60e37f4
Create Date: 2026-09-24 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, Enum
import bcrypt


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '676fd60e37f4'
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
        column('is_active', sa.Boolean)
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
                'role': 'ADMIN',
                'full_name': 'System Administrator',
                'is_active': True
            }
        ])
        print("✅ Default admin account created: admin@adaptive.com / Admin@123")
        print("⚠️  CHANGE THIS PASSWORD IN PRODUCTION!")
    else:
        print("ℹ️  Admin account already exists, skipping...")


def downgrade() -> None:
    """Remove default admin account."""
    op.execute(
        sa.text("DELETE FROM users WHERE email = 'admin@adaptive.com'")
    )
    print("🗑️  Default admin account removed")
