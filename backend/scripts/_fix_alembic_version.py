"""Fix alembic_version.version_num column length."""
from sqlalchemy import create_engine, text

from app.config import settings

engine = create_engine(settings.database_url)
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)"))
    print("Altered alembic_version.version_num to VARCHAR(255)")