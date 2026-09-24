from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.admin.router import router as admin_router
from app.content.router import router as content_router
from app.enrollments.router import router as enrollment_router
from app.learning.router import router as learning_router


app = FastAPI(title="Adaptive Learning System")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(content_router)
app.include_router(enrollment_router)
app.include_router(learning_router)
