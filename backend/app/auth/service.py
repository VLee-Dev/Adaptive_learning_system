from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.schemas import RegisterRequest
from app.config import settings
from app.users.model import User, UserRole

# Note: passlib is incompatible with bcrypt>=4.x due to missing __about__ attr.
# We use the `bcrypt` package directly for hashing/verifying passwords.
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60

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


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(user_id: int, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def update_user_profile(db: Session, user: User, full_name: str | None, password: str | None) -> User:
    if full_name is not None:
        user.full_name = full_name
    if password is not None:
        user.hashed_password = hash_password(password)
    db.commit()
    db.refresh(user)
    return user
