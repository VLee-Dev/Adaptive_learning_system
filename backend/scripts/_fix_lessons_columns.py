"""manual fix: add name and content to lessons

This is a one-shot script to apply the remaining changes from
e5f6a7b8c9d0_add_user_and_lesson_fields.py that failed during
alembic upgrade. The user columns were already added; lessons
columns are missing.

Usage:
  cd D:\\Code\\Adaptive_learning_system\\backend
  .\\venv\\Scripts\\python.exe -m scripts._fix_lessons_columns
"""
from sqlalchemy import create_engine, text

from app.config import settings

engine = create_engine(settings.database_url)

with engine.begin() as conn:
    # Check if columns already exist
    rows = conn.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='lessons' AND column_name IN ('name','content')
    """)).fetchall()
    existing = {r[0] for r in rows}

    if 'name' not in existing:
        print('Adding lessons.name column...')
        conn.execute(text("""
            ALTER TABLE lessons
            ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Lesson'
        """))
    else:
        print('lessons.name already exists')

    if 'content' not in existing:
        print('Adding lessons.content column...')
        conn.execute(text("""
            ALTER TABLE lessons
            ADD COLUMN content TEXT NOT NULL DEFAULT ''
        """))
    else:
        print('lessons.content already exists')

    # Make content_url nullable (it was NOT NULL originally per init migration)
    print('Making lessons.content_url nullable...')
    conn.execute(text("ALTER TABLE lessons ALTER COLUMN content_url DROP NOT NULL"))

print('Done.')