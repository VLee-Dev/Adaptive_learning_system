"""Manual stamp: write e5f6a7b8c9d0 into alembic_version."""
from sqlalchemy import create_engine, text

from app.config import settings

engine = create_engine(settings.database_url)
with engine.begin() as conn:
    # Check current
    cur = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
    print(f"Current: {cur[0] if cur else None}")

    # Update to e5f6a7b8c9d0
    conn.execute(text("UPDATE alembic_version SET version_num='e5f6a7b8c9d0_add_user_and_lesson_fields'"))
    print("Updated to e5f6a7b8c9d0_add_user_and_lesson_fields")