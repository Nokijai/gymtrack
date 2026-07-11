"""
GymTrack Feature Models
New tables for Program Builder, Live Workout, Progress, etc.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
import datetime

from app.base import Base


# ─── 1. Workout Templates ──────────────────────────────────────────────────

class WorkoutTemplate(Base):
    """Reusable workout templates (e.g., Push Day, Upper Body)"""
    __tablename__ = "workout_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    split_type = Column(String(50), nullable=True)  # push/pull/legs, upper/lower, full_body, custom
    days_per_week = Column(Integer, default=4)
    duration_weeks = Column(Integer, default=12)
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    user = relationship("User", backref="templates")
    exercises = relationship("TemplateExercise", back_populates="template", cascade="all, delete-orphan")


class TemplateExercise(Base):
    """Exercises within a template, assigned to specific days"""
    __tablename__ = "template_exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id"), nullable=False)
    exercise_name = Column(String(200), nullable=False)
    exercise_name_cn = Column(String(200), nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, etc.
    sort_order = Column(Integer, default=0)
    target_sets = Column(Integer, default=3)
    target_reps = Column(String(50), default="8-12")  # "8-12" or "5x5"
    target_rpe = Column(String(10), nullable=True)
    rest_seconds = Column(Integer, default=90)
    is_warmup = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    
    template = relationship("WorkoutTemplate", back_populates="exercises")


# ─── 2. Training Programs ──────────────────────────────────────────────────

class TrainingProgram(Base):
    """Long-term training programs (4-12 weeks)"""
    __tablename__ = "training_programs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("workout_templates.id"), nullable=True)
    name = Column(String(200), nullable=False)
    goal = Column(String(200), nullable=True)  # strength, hypertrophy, endurance, custom
    start_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    end_date = Column(String(10), nullable=True)
    current_week = Column(Integer, default=1)
    total_weeks = Column(Integer, default=12)
    status = Column(String(20), default="active")  # active, completed, deload, abandoned
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    user = relationship("User", backref="programs")
    template = relationship("WorkoutTemplate")
    weeks = relationship("ProgramWeek", back_populates="program", cascade="all, delete-orphan")


class ProgramWeek(Base):
    """Individual weeks within a program"""
    __tablename__ = "program_weeks"
    
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("training_programs.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    week_type = Column(String(20), default="normal")  # normal, deload, test, rest
    is_completed = Column(Boolean, default=False)
    scheduled_sessions = Column(Integer, default=0)
    completed_sessions = Column(Integer, default=0)
    adherence_pct = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    program = relationship("TrainingProgram", back_populates="weeks")
    workouts = relationship("ProgramWorkout", back_populates="week", cascade="all, delete-orphan")


class ProgramWorkout(Base):
    """Individual workout scheduled in a program week"""
    __tablename__ = "program_workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("training_programs.id"), nullable=False)
    week_id = Column(Integer, ForeignKey("program_weeks.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    day_number = Column(Integer, nullable=False)  # Day within the week (1-7)
    scheduled_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    workout_template_id = Column(Integer, ForeignKey("workout_templates.id"), nullable=True)
    is_rest_day = Column(Boolean, default=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    actual_session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    program = relationship("TrainingProgram", backref="program_workouts")
    week = relationship("ProgramWeek", back_populates="workouts")
    template = relationship("WorkoutTemplate")


# ─── 3. Exercise Library ──────────────────────────────────────────────────

class ExerciseLibrary(Base):
    """Comprehensive exercise database"""
    __tablename__ = "exercise_library"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    name_cn = Column(String(200), nullable=True)
    muscle_group = Column(String(50), nullable=True)
    secondary_muscles = Column(String(500), nullable=True)  # comma-separated
    equipment = Column(String(50), nullable=True)  # barbell, dumbbell, machine, bodyweight, cable, kettlebell
    difficulty = Column(String(20), default="intermediate")  # beginner, intermediate, advanced
    exercise_type = Column(String(20), default="compound")  # compound, isolation
    instructions = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    has_variant = Column(Boolean, default=False)
    variant_of = Column(String(200), nullable=True)  # parent exercise name
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ExerciseSubstitution(Base):
    """Smart exercise substitutions"""
    __tablename__ = "exercise_substitutions"
    
    id = Column(Integer, primary_key=True, index=True)
    exercise_name = Column(String(200), nullable=False)
    alternative_name = Column(String(200), nullable=False)
    similarity_score = Column(Float, default=0.8)  # 0.0 to 1.0
    equipment_match = Column(String(50), nullable=True)  # which equipment this matches
    reason = Column(String(200), nullable=True)


# ─── 4. Personal Records ──────────────────────────────────────────────────

class PersonalRecord(Base):
    """User personal records for exercises"""
    __tablename__ = "personal_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exercise_name = Column(String(200), nullable=False)
    record_type = Column(String(20), nullable=False)  # weight, reps, volume, e1rm
    value = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=True)
    reps = Column(Integer, nullable=True)
    set_id = Column(Integer, ForeignKey("exercise_sets.id"), nullable=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    achieved_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_current = Column(Boolean, default=True)
    
    user = relationship("User", backref="personal_records")


class BodyMeasurement(Base):
    """Body measurements and progress photos"""
    __tablename__ = "body_measurements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False, default=lambda: datetime.datetime.utcnow().strftime("%Y-%m-%d"))
    weight_kg = Column(Float, nullable=True)
    body_fat_pct = Column(Float, nullable=True)
    measurements = Column(JSON, nullable=True)  # {chest, waist, arms, thighs, calves}
    photo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", backref="body_measurements")


# ─── 5. Social Feed ───────────────────────────────────────────────────────

class SocialPost(Base):
    """Activity feed posts"""
    __tablename__ = "social_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_type = Column(String(30), nullable=False)  # workout_complete, pr, badge, challenge, custom
    content = Column(Text, nullable=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", backref="social_posts")
    likes = relationship("SocialLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("SocialComment", back_populates="post", cascade="all, delete-orphan")


class SocialLike(Base):
    """Post likes"""
    __tablename__ = "social_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("social_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    post = relationship("SocialPost", back_populates="likes")
    user = relationship("User")


class SocialComment(Base):
    """Post comments"""
    __tablename__ = "social_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("social_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    post = relationship("SocialPost", back_populates="comments")
    user = relationship("User")


# ─── 6. Challenges ────────────────────────────────────────────────────────

class Challenge(Base):
    """Team challenges"""
    __tablename__ = "challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    challenge_type = Column(String(30), nullable=False)  # volume, sessions, streak, exercise, consistency
    target_value = Column(Float, nullable=False)
    unit = Column(String(30), nullable=True)  # kg, reps, sessions, days
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    creator = relationship("User", backref="created_challenges")
    participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeParticipant(Base):
    """Users participating in a challenge"""
    __tablename__ = "challenge_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_value = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    challenge = relationship("Challenge", back_populates="participants")
    user = relationship("User")


# ─── 7. Offline Sync Queue ────────────────────────────────────────────────

class SyncQueue(Base):
    """Offline sync queue for reliable synchronization"""
    __tablename__ = "sync_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    operation_id = Column(String(36), unique=True, nullable=False)  # UUID
    action = Column(String(20), nullable=False)  # create, update, delete
    entity_type = Column(String(30), nullable=False)  # session, exercise, set
    entity_id = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=True)
    status = Column(String(20), default="pending")  # pending, syncing, completed, failed
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    synced_at = Column(DateTime, nullable=True)


# ─── 8. Health Integration ─────────────────────────────────────────────────

class HealthData(Base):
    """External health data (Apple Health, Health Connect, etc.)"""
    __tablename__ = "health_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    source = Column(String(30), nullable=False)  # apple_health, health_connect, garmin, strava
    data_type = Column(String(30), nullable=False)  # sleep, hrv, heart_rate, steps, calories
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=True)
    recorded_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", backref="health_data")