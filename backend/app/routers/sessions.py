from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db, User, WorkoutSession, Exercise, recalculate_xp, recalculate_streak
from app.schemas import SessionCreate, SessionResponse
from app.auth import get_current_user
from app.sse import broadcast

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionResponse])
def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sessions


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = WorkoutSession(
        user_id=current_user.id,
        date=data.date,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(session)
    db.flush()

    for ex in data.exercises:
        db.add(Exercise(
            session_id=session.id,
            name=ex.name,
            sets=ex.sets,
            reps=ex.reps,
            weight_kg=ex.weight_kg,
        ))

    recalculate_xp(db, current_user)
    recalculate_streak(db, current_user)
    db.commit()
    db.refresh(session)

    # Push real-time update to all connected clients
    broadcast({"type": "refresh", "scope": "leaderboard"})
    broadcast({"type": "refresh", "scope": "dashboard"})

    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    db.delete(session)
    db.flush()

    recalculate_xp(db, current_user)
    recalculate_streak(db, current_user)
    db.commit()

    broadcast({"type": "refresh", "scope": "leaderboard"})
    broadcast({"type": "refresh", "scope": "dashboard"})
