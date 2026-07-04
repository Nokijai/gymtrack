"""
Plateau Detection Engine
Detects training plateaus using e1RM trend analysis across recent sessions.
"""
from __future__ import annotations
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.database import WorkoutSession, Exercise, ExerciseSet, ReadinessLog


def _e1rm(weight: float, reps: int) -> float:
    """Epley formula: e1RM = weight / (1.0278 - 0.0278 × reps)"""
    if reps <= 0:
        return 0.0
    denominator = 1.0278 - 0.0278 * reps
    if denominator <= 0:
        return weight  # fallback for very high reps
    return weight / denominator


def check_plateau(exercise_name: str, user_id: int, db: Session) -> dict:
    """
    Detect if a user has plateaued on a given exercise.

    Returns: {is_plateau, protocol, prescription, ui_alert}
    """
    # Query last 6 sessions where this exercise appeared
    exercises_with_sessions = (
        db.query(Exercise, WorkoutSession)
        .join(WorkoutSession, Exercise.session_id == WorkoutSession.id)
        .filter(
            WorkoutSession.user_id == user_id,
            Exercise.name.ilike(f"%{exercise_name}%"),
        )
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .limit(6)
        .all()
    )

    if len(exercises_with_sessions) < 4:
        return {
            "is_plateau": False,
            "protocol": None,
            "prescription": None,
            "ui_alert": None,
            "sessions_analyzed": len(exercises_with_sessions),
            "e1rm_history": [],
            "msg": "Not enough data — need at least 4 sessions to detect plateau.",
        }

    # Calculate e1RM per session
    e1rm_values = []
    for exercise, session in exercises_with_sessions:
        # Get best set (highest e1RM) from this session
        best_e1rm = 0.0
        if exercise.set_list:
            for es in exercise.set_list:
                w = float(es.weight_kg or 0)
                r = int(es.reps or 0)
                if w > 0 and r > 0:
                    e1rm = _e1rm(w, r)
                    best_e1rm = max(best_e1rm, e1rm)
        else:
            w = float(exercise.weight_kg or 0)
            r = int(exercise.reps or 0)
            if w > 0 and r > 0:
                best_e1rm = _e1rm(w, r)

        if best_e1rm > 0:
            e1rm_values.append({
                "date": str(session.date),
                "e1rm": round(best_e1rm, 1),
            })

    if len(e1rm_values) < 4:
        return {
            "is_plateau": False,
            "protocol": None,
            "prescription": None,
            "ui_alert": None,
            "sessions_analyzed": len(e1rm_values),
            "e1rm_history": e1rm_values,
            "msg": "Not enough valid weight/rep data to detect plateau.",
        }

    # Check last 4 values for stagnation (within 1% of each other)
    last_4 = [v["e1rm"] for v in e1rm_values[:4]]
    avg = sum(last_4) / len(last_4)
    max_deviation = max(abs(v - avg) / avg for v in last_4) if avg > 0 else 0

    is_plateau = max_deviation < 0.01  # within 1%

    if not is_plateau:
        return {
            "is_plateau": False,
            "protocol": None,
            "prescription": None,
            "ui_alert": None,
            "sessions_analyzed": len(e1rm_values),
            "e1rm_history": e1rm_values,
            "msg": f"Progressing normally. e1RM variation: {max_deviation*100:.1f}%",
        }

    # ── Plateau detected — determine intervention ────────────────────────────

    # Get avg readiness from last 14 days
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=14)
    readiness_records = (
        db.query(ReadinessLog)
        .filter(
            ReadinessLog.user_id == user_id,
            ReadinessLog.logged_at >= cutoff,
        )
        .all()
    )

    avg_readiness = None
    if readiness_records:
        avg_readiness = sum(r.score for r in readiness_records) / len(readiness_records)

    # Current e1RM
    current_e1rm = last_4[0]

    # Intervention decision tree
    if avg_readiness is not None and avg_readiness < 3.0:
        # Low readiness → deload protocol
        protocol = "deload"
        prescription = {
            "action": "Deload Week",
            "weight_pct": 0.70,
            "target_reps": "10-12",
            "sets": 3,
            "notes": "Reduce weight to 70% of current max. Focus on movement quality and recovery.",
        }
        ui_alert = f"⚠️ Plateau detected on {exercise_name}. Your recovery score is low — recommend a deload week to let your body reset."

    elif avg_readiness is None or avg_readiness >= 4.0:
        # Good readiness → step-loading protocol
        protocol = "step_loading"
        prescription = {
            "action": "Step Loading",
            "approach": "waves",
            "wave_1": "3×3 @ 95% e1RM",
            "wave_2": "3×5 @ 85% e1RM",
            "wave_3": "3×8 @ 75% e1RM",
            "notes": "Use wave loading to break through the plateau with varied intensity.",
        }
        ui_alert = f"📊 Plateau detected on {exercise_name}. Try wave loading: vary your rep ranges each set to break through."

    else:
        # Moderate readiness → rep pivot
        protocol = "rep_pivot"
        prescription = {
            "action": "Rep Range Pivot",
            "current_range": "estimated 6-8",
            "new_range": "10-15",
            "weight_pct": 0.80,
            "notes": "Switch to higher rep range with slightly less weight to accumulate more volume and bust the plateau.",
        }
        ui_alert = f"📈 Plateau detected on {exercise_name}. Switch to higher reps (10-15) with 80% weight to break through."

    return {
        "is_plateau": True,
        "protocol": protocol,
        "prescription": prescription,
        "ui_alert": ui_alert,
        "sessions_analyzed": len(e1rm_values),
        "e1rm_history": e1rm_values,
        "current_e1rm": round(current_e1rm, 1),
        "avg_readiness": round(avg_readiness, 1) if avg_readiness else None,
        "deviation_pct": round(max_deviation * 100, 2),
        "msg": f"Plateau detected — e1RM stuck at ~{round(current_e1rm, 1)}kg for last 4 sessions.",
    }
