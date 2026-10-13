"""Local file upload helpers.

Admin endpoints can POST a `multipart/form-data` file here and receive a public
URL pointing to the same FastAPI app (``/static/uploads/<file>``).
"""

from __future__ import annotations

import os
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.admin.dependencies import require_admin
from app.users.model import User

# Resolve to <repo>/backend/static/uploads regardless of where uvicorn is started.
_STATIC_DIR = Path(__file__).resolve().parents[2] / "static"
_UPLOAD_DIR = _STATIC_DIR / "uploads"

# Cap uploads at 5 MB. Ảnh bìa khóa học không cần lớn hơn.
MAX_BYTES = 5 * 1024 * 1024

# Allow only common image mime types so we don't host arbitrary blobs.
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

router = APIRouter(tags=["uploads"])


def _ensure_upload_dir() -> None:
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> dict[str, str]:
    """Save an uploaded image to ``static/uploads`` and return its public URL."""

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Allowed: images only.",
        )

    _ensure_upload_dir()

    # Read the entire body (capped) so we can both enforce size and write atomically.
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (>{MAX_BYTES // (1024 * 1024)} MB).",
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file.",
        )

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    # Random filename so users can re-upload without colliding.
    safe_name = f"{secrets.token_urlsafe(16)}{extension}"
    target_path = _UPLOAD_DIR / safe_name

    # Avoid clobbering an existing file (extremely unlikely with 16-byte token).
    counter = 0
    while target_path.exists():
        counter += 1
        target_path = _UPLOAD_DIR / f"{secrets.token_urlsafe(16)}_{counter}{extension}"

    with open(target_path, "wb") as fh:
        fh.write(contents)

    public_url = f"/static/uploads/{target_path.name}"
    return {
        "url": public_url,
        "filename": target_path.name,
        "size": str(len(contents)),
    }
