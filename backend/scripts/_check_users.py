from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.database_url)
with engine.connect() as c:
    rows = c.execute(text("""
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name='users'
        ORDER BY ordinal_position
    """)).fetchall()
    for row in rows:
        print(row)