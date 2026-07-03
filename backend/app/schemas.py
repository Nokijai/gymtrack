from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    xp: int
    level: int
    current_streak: int
    longest_streak: int
    is_admin: bool = False

    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    username: str
    xp: int
    level: int
    current_streak: int
    longest_streak: int
    total_sessions: int
    total_minutes: int
    member_since: str
    is_admin: bool

    class Config:
        from_attributes = True


class ChangeMyPasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ExerciseCreate(BaseModel):
    name: str
    sets: int
    reps: int
    weight_kg: Optional[float] = None


class SessionCreate(BaseModel):
    date: str  # YYYY-MM-DD
    duration_minutes: int
    notes: Optional[str] = None
    exercises: list[ExerciseCreate] = []


class ExerciseResponse(BaseModel):
    id: int
    name: str
    sets: int
    reps: int
    weight_kg: Optional[float] = None

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: int
    user_id: int
    date: str
    duration_minutes: int
    notes: Optional[str] = None
    exercises: list[ExerciseResponse] = []

    class Config:
        from_attributes = True


class SessionDetailResponse(BaseModel):
    id: int
    date: str
    duration_minutes: int
    xp_earned: int
    exercises: list[ExerciseResponse] = []

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_sessions: int
    total_time_minutes: int
    xp: int
    level: int
    current_streak: int
    longest_streak: int
    weekly_chart: list[dict]


class LeaderboardUser(BaseModel):
    username: str
    total_xp: int
    level: int
    weekly_sessions: int
    monthly_sessions: int
    current_streak: int
    longest_streak: int
