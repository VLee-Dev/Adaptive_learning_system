from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.enrollments.model import EnrollmentStatus


class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    status: EnrollmentStatus
    enrolled_at: datetime
    completed_at: datetime | None
