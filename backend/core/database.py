from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """UTC-aware 'now' cho các cột TIMESTAMPTZ.

    KHÔNG dùng `datetime.utcnow()`: hàm đó trả về datetime naive (không tzinfo).
    Khi ghi naive vào cột TIMESTAMPTZ, PostgreSQL hiểu nó là giờ theo `TimeZone`
    của server (ở đây là Asia/Bangkok, UTC+7) → dữ liệu lệch 7 tiếng, và khi
    đọc lại sẽ là datetime aware khiến phép trừ naive - aware ném TypeError.

    Hàm này trả về datetime có tzinfo=UTC nên mọi phép so sánh/arithmetic đều đúng.
    """
    return datetime.now(timezone.utc)


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
