import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, User, WorkoutSession
from app.schemas import ProfileResponse, ChangeMyPasswordRequest
from app.auth import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/api/profile", tags=["profile"])

# ---- Avatar upload config ---------------------------------------------------
UPLOAD_DIR = "/app/uploads/avatars"
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
