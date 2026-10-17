from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth.service import JWT_ALGORITHM
from app.config import settings
from core.database import get_db
from app.users.model import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _decode_token(token: str | None) -> int | None:
    """Trả về user_id từ JWT, hoặc None nếu không hợp lệ."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except (JWTError, ValueError):
        return None


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Lấy user nếu token hợp lệ + user còn active, ngược lại trả None.

    Dùng cho endpoint PUBLIC có thể tuỳ biến theo auth
    (vd /courses/:id trả is_enrolled đúng cho student đã đăng nhập).
    """
    user_id = _decode_token(token)
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = _decode_token(token)
    if user_id is None:
        raise credentials_error

    user = db.get(User, user_id)
    if user is None:
        raise credentials_error
    if not user.is_active:
        # Tài khoản đã bị vô hiệu hoá (admin set is_active=False).
        # Coi như 401 để client tự logout và xoá token.
        raise credentials_error
    return user
