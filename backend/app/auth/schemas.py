from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    role: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    """PATCH /auth/me — update profile.

    B47: nếu đổi password thì bắt buộc gửi kèm `current_password` để xác minh
    danh tính (tránh attacker cướp token rồi đổi password khoá user thật).
    """
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    current_password: str | None = None

    @model_validator(mode="after")
    def check_current_password_when_changing(self):
        if self.password is not None and not self.current_password:
            raise ValueError("current_password is required when changing password")
        return self
