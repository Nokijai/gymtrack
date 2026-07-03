from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db, User, WorkoutSession, Exercise
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.date.desc())
        .all()
    )

    total_sessions = len(sessions)
    total_minutes = sum(s.duration_minutes for s in sessions)

    # Weekly chart (last 7 days)
    weekly_data = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        day_label = day.strftime("%a")
        day_minutes = sum(s.duration_minutes for s in sessions if s.date == day_str)
        weekly_data.append({"day": day_label, "minutes": day_minutes})

    # Recent sessions (last 5) with exercises
    recent = sessions[:5]
    recent_sessions = []
    for s in recent:
        exs = db.query(Exercise).filter(Exercise.session_id == s.id).all()
        recent_sessions.append({
            "id": s.id,
            "date": s.date,
            "duration_minutes": s.duration_minutes,
            "notes": s.notes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "exercises": [
                {"id": e.id, "name": e.name, "sets": e.sets, "reps": e.reps, "weight_kg": e.weight_kg}
                for e in exs
            ],
        })

    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "xp": current_user.xp,
            "level": current_user.level,
            "current_streak": current_user.current_streak,
            "longest_streak": current_user.longest_streak,
            "is_admin": bool(current_user.is_admin),
            "avatar_url": current_user.avatar_url,
        },
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "recent_sessions": recent_sessions,
        "weekly_data": weekly_data,
    }
