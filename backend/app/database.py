from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, event, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os

DB_PATH = os.environ.get("DB_PATH", "/app/data/gymtrack.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_workout_date = Column(String, nullable=True)  # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_admin = Column(Boolean, default=False, nullable=False, server_default="0")
    avatar_url = Column(String, nullable=True)

    sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")


class WorkoutSession(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    duration_minutes = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    exercises = relationship("Exercise", back_populates="session", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    name = Column(String, nullable=False)
    sets = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=True)

    session = relationship("WorkoutSession", back_populates="exercises")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_level(xp: int) -> int:
    if xp >= 2000:
        return 5
    elif xp >= 1000:
        return 4
    elif xp >= 500:
        return 3
    elif xp >= 200:
        return 2
    return 1


def recalculate_xp(db, user: User) -> None:
    """Recalculate total XP for a user based on all their sessions."""
    all_sessions = db.query(WorkoutSession).filter(WorkoutSession.user_id == user.id).all()
    total_xp = 0.0
    for s in all_sessions:
        base_xp = s.duration_minutes
        exercises = db.query(Exercise).filter(Exercise.session_id == s.id).all()
        for e in exercises:
            base_xp += e.sets * e.reps * 0.1
        total_xp += base_xp
    user.xp = int(total_xp)
    user.level = calculate_level(int(total_xp))


def recalculate_streak(db, user: User) -> None:
    """Recalculate current and longest streak for a user."""
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == user.id)
        .order_by(WorkoutSession.date.desc())
        .all()
    )

    if not sessions:
        user.current_streak = 0
        user.last_workout_date = None
        return

    # Get unique dates sorted descending
    dates = sorted(set(s.date for s in sessions), reverse=True)
    user.last_workout_date = dates[0]

    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.datetime.utcnow() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    # Current streak: most recent date must be today or yesterday
    if dates[0] != today and dates[0] != yesterday:
        user.current_streak = 0
    else:
        streak = 1
        for i in range(1, len(dates)):
            prev_date = datetime.datetime.strptime(dates[i - 1], "%Y-%m-%d")
            curr_date = datetime.datetime.strptime(dates[i], "%Y-%m-%d")
            if (prev_date - curr_date).days == 1:
                streak += 1
            else:
                break
        user.current_streak = streak

    # Longest streak: scan all dates
    if len(dates) == 1:
        longest = 1
    else:
        longest = 1
        current = 1
        sorted_asc = sorted(dates)
        for i in range(1, len(sorted_asc)):
            prev_date = datetime.datetime.strptime(sorted_asc[i - 1], "%Y-%m-%d")
            curr_date = datetime.datetime.strptime(sorted_asc[i], "%Y-%m-%d")
            if (curr_date - prev_date).days == 1:
                current += 1
                longest = max(longest, current)
            else:
                current = 1
        longest = max(longest, current)

    user.longest_streak = max(user.longest_streak, longest)


def init_db():
    import bcrypt as _bcrypt
    Base.metadata.create_all(bind=engine)

    # Migration: add is_admin column if it doesn't exist yet (SQLite-safe)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
            conn.commit()
        except OperationalError:
            pass  # column already exists — safe to ignore

        # Migration: add avatar_url column if it doesn't exist yet
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
            conn.commit()
        except OperationalError:
            pass  # column already exists — safe to ignore

        # Ensure noki is always admin
        conn.execute(text("UPDATE users SET is_admin=1 WHERE username='noki'"))
        conn.commit()

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            users_data = [
                ("dennis", "dennis123", False),
                ("cyrus", "cyrus123", False),
                ("noki", "noki123", True),
            ]
            for username, password, is_admin in users_data:
                hashed = _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
                db.add(User(username=username, hashed_password=hashed, is_admin=is_admin))
            db.commit()
    finally:
        db.close()
