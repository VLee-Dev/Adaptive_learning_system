"""Auth-specific logic: JWT + authentication only.

B44: Tách logic User (create, update profile, hash password) sang
`app/users/service.py`. Auth chỉ giữ xác thực (verify password + tạo JWT).
"""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.users.model import User
from app.users.service import hash_password as _hash, verify_password

# Re-export để giữ backward-compat với code đã import từ app.auth.service
hash_password = _hash

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(user_id: int, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)
