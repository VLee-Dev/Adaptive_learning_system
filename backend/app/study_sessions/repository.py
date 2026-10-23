"""Repository for study sessions."""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.study_sessions.model import StudySession


# Sau 4 giờ không heartbeat → coi như abandoned, server tự đóng
ABANDON_AFTER_SECONDS = 4 * 60 * 60


def _as_utc_aware(value: datetime) -> datetime:
    """Chuẩn hóa datetime về UTC-aware.

    Cột `started_at`/`ended_at` là DateTime(timezone=True) nên đọc từ Postgres
    trả về datetime có tzinfo. Dữ liệu lưu từ client có thể là naive — coi như UTC.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def create_session(
    db: Session,
    user_id: int,
    kind: str,
    started_at: datetime,
    reference_id: int | None = None,
) -> StudySession:
    """Tạo session mới. `started_at` được chuẩn hóa về UTC-aware trước khi ghi."""
    obj = StudySession(
        user_id=user_id,
        kind=kind,
        reference_id=reference_id,
        started_at=_as_utc_aware(started_at),
        duration_seconds=0,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_duration(
    db: Session,
    session_id: int,
    user_id: int,
    duration_seconds: int,
) -> StudySession | None:
    """Heartbeat: cập nhật duration_seconds. Trả None nếu không tìm thấy."""
    obj = (
        db.query(StudySession)
        .filter(StudySession.id == session_id, StudySession.user_id == user_id)
        .first()
    )
    if obj is None:
        return None
    # Server-side cap: không cho duration_seconds tăng quá nhanh
    # Tối đa = thời gian thực tế từ started_at đến now
    now = datetime.now(timezone.utc)
    elapsed = int((now - _as_utc_aware(obj.started_at)).total_seconds())
    capped = min(max(duration_seconds, 0), max(elapsed, 0))
    obj.duration_seconds = capped
    db.commit()
    db.refresh(obj)
    return obj


def close_session(
    db: Session,
    session_id: int,
    user_id: int,
    ended_at: datetime | None = None,
) -> StudySession | None:
    """Đóng session: set ended_at + cap duration_seconds."""
    obj = (
        db.query(StudySession)
        .filter(StudySession.id == session_id, StudySession.user_id == user_id)
        .first()
    )
    if obj is None:
        return None
    if obj.ended_at is not None:
        # Đã đóng rồi
        return obj
    now = _as_utc_aware(ended_at) if ended_at else datetime.now(timezone.utc)
    started_at = _as_utc_aware(obj.started_at)
    obj.ended_at = now
    elapsed = int((now - started_at).total_seconds())
    obj.duration_seconds = max(obj.duration_seconds, min(elapsed, ABANDON_AFTER_SECONDS))
    db.commit()
    db.refresh(obj)
    return obj


def auto_abandon_stale(db: Session, user_id: int) -> int:
    """Tự đóng các session quá cũ (> 4h) chưa có ended_at. Trả số row đã đóng."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ABANDON_AFTER_SECONDS)
    stale = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == user_id,
            StudySession.ended_at.is_(None),
            StudySession.started_at < cutoff,
        )
        .all()
    )
    for s in stale:
        s.ended_at = cutoff
        elapsed = int((cutoff - _as_utc_aware(s.started_at)).total_seconds())
        s.duration_seconds = max(s.duration_seconds, min(elapsed, ABANDON_AFTER_SECONDS))
    db.commit()
    return len(stale)


def get_open_sessions(db: Session, user_id: int) -> list[StudySession]:
    """Lấy các session chưa ended (debug, không dùng production)."""
    return (
        db.query(StudySession)
        .filter(StudySession.user_id == user_id, StudySession.ended_at.is_(None))
        .all()
    )
