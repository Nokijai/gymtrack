"""
AI Coach & Recovery Router
"""
from __future__ import annotations
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, User, ReadinessLog
from app.auth import get_current_user
from app.engine_overload import calculate_next_targets
from app.engine_fatigue import calculate_muscle_fatigue
from app.engine_plateau import check_plateau
from app.services.ai_coach import (
    get_today_recommendation,
    get_post_session_debrief,
    get_weekly_summary,
    chat_with_coach,
    generate_workout_plan,
)

router = APIRouter(tags=["ai"])


# ── Request / Response models ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ReadinessRequest(BaseModel):
    score: int  # 1-5
    notes: Optional[str] = None


class GeneratePlanRequest(BaseModel):
    goal: str = "general fitness"
    days_per_week: int = 4
    equipment: List[str] = []


# ── AI Endpoints ─────────────────────────────────────────────────────────────

@router.post("/api/ai/chat")
def ai_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Multi-turn chat with AI personal coach."""
    history = [{"role": m.role, "content": m.content} for m in body.history]
    response = chat_with_coach(current_user.id, body.message, history, db)
    return {
        "response": response,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@router.get("/api/ai/today")
def ai_today(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's AI training recommendation."""
    result = get_today_recommendation(current_user.id, db)
    return result


@router.post("/api/ai/debrief/{session_id}")
def ai_debrief(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI coaching debrief for a completed session."""
    debrief = get_post_session_debrief(current_user.id, session_id, db)
    return {"debrief_text": debrief}


@router.get("/api/ai/weekly-summary")
def ai_weekly_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-generated weekly training summary."""
    result = get_weekly_summary(current_user.id, db)
    return result


@router.post("/api/ai/generate-plan")
def ai_generate_plan(
    body: GeneratePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a personalized weekly workout plan."""
    result = generate_workout_plan(
        current_user.id,
        body.goal,
        body.days_per_week,
        body.equipment,
        db,
    )
    return result


@router.get("/api/ai/plateau-check/{exercise_name}")
def ai_plateau_check(
    exercise_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if user has plateaued on a given exercise."""
    plateau_data = check_plateau(exercise_name, current_user.id, db)

    # Add AI explanation if plateau detected
    if plateau_data.get("is_plateau"):
        try:
            from app.services.ai_coach import chat_with_coach
            explanation = chat_with_coach(
                current_user.id,
                f"I've plateaued on {exercise_name}. The recommended protocol is {plateau_data.get('protocol')}. "
                f"Can you explain why and give me specific actionable steps in 2-3 sentences?",
                [],
                db,
            )
            plateau_data["ai_explanation"] = explanation
        except Exception:
            plateau_data["ai_explanation"] = plateau_data.get("ui_alert", "")

    return plateau_data


# ── Readiness Endpoints ───────────────────────────────────────────────────────

@router.post("/api/readiness")
def log_readiness(
    body: ReadinessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log daily readiness check-in."""
    if not 1 <= body.score <= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score must be between 1 and 5",
        )

    log = ReadinessLog(
        user_id=current_user.id,
        score=body.score,
        notes=body.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "id": log.id,
        "score": log.score,
        "logged_at": log.logged_at.isoformat() if log.logged_at else None,
        "notes": log.notes,
    }


@router.get("/api/readiness/today")
def get_today_readiness(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's readiness score."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    record = (
        db.query(ReadinessLog)
        .filter(
            ReadinessLog.user_id == current_user.id,
            ReadinessLog.logged_at >= cutoff,
        )
        .order_by(ReadinessLog.logged_at.desc())
        .first()
    )

    if not record:
        return {"score": None, "logged_today": False}

    return {
        "score": record.score,
        "logged_today": True,
        "logged_at": record.logged_at.isoformat() if record.logged_at else None,
        "notes": record.notes,
    }


# ── Coach / Recovery Endpoints ────────────────────────────────────────────────

@router.get("/api/coach/recovery-heatmap")
def recovery_heatmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full muscle fatigue heatmap."""
    heatmap = calculate_muscle_fatigue(current_user.id, db)
    return {"heatmap": heatmap}


@router.get("/api/coach/next-targets/{exercise_name}")
def next_targets(
    exercise_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-calculated next session targets for an exercise."""
    result = calculate_next_targets(exercise_name, current_user.id, db)
    return result
