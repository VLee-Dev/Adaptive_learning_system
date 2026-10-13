from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# IMPORTANT: import model_registry FIRST so all model classes are declared
# before any router triggers mapper configuration. SQLAlchemy needs every
# class referenced in a relationship (e.g. User -> LearningEvent) to be
# present in the class registry when the mapper is initialized.
from app import model_registry  # noqa: F401

from app.auth.router import router as auth_router
from app.admin.router import router as admin_router
from app.content.router import router as content_router
from app.enrollments.router import router as enrollment_router
from app.learning.router import router as learning_router
from app.uploads.router import router as uploads_router


app = FastAPI(title="Adaptive Learning System")

# CORS không cần nữa: Vite dev server proxy /api/* sang backend (cùng origin
# với browser). Khi deploy production, Nginx/Reverse proxy cũng route /api
# về backend, browser chỉ thấy một domain.

# Serve uploaded images (course covers, …) from <repo>/backend/static/uploads.
_STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
_STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(content_router)
app.include_router(enrollment_router)
app.include_router(learning_router)
# Upload endpoint lives outside /api prefix on purpose so the public URL
# (`/static/uploads/...`) stays consistent regardless of the proxy.
app.include_router(uploads_router)
