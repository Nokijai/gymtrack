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
    name_cn = Column(String, nullable=True)          # Chinese name
    sets = Column(Integer, nullable=False, default=1)
    reps = Column(Integer, nullable=False, default=1)
    weight_kg = Column(Float, nullable=True)

    session = relationship("WorkoutSession", back_populates="exercises")
    set_list = relationship("ExerciseSet", back_populates="exercise", cascade="all, delete-orphan", order_by="ExerciseSet.set_number")


class ExerciseSet(Base):
    """Granular per-set data: weight, reps, duration, distance, notes."""
    __tablename__ = "exercise_sets"
    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    set_number = Column(Integer, nullable=False, default=1)
    weight_kg = Column(Float, nullable=True)
    reps = Column(Integer, nullable=True)
    duration_min = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    # AI coach fields
    rpe = Column(Float, nullable=True)          # Rate of Perceived Exertion 1-10
    rir = Column(Integer, nullable=True)         # Reps in Reserve
    target_weight = Column(Float, nullable=True) # AI-suggested target weight
    target_reps = Column(Integer, nullable=True) # AI-suggested target reps

    exercise = relationship("Exercise", back_populates="set_list")


class MuscleGroup(Base):
    """Muscle group definitions with fatigue half-life."""
    __tablename__ = "muscle_groups"
    id = Column(String, primary_key=True)
    name_en = Column(String, nullable=False)
    name_cn = Column(String, nullable=False)
    category = Column(String, nullable=True)
    half_life_hours = Column(Integer, default=48)


class ExerciseMuscleImpact(Base):
    """Maps exercises (by name) to muscle groups with primary/secondary."""
    __tablename__ = "exercise_muscle_impact"
    exercise_name = Column(String, primary_key=True)
    muscle_group_id = Column(String, ForeignKey("muscle_groups.id"), primary_key=True)
    is_primary = Column(Boolean, default=True)


class ReadinessLog(Base):
    """Daily readiness check-in scores."""
    __tablename__ = "readiness_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    logged_at = Column(DateTime, default=datetime.datetime.utcnow)
    score = Column(Integer, nullable=False)  # 1-5
    notes = Column(Text, nullable=True)


class Badge(Base):
    """Unlocked achievement badges per user."""
    __tablename__ = "badges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_key = Column(String, nullable=False)  # e.g. "first_blood"
    unlocked_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", backref="badges")


# ── Achievement Badge Definitions ─────────────────────────────────────────────
BADGE_DEFINITIONS = {
    "first_blood": {
        "name": "First Blood",
        "name_cn": "首勝",
        "desc": "Complete your first workout session",
        "desc_cn": "完成第一次訓練",
        "icon": "🏅",
        "check": lambda user, stats: stats["total_sessions"] >= 1,
    },
    "streak_3": {
        "name": "On Fire",
        "name_cn": "火熱",
        "desc": "Achieve a 3-day streak",
        "desc_cn": "連續訓練3天",
        "icon": "🔥",
        "check": lambda user, stats: user.current_streak >= 3,
    },
    "streak_7": {
        "name": "Iron Will",
        "name_cn": "鋼鐵意志",
        "desc": "Achieve a 7-day streak",
        "desc_cn": "連續訓練7天",
        "icon": "⚔️",
        "check": lambda user, stats: user.current_streak >= 7,
    },
    "streak_14": {
        "name": "Unstoppable",
        "name_cn": "勢不可擋",
        "desc": "Achieve a 14-day streak",
        "desc_cn": "連續訓練14天",
        "icon": "💀",
        "check": lambda user, stats: user.current_streak >= 14,
    },
    "volume_1000": {
        "name": "Volume Rookie",
        "name_cn": "菜鳥之力",
        "desc": "Lift 1,000kg total volume",
        "desc_cn": "累計總重量1000kg",
        "icon": "🏋️",
        "check": lambda user, stats: stats["total_volume"] >= 1000,
    },
    "volume_10000": {
        "name": "Volume King",
        "name_cn": "重量之王",
        "desc": "Lift 10,000kg total volume",
        "desc_cn": "累計總重量10000kg",
        "icon": "👑",
        "check": lambda user, stats: stats["total_volume"] >= 10000,
    },
    "sessions_10": {
        "name": "Getting Started",
        "name_cn": "開始上路",
        "desc": "Complete 10 workout sessions",
        "desc_cn": "完成10次訓練",
        "icon": "📈",
        "check": lambda user, stats: stats["total_sessions"] >= 10,
    },
    "sessions_50": {
        "name": "Dedicated",
        "name_cn": "堅持不懈",
        "desc": "Complete 50 workout sessions",
        "desc_cn": "完成50次訓練",
        "icon": "🎯",
        "check": lambda user, stats: stats["total_sessions"] >= 50,
    },
    "sessions_100": {
        "name": "Centurion",
        "name_cn": "百戰勇士",
        "desc": "Complete 100 workout sessions",
        "desc_cn": "完成100次訓練",
        "icon": "⚡",
        "check": lambda user, stats: stats["total_sessions"] >= 100,
    },
    "level_10": {
        "name": "Rising Star",
        "name_cn": "新星崛起",
        "desc": "Reach level 10",
        "desc_cn": "達到等級10",
        "icon": "⭐",
        "check": lambda user, stats: user.level >= 10,
    },
    "level_25": {
        "name": "Elite",
        "name_cn": "精英",
        "desc": "Reach level 25 (Platinum tier)",
        "desc_cn": "達到等級25",
        "icon": "💎",
        "check": lambda user, stats: user.level >= 25,
    },
    "level_50": {
        "name": "Ascended",
        "name_cn": "飛昇",
        "desc": "Reach level 50 (GOD tier)",
        "desc_cn": "達到等級50",
        "icon": "👁️",
        "check": lambda user, stats: user.level >= 50,
    },
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_level(xp: int) -> int:
    """Map XP to level 1–50. Exponential scaling — 8x scaled for new formula."""
    thresholds = [
        (400000, 50), (352000, 49), (308000, 48), (268000, 47), (232000, 46),
        (200000, 45), (172000, 44), (148000, 43), (128000, 42), (112000, 41),
        (96000, 40), (84000, 39), (72000, 38), (62400, 37), (53600, 36),
        (45600, 35), (39200, 34), (33600, 33), (28800, 32), (24800, 31),
        (21600, 30), (19200, 29), (16800, 28), (14400, 27), (12800, 26),
        (11200, 25), (9600, 24), (8000, 23), (6800, 22), (5600, 21),
        (4800, 20), (4000, 19), (3200, 18), (2640, 17), (2160, 16),
        (1760, 15), (1440, 14), (1200, 13), (960, 12), (800, 11),
        (640, 10), (520, 9), (400, 8), (320, 7), (240, 6),
        (160, 5), (96, 4), (48, 3), (16, 2),
    ]
    for threshold, level in thresholds:
        if xp >= threshold:
            return level
    return 1


def calculate_session_xp(
    duration_minutes: int,
    exercises: list,
    streak: int,
) -> int:
    """
    Calculate XP for a single session using the new formula:
      base = volume(kg*reps) * 0.5 + duration(min) * 2
      intensity_bonus = up to 50% extra based on avg weight per rep
      streak_multiplier: 3-6d → 1.2x, 7-13d → 1.5x, 14+ → 2.0x
    """
    total_volume = 0.0
    total_reps = 0
    total_weight = 0.0
    weighted_reps = 0

    for e in exercises:
        if e.set_list:
            for es in e.set_list:
                w = float(es.weight_kg or 0)
                r = float(es.reps or 0)
                total_volume += w * r
                if w > 0:
                    total_weight += w
                    weighted_reps += r
        else:
            w = float(e.weight_kg or 0)
            r = float(e.reps or 0) * float(e.sets or 1)
            total_volume += w * r
            if w > 0:
                total_weight += w * float(e.sets or 1)
                weighted_reps += r

    # Base XP: volume * 0.5 + duration * 2
    base_xp = total_volume * 0.5 + duration_minutes * 2

    # Intensity bonus: if avg weight per rep > 50kg, get up to 50% extra
    if weighted_reps > 0 and total_weight > 0:
        avg_weight = total_weight / weighted_reps
        intensity_factor = min(0.5, avg_weight / 200)  # 200kg = 50% bonus cap
        base_xp *= (1 + intensity_factor)

    # Streak multiplier
    if streak >= 14:
        streak_mult = 2.0
    elif streak >= 7:
        streak_mult = 1.5
    elif streak >= 3:
        streak_mult = 1.2
    else:
        streak_mult = 1.0

    return int(base_xp * streak_mult)


def recalculate_xp(db, user: User) -> None:
    """Recalculate total XP for a user using the new formula + streak buff."""
    all_sessions = db.query(WorkoutSession).filter(WorkoutSession.user_id == user.id).order_by(WorkoutSession.date.asc()).all()
    total_xp = 0

    # Track streak per session for accurate per-session buff
    streak = 0
    last_date = None
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    for s in all_sessions:
        # Convert sessions to list of exercises for the formula
        exercises = db.query(Exercise).filter(Exercise.session_id == s.id).all()

        # Recalculate streak as we go
        if last_date:
            prev_dt = datetime.datetime.strptime(last_date, "%Y-%m-%d")
            curr_dt = datetime.datetime.strptime(s.date, "%Y-%m-%d")
            if (curr_dt - prev_dt).days == 1:
                streak += 1
            else:
                streak = 1
        else:
            streak = 1
        last_date = s.date

        session_xp = calculate_session_xp(s.duration_minutes, exercises, streak)
        total_xp += session_xp

    user.xp = total_xp
    user.level = calculate_level(total_xp)


def check_and_unlock_badges(db, user: User) -> list[str]:
    """Check badge conditions and unlock any new ones. Returns list of newly unlocked badge keys."""
    # Gather stats
    all_sessions = db.query(WorkoutSession).filter(WorkoutSession.user_id == user.id).all()
    total_sessions = len(all_sessions)
    total_volume = 0.0
    for s in all_sessions:
        for ex in s.exercises:
            if ex.set_list:
                for es in ex.set_list:
                    total_volume += float(es.weight_kg or 0) * float(es.reps or 0)
            else:
                total_volume += float(ex.weight_kg or 0) * float(ex.reps or 0) * float(ex.sets or 1)

    # Get already unlocked badges
    existing = set(
        row.badge_key for row in db.query(Badge).filter(Badge.user_id == user.id).all()
    )

    stats = {"total_sessions": total_sessions, "total_volume": int(total_volume)}
    newly_unlocked = []

    for key, badge_def in BADGE_DEFINITIONS.items():
        if key in existing:
            continue
        if badge_def["check"](user, stats):
            db.add(Badge(user_id=user.id, badge_key=key))
            newly_unlocked.append(key)

    if newly_unlocked:
        db.flush()

    return newly_unlocked


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


# ── Muscle group seed data ───────────────────────────────────────────────────
MUSCLE_GROUPS_SEED = [
    # (id, name_en, name_cn, category, half_life_hours)
    # Large compound muscles → 72h; smaller isolation muscles → 48h
    ("chest",        "Chest",            "胸肌",   "push",  72),
    ("back_upper",   "Upper Back",       "上背",   "pull",  72),
    ("back_lower",   "Lower Back",       "下背",   "pull",  72),
    ("shoulders",    "Shoulders",        "肩膀",   "push",  48),
    ("biceps",       "Biceps",           "二頭肌", "pull",  48),
    ("triceps",      "Triceps",          "三頭肌", "push",  48),
    ("forearms",     "Forearms",         "前臂",   "pull",  48),
    ("quads",        "Quadriceps",       "股四頭肌","legs", 72),
    ("hamstrings",   "Hamstrings",       "膕繩肌", "legs",  72),
    ("glutes",       "Glutes",           "臀肌",   "legs",  72),
    ("calves",       "Calves",           "小腿",   "legs",  48),
    ("core",         "Core",             "核心",   "core",  48),
    ("cardio",       "Cardiovascular",   "心肺",   "cardio",24),
    ("trapezius",    "Traps",            "斜方肌",  "pull",  48),
]

# exercise_name → [(muscle_group_id, is_primary)]
EXERCISE_MUSCLE_MAPPINGS = {
    "bench press":          [("chest", True),  ("triceps", False), ("shoulders", False)],
    "bench_press":          [("chest", True),  ("triceps", False), ("shoulders", False)],
    "臥推":                  [("chest", True),  ("triceps", False), ("shoulders", False)],
    "squat":                [("quads", True),  ("hamstrings", False), ("glutes", False)],
    "深蹲":                  [("quads", True),  ("hamstrings", False), ("glutes", False)],
    "deadlift":             [("back_lower", True), ("hamstrings", False), ("glutes", False)],
    "硬拉":                  [("back_lower", True), ("hamstrings", False), ("glutes", False)],
    "pull up":              [("back_upper", True), ("biceps", False)],
    "pull_up":              [("back_upper", True), ("biceps", False)],
    "引體向上":               [("back_upper", True), ("biceps", False)],
    "overhead press":       [("shoulders", True), ("triceps", False)],
    "overhead_press":       [("shoulders", True), ("triceps", False)],
    "ohp":                  [("shoulders", True), ("triceps", False)],
    "軍推":                  [("shoulders", True), ("triceps", False)],
    "row":                  [("back_upper", True), ("biceps", False)],
    "barbell row":          [("back_upper", True), ("biceps", False)],
    "划船":                  [("back_upper", True), ("biceps", False)],
    "bicep curl":           [("biceps", True)],
    "bicep_curl":           [("biceps", True)],
    "彎舉":                  [("biceps", True)],
    "tricep pushdown":      [("triceps", True)],
    "tricep_pushdown":      [("triceps", True)],
    "三頭下壓":               [("triceps", True)],
    "leg press":            [("quads", True), ("hamstrings", False)],
    "leg_press":            [("quads", True), ("hamstrings", False)],
    "腿舉":                  [("quads", True), ("hamstrings", False)],
    "romanian deadlift":    [("hamstrings", True), ("glutes", False)],
    "romanian_deadlift":    [("hamstrings", True), ("glutes", False)],
    "rdl":                  [("hamstrings", True), ("glutes", False)],
    "羅馬尼亞硬拉":            [("hamstrings", True), ("glutes", False)],
    "plank":                [("core", True)],
    "平板支撐":               [("core", True)],
    "calf raise":           [("calves", True)],
    "calf_raise":           [("calves", True)],
    "提踵":                  [("calves", True)],
    "running":              [("cardio", True)],
    "跑步":                  [("cardio", True)],
    "dumbbell press":       [("chest", True), ("triceps", False), ("shoulders", False)],
    "啞鈴臥推":               [("chest", True), ("triceps", False), ("shoulders", False)],
    "dumbbell curl":        [("biceps", True)],
    "啞鈴彎舉":               [("biceps", True)],
    "lat pulldown":         [("back_upper", True), ("biceps", False)],
    "下拉":                  [("back_upper", True), ("biceps", False)],
    "push up":              [("chest", True), ("triceps", False)],
    "俯臥撐":                 [("chest", True), ("triceps", False)],
    "lunge":                [("quads", True), ("glutes", False)],
    "弓步蹲":                 [("quads", True), ("glutes", False)],
    "hip thrust":           [("glutes", True), ("hamstrings", False)],
    "臀推":                  [("glutes", True), ("hamstrings", False)],
    # ── Shoulder exercises (added) ──────────────────────────────────────────
    "shoulder press":       [("shoulders", True), ("triceps", False)],
    "shoulder_press":       [("shoulders", True), ("triceps", False)],
    "dumbbell shoulder press":[("shoulders", True), ("triceps", False)],
    "啞鈴推舉":               [("shoulders", True), ("triceps", False)],
    "lateral raise":        [("shoulders", True)],
    "lateral_raise":        [("shoulders", True)],
    "side lateral raise":   [("shoulders", True)],
    "側平舉":                [("shoulders", True)],
    "front raise":          [("shoulders", True)],
    "front_raise":          [("shoulders", True)],
    "前平舉":                [("shoulders", True)],
    "face pull":            [("shoulders", True), ("back_upper", False)],
    "face_pull":            [("shoulders", True), ("back_upper", False)],
    "面拉":                  [("shoulders", True), ("back_upper", False)],
    "reverse fly":          [("shoulders", True), ("back_upper", False)],
    "reverse_fly":          [("shoulders", True), ("back_upper", False)],
    "rear delt fly":        [("shoulders", True)],
    "rear_delt_fly":        [("shoulders", True)],
    "upright row":          [("shoulders", True), ("trapezius", False)],
    "upright_row":          [("shoulders", True), ("trapezius", False)],
    "直立划船":               [("shoulders", True), ("trapezius", False)],
    "arnold press":         [("shoulders", True), ("triceps", False)],
    "arnold_press":         [("shoulders", True), ("triceps", False)],
    "pike push up":         [("shoulders", True)],
    "pike_push_up":         [("shoulders", True)],
    "shrug":                [("trapezius", True)],
    "shoulder shrug":       [("trapezius", True)],
    "聳肩":                  [("trapezius", True)],
}


def init_db():
    import bcrypt as _bcrypt
    Base.metadata.create_all(bind=engine)

    # Migration: add is_admin column if it doesn't exist yet (SQLite-safe)
    with engine.connect() as conn:
        for col_ddl in [
            "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0",
            "ALTER TABLE users ADD COLUMN avatar_url VARCHAR",
            "ALTER TABLE exercises ADD COLUMN name_cn VARCHAR",
            # New AI coach columns on exercise_sets
            "ALTER TABLE exercise_sets ADD COLUMN rpe REAL",
            "ALTER TABLE exercise_sets ADD COLUMN rir INTEGER",
            "ALTER TABLE exercise_sets ADD COLUMN target_weight REAL",
            "ALTER TABLE exercise_sets ADD COLUMN target_reps INTEGER",
        ]:
            try:
                conn.execute(text(col_ddl))
                conn.commit()
            except OperationalError:
                pass  # column already exists — safe to ignore

        # Ensure noki is always admin
        conn.execute(text("UPDATE users SET is_admin=1 WHERE username='noki'"))
        conn.commit()

        # ── Seed muscle groups ───────────────────────────────────────────────
        for mg_id, name_en, name_cn, category, half_life in MUSCLE_GROUPS_SEED:
            conn.execute(text("""
                INSERT OR IGNORE INTO muscle_groups (id, name_en, name_cn, category, half_life_hours)
                VALUES (:id, :name_en, :name_cn, :category, :half_life)
            """), {"id": mg_id, "name_en": name_en, "name_cn": name_cn, "category": category, "half_life": half_life})
        conn.commit()

        # ── Seed exercise → muscle mappings ─────────────────────────────────
        for ex_name, mappings in EXERCISE_MUSCLE_MAPPINGS.items():
            for muscle_id, is_primary in mappings:
                conn.execute(text("""
                    INSERT OR IGNORE INTO exercise_muscle_impact (exercise_name, muscle_group_id, is_primary)
                    VALUES (:ex_name, :muscle_id, :is_primary)
                """), {"ex_name": ex_name, "muscle_id": muscle_id, "is_primary": is_primary})
        conn.commit()

    import json as _json

    # Persistent credentials backup path — same directory as the DB file.
    # This acts as a safety net: if the DB is ever wiped (e.g. permissions issue
    # on the bind-mount), we restore the real hashed passwords instead of
    # re-seeding with hardcoded defaults.
    CREDENTIALS_BACKUP = os.path.join(os.path.dirname(DB_PATH), ".credentials_backup")

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            if os.path.exists(CREDENTIALS_BACKUP):
                # DB was wiped but backup exists — restore real hashed passwords.
                print("init_db: DB empty but credentials backup found — restoring from backup.")
                with open(CREDENTIALS_BACKUP, "r") as _f:
                    _backup = _json.load(_f)
                for _username, _hashed_pw in _backup.items():
                    _is_admin = (_username == "noki")
                    db.add(User(username=_username, hashed_password=_hashed_pw, is_admin=_is_admin))
                db.commit()
            else:
                # First ever run — seed with defaults and write a credentials backup.
                # SECURITY NOTE: These are bootstrap/seed accounts created only on first deploy
                # (when the database is empty). The plaintext passwords below are used once to
                # generate bcrypt hashes and are never stored. All users — especially 'noki'
                # (admin) — MUST change their passwords via the admin panel immediately after
                # first login. These defaults are well-known in source code and must not be
                # left in place on a production deployment.
                print("init_db: DB empty, no backup — seeding default users.")
                users_data = [
                    ("dennis", "dennis123", False),
                    ("cyrus", "cyrus123", False),
                    ("noki", "noki123", True),
                ]
                _backup = {}
                for username, password, is_admin in users_data:
                    hashed = _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
                    db.add(User(username=username, hashed_password=hashed, is_admin=is_admin))
                    _backup[username] = hashed
                db.commit()
                # Persist hashed passwords so future wipes restore these exact hashes.
                try:
                    with open(CREDENTIALS_BACKUP, "w") as _f:
                        _json.dump(_backup, _f)
                    print(f"init_db: Credentials backup written to {CREDENTIALS_BACKUP}")
                except Exception as _e:
                    print(f"Warning: could not write credentials backup: {_e}")
        # DB is not empty — do NOT touch passwords under any circumstances.
    finally:
        db.close()
