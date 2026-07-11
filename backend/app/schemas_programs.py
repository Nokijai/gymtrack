"""Pydantic schemas for Program Builder & Training Calendar features."""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# === Workout Templates ===

class TemplateExerciseBase(BaseModel):
    """Exercise within a workout template."""
    exercise_name: str = Field(..., min_length=1, max_length=200)
    exercise_name_cn: Optional[str] = Field(None, max_length=200)
    day_of_week: int = Field(default=0, ge=0, le=6)  # 0=Monday
    sort_order: int = Field(default=0, ge=0)
    target_sets: int = Field(default=3, ge=1, le=20)
    target_reps: str = Field(default="8-12", max_length=50)
    target_rpe: Optional[str] = Field(None, max_length=10)
    rest_seconds: int = Field(default=90, ge=0, le=600)
    is_warmup: bool = Field(default=False)
    notes: Optional[str] = Field(None, max_length=500)


class TemplateExerciseCreate(TemplateExerciseBase):
    """Schema for creating a template exercise."""
    pass


class TemplateExerciseUpdate(BaseModel):
    """Schema for updating a template exercise."""
    exercise_name: Optional[str] = Field(None, min_length=1, max_length=200)
    exercise_name_cn: Optional[str] = Field(None, max_length=200)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    sort_order: Optional[int] = Field(None, ge=0)
    target_sets: Optional[int] = Field(None, ge=1, le=20)
    target_reps: Optional[str] = Field(None, max_length=50)
    target_rpe: Optional[str] = Field(None, max_length=10)
    rest_seconds: Optional[int] = Field(None, ge=0, le=600)
    is_warmup: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)


class TemplateExerciseResponse(TemplateExerciseBase):
    """Schema for template exercise response."""
    id: int
    template_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkoutTemplateBase(BaseModel):
    """Base schema for workout templates."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    split_type: Optional[str] = Field(None, max_length=50)
    days_per_week: int = Field(default=4, ge=1, le=7)
    duration_weeks: int = Field(default=12, ge=1, le=52)
    is_public: bool = Field(default=False)


class WorkoutTemplateCreate(WorkoutTemplateBase):
    """Schema for creating a workout template."""
    exercises: List[TemplateExerciseCreate] = Field(default_factory=list)


class WorkoutTemplateUpdate(BaseModel):
    """Schema for updating a workout template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    split_type: Optional[str] = Field(None, max_length=50)
    days_per_week: Optional[int] = Field(None, ge=1, le=7)
    duration_weeks: Optional[int] = Field(None, ge=1, le=52)
    is_public: Optional[bool] = None
    exercises: Optional[List[TemplateExerciseCreate]] = None


class WorkoutTemplateResponse(WorkoutTemplateBase):
    """Schema for workout template response."""
    id: int
    user_id: int
    is_active: bool
    exercises: List[TemplateExerciseResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkoutTemplateList(BaseModel):
    """Schema for listing workout templates."""
    templates: List[WorkoutTemplateResponse]
    total: int


# === Training Programs ===

class ProgramWorkoutBase(BaseModel):
    """Workout scheduled in a program."""
    scheduled_date: date
    workout_template_id: Optional[int] = None
    is_rest_day: bool = Field(default=False)
    notes: Optional[str] = Field(None, max_length=500)


class ProgramWorkoutCreate(ProgramWorkoutBase):
    """Schema for creating a program workout."""
    day_number: int = Field(default=1, ge=1, le=7)


class ProgramWorkoutUpdate(BaseModel):
    """Schema for updating a program workout."""
    scheduled_date: Optional[date] = None
    workout_template_id: Optional[int] = None
    is_rest_day: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)
    completed: Optional[bool] = None
    actual_session_id: Optional[int] = None


class ProgramWorkoutResponse(ProgramWorkoutBase):
    """Schema for program workout response."""
    id: int
    week_id: int
    program_id: int
    week_number: int
    day_number: int
    template_name: Optional[str] = None
    completed: bool
    completed_at: Optional[datetime] = None
    actual_session_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProgramWeekResponse(BaseModel):
    """Schema for program week response."""
    id: int
    program_id: int
    week_number: int
    week_type: str
    is_completed: bool
    scheduled_sessions: int
    completed_sessions: int
    adherence_pct: float
    notes: Optional[str] = None
    workouts: List[ProgramWorkoutResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrainingProgramBase(BaseModel):
    """Base schema for training programs."""
    name: str = Field(..., min_length=1, max_length=200)
    goal: Optional[str] = Field(None, max_length=200)
    template_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_weeks: int = Field(default=12, ge=1, le=52)
    status: str = Field(default="active", max_length=20)


class TrainingProgramCreate(TrainingProgramBase):
    """Schema for creating a training program."""
    pass


class TrainingProgramUpdate(BaseModel):
    """Schema for updating a training program."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    goal: Optional[str] = Field(None, max_length=200)
    template_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_weeks: Optional[int] = Field(None, ge=1, le=52)
    status: Optional[str] = Field(None, max_length=20)


class TrainingProgramResponse(TrainingProgramBase):
    """Schema for training program response."""
    id: int
    user_id: int
    current_week: int
    weeks: List[ProgramWeekResponse] = Field(default_factory=list)
    overall_adherence: float = Field(default=0.0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrainingProgramList(BaseModel):
    """Schema for listing training programs."""
    programs: List[TrainingProgramResponse]
    total: int


# === Calendar View ===

class CalendarDay(BaseModel):
    """Single day in calendar view."""
    date: date
    has_program_workout: bool
    program_workout: Optional[ProgramWorkoutResponse] = None
    has_actual_session: bool
    actual_session_id: Optional[int] = None
    is_rest_day: bool
    notes: Optional[str] = None


class CalendarWeek(BaseModel):
    """Week in calendar view."""
    week_start: date
    week_end: date
    days: List[CalendarDay]
    adherence_score: Optional[float] = None


class CalendarMonth(BaseModel):
    """Month in calendar view."""
    month: int
    year: int
    weeks: List[CalendarWeek]
    total_workouts_planned: int
    total_workouts_completed: int
    overall_adherence: float


class CalendarView(BaseModel):
    """Full calendar view response."""
    programs: List[TrainingProgramResponse]
    calendar: CalendarMonth