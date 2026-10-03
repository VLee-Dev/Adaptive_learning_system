"""Verify admin row exists."""
from sqlalchemy import create_engine, text

from app.config import settings

engine = create_engine(settings.database_url)
with engine.connect() as c:
    rows = c.execute(text("SELECT id, email, role, full_name, is_active FROM users")).fetchall()
    for row in rows:
        print(row)