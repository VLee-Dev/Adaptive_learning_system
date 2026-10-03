"""Manual fix: add full_name and is_active to users."""
from sqlalchemy import create_engine, text

from app.config import settings

engine = create_engine(settings.database_url)
with engine.begin() as conn:
    rows = conn.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='users' AND column_name IN ('full_name','is_active')
    """)).fetchall()
    existing = {r[0] for r in rows}

    if 'full_name' not in existing:
        print('Adding users.full_name...')
        conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(255)"))
    else:
        print('users.full_name already exists')

    if 'is_active' not in existing:
        print('Adding users.is_active...')
        conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true"))
    else:
        print('users.is_active already exists')

print('Done.')