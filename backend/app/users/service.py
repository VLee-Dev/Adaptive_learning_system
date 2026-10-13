"""Business logic cho User.

B44: Tách logic user ra khỏi auth/service.py.
auth chỉ giữ JWT/credentials (create_access_token, authenticate_user).
User CRUD + profile update → users/service.py.
"""
import bcrypt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.users.model import User, UserRole
from app.auth.schemas import RegisterRequest

# bcrypt has a 72-byte limit; truncate to be safe (per their docs).
_BCRYPT_MAX_BYTES = 72


def _normalize(password: str) -> bytes:
    """Encode password to bytes and truncate to 72 bytes (bcrypt limit)."""
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(_normalize(password), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_normalize(password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_user(db: Session, payload: RegisterRequest) -> User:
    """Tạo user mới. Raise ValueError nếu email đã tồn tại."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise ValueError("Email is already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_profile(
    db: Session,
    user: User,
    full_name: str | None,
    password: str | None,
    current_password: str | None,
) -> User:
    """Cập nhật profile. B47: đổi password phải có current_password hợp lệ."""
    if password is not None:
        if not current_password:
            raise ValueError("current_password is required when changing password")
        if not verify_password(current_password, user.hashed_password):
            raise ValueError("current_password is incorrect")
        user.hashed_password = hash_password(password)
    if full_name is not None:
        user.full_name = full_name
    db.commit()
    db.refresh(user)
    return user
