import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, User, WorkoutSession, Badge, BADGE_DEFINITIONS, check_and_unlock_badges, Exercise, ExerciseSet, MuscleGroup, ExerciseMuscleImpact
from app.schemas import ProfileResponse, ChangeMyPasswordRequest
from app.auth import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/api/profile", tags=["profile"])

# ---- Avatar upload config (UPLOAD_ROOT for local dev, /app/uploads in Docker) ---
UPLOAD_DIR = os.path.join(os.environ.get("UPLOAD_ROOT", "/app/uploads"), "avatars")
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB

# Magic bytes for allowed types
MAGIC_BYTES: dict[str, bytes] = {
    "jpg": b"\xff\xd8\xff",
    "png": b"\x89PNG",
    "webp": b"RIFF",  # RIFF....WEBP — we check further below
}

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
# -----------------------------------------------------------------------------


def _detect_ext_from_magic(data: bytes) -> str | None:
    """Return extension string if magic bytes match an allowed type, else None."""
    if data[:3] == MAGIC_BYTES["jpg"]:
        return "jpg"
    if data[:4] == MAGIC_BYTES["png"]:
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


@router.get("", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .all()
    )
    total_sessions = len(sessions)
    total_minutes = sum(s.duration_minutes for s in sessions)
    member_since = (
        current_user.created_at.strftime("%Y-%m-%d")
        if current_user.created_at
        else "unknown"
    )

    return ProfileResponse(
        username=str(current_user.username),
        xp=int(current_user.xp),
        level=int(current_user.level),
        current_streak=int(current_user.current_streak),
        longest_streak=int(current_user.longest_streak),
        total_sessions=total_sessions,
        total_minutes=total_minutes,
        member_since=member_since,
        is_admin=bool(current_user.is_admin),
        avatar_url=current_user.avatar_url,
    )


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Check content-type header
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed",
        )

    # 2. Read up to MAX_FILE_SIZE + 1 byte to enforce size limit
    data = await file.read(MAX_FILE_SIZE + 1)
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 2 MB limit",
        )

    # 3. Validate magic bytes (not just content-type header)
    ext = _detect_ext_from_magic(data)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match an allowed image type",
        )

    # 4. Safe filename — use only user_id, never user-supplied name
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{current_user.id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Remove old avatar files for this user (different extension)
    for old_ext in MAGIC_BYTES:
        old_path = os.path.join(UPLOAD_DIR, f"{current_user.id}.{old_ext}")
        if old_path != filepath and os.path.exists(old_path):
            os.remove(old_path)

    with open(filepath, "wb") as f:
        f.write(data)

    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()

    return {"avatar_url": avatar_url}


@router.get("/badges")
def get_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all badges with unlock status."""
    unlocked = set(
        row.badge_key for row in db.query(Badge).filter(Badge.user_id == current_user.id).all()
    )

    all_badges = []
    for key, defn in BADGE_DEFINITIONS.items():
        all_badges.append({
            "key": key,
            "name": defn["name"],
            "name_cn": defn["name_cn"],
            "desc": defn["desc"],
            "desc_cn": defn["desc_cn"],
            "icon": defn["icon"],
            "unlocked": key in unlocked,
        })

    return {"badges": all_badges}


@router.get("/exercise-history")
def get_exercise_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get per-exercise performance history grouped by muscle group."""

    # Load all muscle groups
    muscle_groups = {mg.id: mg for mg in db.query(MuscleGroup).all()}

    # Load exercise → muscle mappings
    mappings = db.query(ExerciseMuscleImpact).all()
    ex_to_muscles: dict[str, list[tuple[str, bool]]] = {}
    for m in mappings:
        ex_to_muscles.setdefault(m.exercise_name, []).append(
            (m.muscle_group_id, bool(m.is_primary))
        )

    # Fallback category by exercise name keywords (when muscle_groups table is empty)
    def fallback_category(name: str) -> str:
        n = name.lower().strip()
        # Cardio — match whole words or full machine names
        if any(k in n for k in ['treadmill', 'run', 'jog', 'bike', 'cycling',
                                  'elliptical', 'stair.climber', 'hiit', 'burpee',
                                  'sprint', 'outdoor.run', 'box.jump', 'jump.rope',
                                  '跳繩', '跑步', '單車', '自行車', '橢圓',
                                  '爬樓', '波比', '短跑', '衝刺', '跳箱']):
            return 'cardio'
        # Rowing machine specifically
        if n in ['rowing', 'rowing machine', 'rowing machine', '划船機']:
            return 'cardio'
        # Push
        if any(k in n for k in ['bench', 'press', 'push', 'fly', 'pec', 'chest',
                                  'tricep', 'dip', 'skull', 'kickback',
                                  '臥推', '推舉', '俯臥', '夾胸', '飛鳥', '三頭',
                                  '臂屈伸', '撐起', '下壓']):
            return 'push'
        # Pull — 'row' here means cable/bar row (pull exercise), not rowing machine
        if any(k in n for k in ['pull', 'row', 'lat', 'deadlift', 'chin', 'face',
                                  'curl', 'shrug', '划船', '下拉', '引體', '硬舉',
                                  '彎舉', '聳肩', '麪拉']):
            return 'pull'
        # Legs
        if any(k in n for k in ['squat', 'leg', 'lunge', 'calf', 'quad', 'hamstring',
                                  'glute', 'hip', 'thrust', 'abductor', 'deadlift',
                                  '深蹲', '腿', '弓箭步', '提踵', '臀', '硬舉']):
            return 'legs'
        # Core
        if any(k in n for k in ['crunch', 'plank', 'ab', 'core', 'twist', 'wheel',
                                  'v.up', 'dead.bug', 'mountain', 'flag', 'raise',
                                  '卷腹', '平板', '核心', '轉體', '腹輪', '舉腿']):
            return 'core'
        return 'other'

    # Query all sessions with exercises for this user
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.date.asc())
        .all()
    )

    # Group history by exercise name (normalized)
    exercise_history: dict[str, list[dict]] = {}

    for s in sessions:
        for ex in s.exercises:
            key = ex.name.lower().strip()
            if key not in exercise_history:
                # Get the chinese name
                cn = ex.name_cn or key
                # Find muscle group for categorization
                primary_muscle = None
                if key in ex_to_muscles:
                    for mg_id, is_primary in ex_to_muscles[key]:
                        if is_primary and mg_id in muscle_groups:
                            primary_muscle = muscle_groups[mg_id]
                            break
                    if not primary_muscle:
                        mg_id = ex_to_muscles[key][0][0]
                        primary_muscle = muscle_groups.get(mg_id)

                exercise_history[key] = {
                    "name": key,
                    "name_cn": cn,
                    "muscle_group": primary_muscle.name_en if primary_muscle else "Other",
                    "muscle_group_cn": primary_muscle.name_cn if primary_muscle else "其他",
                    "category": primary_muscle.category if primary_muscle else fallback_category(key),
                    "history": [],
                }

            # Calculate volume for this exercise in this session
            volume = 0.0
            max_weight = 0.0
            total_reps = 0
            sets_count = 0

            if ex.set_list:
                for es in ex.set_list:
                    w = float(es.weight_kg or 0)
                    r = float(es.reps or 0)
                    volume += w * r
                    max_weight = max(max_weight, w)
                    total_reps += r
                    sets_count += 1
            else:
                w = float(ex.weight_kg or 0)
                r = float(ex.reps or 0)
                sets = float(ex.sets or 1)
                volume = w * r * sets
                max_weight = w
                total_reps = r * sets
                sets_count = int(sets)

            exercise_history[key]["history"].append({
                "date": s.date,
                "volume": round(volume, 1),
                "max_weight": max_weight,
                "total_reps": total_reps,
                "sets": sets_count,
            })

    # Group by category (muscle group)
    grouped: dict[str, list[dict]] = {}
    for data in exercise_history.values():
        cat = data["category"]
        grouped.setdefault(cat, []).append(data)

    # Sort categories in a sensible order
    cat_order = ["push", "pull", "legs", "core", "cardio", "other"]
    sorted_grouped = {}
    for cat in cat_order:
        if cat in grouped:
            sorted_grouped[cat] = grouped[cat]
    for cat in grouped:
        if cat not in sorted_grouped:
            sorted_grouped[cat] = grouped[cat]

    return {"groups": sorted_grouped, "muscle_groups": {k: {"name_en": v.name_en, "name_cn": v.name_cn, "category": v.category} for k, v in muscle_groups.items()}}


@router.put("/password")
def change_my_password(
    req: ChangeMyPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hashed = str(current_user.hashed_password)
    if not verify_password(req.current_password, hashed):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"ok": True}
