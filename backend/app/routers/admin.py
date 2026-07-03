from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db, User, WorkoutSession, Exercise, recalculate_xp, recalculate_streak, calculate_level
from app.auth import get_current_user, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Dependency ---

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# --- Schemas ---

class CreateUserRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    new_password: str


class EditSessionRequest(BaseModel):
    date: str
    duration_minutes: int
    notes: Optional[str] = None


class OverrideXPRequest(BaseModel):
    xp: int


# --- Existing user management endpoints ---

@router.get("/users")
def list_users(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "xp": u.xp,
            "level": u.level,
            "is_admin": bool(u.is_admin),
            "avatar_url": u.avatar_url,
            # hashed_password intentionally excluded
        }
        for u in users
    ]


@router.post("/users", status_code=201)
def create_user(
    req: CreateUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = hash_password(req.password)
    new_user = User(username=req.username, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username}


@router.put("/users/{user_id}/password")
def change_password(
    user_id: int,
    req: ChangePasswordRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}


# --- New admin session management endpoints ---

@router.get("/sessions")
def admin_list_sessions(
    user_id: int = Query(..., description="User ID to list sessions for"),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .all()
    )
    result = []
    for s in sessions:
        exercises = db.query(Exercise).filter(Exercise.session_id == s.id).all()
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "date": s.date,
            "duration_minutes": s.duration_minutes,
            "notes": s.notes,
            "exercises": [
                {"id": e.id, "name": e.name, "sets": e.sets, "reps": e.reps, "weight_kg": e.weight_kg}
                for e in exercises
            ],
        })
    return result


@router.get("/users/{user_id}/sessions")
def admin_list_user_sessions(
    user_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Alias for GET /api/admin/sessions?user_id={id}"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .all()
    )
    result = []
    for s in sessions:
        exercises = db.query(Exercise).filter(Exercise.session_id == s.id).all()
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "date": s.date,
            "duration_minutes": s.duration_minutes,
            "notes": s.notes,
            "exercises": [
                {"id": e.id, "name": e.name, "sets": e.sets, "reps": e.reps, "weight_kg": e.weight_kg}
                for e in exercises
            ],
        })
    return result


@router.put("/sessions/{session_id}")
def admin_edit_session(
    session_id: int,
    req: EditSessionRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.date = req.date
    session.duration_minutes = req.duration_minutes
    session.notes = req.notes

    # Recalculate XP + streak for the affected user
    user = db.query(User).filter(User.id == session.user_id).first()
    if user:
        recalculate_xp(db, user)
        recalculate_streak(db, user)

    db.commit()
    return {
        "id": session.id,
        "date": session.date,
        "duration_minutes": session.duration_minutes,
        "notes": session.notes,
    }


@router.delete("/sessions/{session_id}", status_code=204)
def admin_delete_session(
    session_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = session.user_id
    db.delete(session)
    db.flush()

    # Recalculate XP + streak for the affected user
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        recalculate_xp(db, user)
        recalculate_streak(db, user)

    db.commit()


@router.put("/users/{user_id}/xp")
def admin_override_xp(
    user_id: int,
    req: OverrideXPRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.xp = req.xp
    user.level = calculate_level(req.xp)
    db.commit()
    return {"id": user.id, "username": user.username, "xp": user.xp, "level": user.level}
