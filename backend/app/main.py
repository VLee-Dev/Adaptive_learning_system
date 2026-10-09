from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import re

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


app = FastAPI(title="Adaptive Learning System")

# Allow any localhost / 127.0.0.1 port during development.
# Vite picks the next free port (5173, 5174, 5175...) if the default is busy,
# so we accept any port from those hosts.
# CORSMiddleware in starlette >=0.30 supports `allow_origin_regex` directly,
# which is the cleanest way to do this.
# In production, restrict this to the real frontend domain.

app.add_middleware(
    CORSMiddleware,
    # allow_origin_regex is matched against the Origin header.
    # ^https?://(localhost|127\.0\.0\.1)(:\d+)?$ matches any port.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(content_router)
app.include_router(enrollment_router)
app.include_router(learning_router)