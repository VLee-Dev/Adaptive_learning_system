from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
	CORSMiddleware,
	# Allow both 127.0.0.1 and localhost so dev works regardless of which the
	# browser uses. In production, restrict to the real frontend domain.
	allow_origins=[
		"http://localhost:5173",
		"http://127.0.0.1:5173",
	],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(content_router)
app.include_router(enrollment_router)
app.include_router(learning_router)
