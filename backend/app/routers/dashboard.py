from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db, User, WorkoutSession
from app.schemas import DashboardStats
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
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
    total_time = sum(s.duration_minutes for s in sessions)

    # Weekly chart (last 7 days)
    weekly_chart = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        day_label = day.strftime("%a")
        day_minutes = sum(
            s.duration_minutes for s in sessions if s.date == day_str
        )
        weekly_chart.append({"day": day_label, "date": day_str, "minutes": day_minutes})

    return DashboardStats(
        total_sessions=total_sessions,
        total_time_minutes=total_time,
        xp=current_user.xp,
        level=current_user.level,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        weekly_chart=weekly_chart,
    )
