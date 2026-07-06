from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db, User, WorkoutSession, Exercise, ExerciseSet, recalculate_xp, recalculate_streak, check_and_unlock_badges
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


@router.get("/{session_id}")
def get_session(
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

    exercises = db.query(Exercise).filter(Exercise.session_id == session.id).all()

    # Calculate XP earned for this session
    base_xp = float(session.duration_minutes)
    for e in exercises:
        # Count volume from granular set_list if available, else legacy sets*reps
        if e.set_list:
            for s in e.set_list:
                r = s.reps or 0
                base_xp += r * 0.1
        else:
            base_xp += (e.sets or 1) * (e.reps or 1) * 0.1
    xp_earned = int(base_xp)

    return {
        "id": session.id,
        "date": session.date,
        "duration_minutes": session.duration_minutes,
        "xp_earned": xp_earned,
        "exercises": [
            {
                "id": e.id,
                "name": e.name,
                "name_cn": e.name_cn,
                "sets": e.sets or len(e.set_list) or 1,
                "reps": e.reps or (e.set_list[0].reps if e.set_list else 1) or 1,
                "weight_kg": e.weight_kg,
                "set_list": [
                    {
                        "id": s.id,
                        "set_number": s.set_number,
                        "weight_kg": s.weight_kg,
                        "reps": s.reps,
                        "duration_min": s.duration_min,
                        "distance_km": s.distance_km,
                        "notes": s.notes,
                    }
                    for s in (e.set_list or [])
                ],
            }
            for e in exercises
        ],
    }


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
        # Compute legacy aggregate fields from set_list if provided
        if ex.set_list:
            agg_sets = len(ex.set_list)
            # Use first set's reps as legacy reps, or 1
            agg_reps = ex.set_list[0].reps if ex.set_list[0].reps is not None else 1
            # Use first set's weight as legacy weight
            agg_weight = ex.set_list[0].weight_kg
        else:
            agg_sets = ex.sets or 1
            agg_reps = ex.reps or 1
            agg_weight = ex.weight_kg

        db_exercise = Exercise(
            session_id=session.id,
            name=ex.name,
            name_cn=ex.name_cn,
            sets=agg_sets,
            reps=agg_reps,
            weight_kg=agg_weight,
        )
        db.add(db_exercise)
        db.flush()

        # Save granular sets
        for i, s in enumerate(ex.set_list):
            db.add(ExerciseSet(
                exercise_id=db_exercise.id,
                set_number=s.set_number or (i + 1),
                weight_kg=s.weight_kg,
                reps=s.reps,
                duration_min=s.duration_min,
                distance_km=s.distance_km,
                notes=s.notes,
            ))

    recalculate_xp(db, current_user)
    recalculate_streak(db, current_user)
    db.commit()
    db.refresh(session)

    # Check for new badges
    new_badges = check_and_unlock_badges(db, current_user)
    db.commit()

    # Push real-time update to all connected clients
    broadcast({"type": "refresh", "scope": "leaderboard"})
    broadcast({"type": "refresh", "scope": "dashboard"})
    if new_badges:
        broadcast({"type": "badges", "badges": new_badges})

    return session


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing session in-place (used for auto-save drafts and final save)."""
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id,
    ).first()
    if not session:
        # Auto-recover: the session was lost (container restart, DB reset, etc.).
        # Re-create it with the original ID so the client's draftSessionId stays valid.
        session = WorkoutSession(
            id=session_id,
            user_id=current_user.id,
            date=data.date,
            duration_minutes=data.duration_minutes,
            notes=data.notes,
        )
        db.add(session)
        db.flush()
    else:
        # Update session-level fields for existing session
        session.date = data.date
        session.duration_minutes = data.duration_minutes
        session.notes = data.notes

        # Replace all exercises (cascade deletes sets via ORM relationship)
        for ex in list(session.exercises):
            db.delete(ex)
        db.flush()

    for ex in data.exercises:
        if ex.set_list:
            agg_sets = len(ex.set_list)
            agg_reps = ex.set_list[0].reps if ex.set_list[0].reps is not None else 1
            agg_weight = ex.set_list[0].weight_kg
        else:
            agg_sets = ex.sets or 1
            agg_reps = ex.reps or 1
            agg_weight = ex.weight_kg

        db_exercise = Exercise(
            session_id=session.id,
            name=ex.name,
            name_cn=ex.name_cn,
            sets=agg_sets,
            reps=agg_reps,
            weight_kg=agg_weight,
        )
        db.add(db_exercise)
        db.flush()

        for i, s in enumerate(ex.set_list):
            db.add(ExerciseSet(
                exercise_id=db_exercise.id,
                set_number=s.set_number or (i + 1),
                weight_kg=s.weight_kg,
                reps=s.reps,
                duration_min=s.duration_min,
                distance_km=s.distance_km,
                notes=s.notes,
            ))

    recalculate_xp(db, current_user)
    recalculate_streak(db, current_user)
    db.commit()
    db.refresh(session)

    # Check for new badges
    new_badges = check_and_unlock_badges(db, current_user)
    db.commit()

    broadcast({"type": "refresh", "scope": "leaderboard"})
    broadcast({"type": "refresh", "scope": "dashboard"})
    if new_badges:
        broadcast({"type": "badges", "badges": new_badges})

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
