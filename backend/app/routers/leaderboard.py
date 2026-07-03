from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession
from datetime import datetime, timedelta

from app.database import get_db, User, WorkoutSession
from app.schemas import LeaderboardUser
from app.auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


def build_leaderboard(db: DbSession) -> list[dict]:
    """Build leaderboard data for all users. Used by both the endpoint and WebSocket broadcasts."""
    users = db.query(User).all()
    now = datetime.utcnow()

    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")

    result = []
    for user in users:
        sessions = db.query(WorkoutSession).filter(WorkoutSession.user_id == user.id).all()

        weekly = sum(1 for s in sessions if s.date >= week_start and s.date <= today)
        monthly = sum(1 for s in sessions if s.date >= month_start and s.date <= today)

        result.append({
            "username": user.username,
            "total_xp": user.xp,
            "level": user.level,
            "weekly_sessions": weekly,
            "monthly_sessions": monthly,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
        })

    result.sort(key=lambda u: u["total_xp"], reverse=True)
    return result


@router.get("", response_model=list[LeaderboardUser])
def leaderboard(
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    data = build_leaderboard(db)
    return [LeaderboardUser(**item) for item in data]
