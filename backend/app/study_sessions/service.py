"""Service layer for study sessions."""
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy.orm import Session

from app.study_sessions.model import StudySession
from app.study_sessions.repository import (
    auto_abandon_stale,
    close_session,
    create_session,
    update_duration,
)


def start_session(
    db: Session,
    user_id: int,
    kind: str,
    reference_id: int | None = None,
) -> StudySession:
    """Bắt đầu 1 phiên học mới. Auto-abandon các session cũ trước."""
    auto_abandon_stale(db, user_id)
    return create_session(db, user_id, kind, datetime.utcnow(), reference_id)


def heartbeat(
    db: Session,
    session_id: int,
    user_id: int,
    duration_seconds: int,
) -> StudySession | None:
    """FE gọi mỗi 30s để cập nhật thời lượng thực tế."""
    return update_duration(db, session_id, user_id, duration_seconds)


def stop_session(
    db: Session,
    session_id: int,
    user_id: int,
) -> StudySession | None:
    """Kết thúc phiên học (submit answer, chuyển tab, đóng tab, idle)."""
    return close_session(db, session_id, user_id, datetime.utcnow())


def _utc_to_local_date_key(dt_utc_naive: datetime, tz_offset_minutes: int) -> str:
    """Convert naive UTC datetime → 'YYYY-MM-DD' theo local timezone."""
    local_tz = timezone(timedelta(minutes=-tz_offset_minutes))
    local_dt = dt_utc_naive.replace(tzinfo=timezone.utc).astimezone(local_tz)
    return local_dt.strftime("%Y-%m-%d")


def get_minutes_per_day(
    db: Session,
    user_id: int,
    year: int,
    month: int,
    tz_offset_minutes: int,
) -> dict[str, int]:
    """Trả về dict { 'YYYY-MM-DD': minutes } cho calendar.

    Tính theo duration_seconds đã lưu trong study_sessions. Quy ước
    "≥ 1 phút = có học" sẽ do FE xử lý (nếu calendar cần boolean);
    trả về phút để FE tự quyết.
    """
    import calendar as cal

    local_tz = timezone(timedelta(minutes=-tz_offset_minutes))
    start_local = datetime(year, month, 1, 0, 0, 0, tzinfo=local_tz)
    days_in_month = cal.monthrange(year, month)[1]
    if month == 12:
        end_local = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=local_tz)
    else:
        end_local = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=local_tz)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)

    sessions: Iterable[StudySession] = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == user_id,
            StudySession.duration_seconds > 0,
            StudySession.started_at >= start_utc,
            StudySession.started_at < end_utc,
        )
        .all()
    )

    seconds_per_day: dict[str, int] = {}
    for s in sessions:
        key = _utc_to_local_date_key(s.started_at, tz_offset_minutes)
        seconds_per_day[key] = seconds_per_day.get(key, 0) + s.duration_seconds

    # Trả về phút (làm tròn xuống)
    return {k: v // 60 for k, v in seconds_per_day.items()}
