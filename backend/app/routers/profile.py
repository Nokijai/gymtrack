from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db, User, WorkoutSession
from app.schemas import ProfileResponse, ChangeMyPasswordRequest
from app.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


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
    )


@router.put("/password")
def change_my_password(
    req: ChangeMyPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hashed = str(current_user.hashed_password)
    if not bcrypt.checkpw(req.current_password.encode("utf-8"), hashed.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = bcrypt.hashpw(
        req.new_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")
    db.commit()
    return {"ok": True}
