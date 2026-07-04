"""
Progressive Overload Engine
Calculates next session targets based on last session performance + RPE.
"""
from __future__ import annotations
from typing import Optional
from sqlalchemy.orm import Session
from app.database import Exercise, ExerciseSet, WorkoutSession


def _round_to_nearest(value: float, step: float = 2.5) -> float:
    """Round weight to nearest increment (default 2.5 kg)."""
    return round(round(value / step) * step, 2)


def calculate_next_targets(exercise_name: str, user_id: int, db: Session) -> dict:
    """
    Given an exercise name and user, find the last session's sets and
    compute recommended weight/reps for the next session.

    Returns: {weight, reps, sets, msg, confidence}
    """
    # Find the most recent session where this exercise was logged for this user
    last_exercise = (
        db.query(Exercise)
        .join(WorkoutSession, Exercise.session_id == WorkoutSession.id)
        .filter(
            WorkoutSession.user_id == user_id,
            Exercise.name.ilike(f"%{exercise_name}%"),
        )
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .first()
    )

    if not last_exercise:
        return {
            "weight": None,
            "reps": None,
            "sets": 3,
            "msg": "No previous data found. Start light and build up!",
            "confidence": 0.0,
        }

    sets = last_exercise.set_list
    if not sets:
        # Fall back to legacy aggregate data
        return {
            "weight": last_exercise.weight_kg,
            "reps": last_exercise.reps,
            "sets": last_exercise.sets,
            "msg": "Based on last session (no set detail available).",
            "confidence": 0.5,
        }

    # Calculate performance metrics
    total_sets = len(sets)
    completed_sets = sum(
        1 for s in sets
        if s.reps is not None and (
            s.target_reps is None or s.reps >= s.target_reps
        )
    )

    # RPE average (ignore None)
    rpe_values = [s.rpe for s in sets if s.rpe is not None]
    avg_rpe = sum(rpe_values) / len(rpe_values) if rpe_values else None

    # Weight and reps from last session
    last_weights = [s.weight_kg for s in sets if s.weight_kg is not None]
    last_reps_list = [s.reps for s in sets if s.reps is not None]

    base_weight = last_weights[-1] if last_weights else (last_exercise.weight_kg or 20.0)
    base_reps = last_reps_list[-1] if last_reps_list else (last_exercise.reps or 8)

    # Target reps (what was planned)
    target_reps_vals = [s.target_reps for s in sets if s.target_reps is not None]
    target_reps = target_reps_vals[0] if target_reps_vals else base_reps

    # Calculate reps missed
    actual_total = sum(last_reps_list)
    target_total = target_reps * total_sets
    reps_missed = max(0, target_total - actual_total) if last_reps_list else 0

    all_completed = completed_sets == total_sets

    # ── Apply progression logic ───────────────────────────────────────────
    if not all_completed and reps_missed > 2:
        # Missed by more than 2 reps total → deload
        new_weight = _round_to_nearest(base_weight * 0.90)
        new_reps = target_reps
        msg = f"Deload to {new_weight}kg — missed target by {reps_missed} reps. Focus on form and build back up."
        confidence = 0.9

    elif not all_completed and reps_missed <= 2:
        # Missed by ≤ 2 → hold steady
        new_weight = base_weight
        new_reps = target_reps
        msg = f"Hold at {new_weight}kg × {new_reps} — almost there, hit the target this session!"
        confidence = 0.85

    elif all_completed and avg_rpe is not None and avg_rpe <= 7:
        # All done + easy → +5% weight
        new_weight = _round_to_nearest(base_weight * 1.05)
        new_reps = base_reps
        msg = f"Great effort (RPE {avg_rpe:.1f})! Increase to {new_weight}kg — you have room to grow."
        confidence = 0.95

    elif all_completed and avg_rpe is not None and avg_rpe <= 8:
        # All done + moderate → +2.5% weight
        new_weight = _round_to_nearest(base_weight * 1.025)
        new_reps = base_reps
        msg = f"Solid session (RPE {avg_rpe:.1f})! Small bump to {new_weight}kg."
        confidence = 0.90

    elif all_completed and avg_rpe is not None and avg_rpe >= 9:
        # All done but hard → hold weight, add 1 rep
        new_weight = base_weight
        new_reps = base_reps + 1
        msg = f"Tough session (RPE {avg_rpe:.1f})! Keep weight, push for {new_reps} reps instead."
        confidence = 0.85

    else:
        # No RPE data, all completed → conservative +2.5%
        new_weight = _round_to_nearest(base_weight * 1.025)
        new_reps = base_reps
        msg = f"Good work! Slight increase to {new_weight}kg."
        confidence = 0.70

    return {
        "weight": new_weight,
        "reps": new_reps,
        "sets": total_sets,
        "msg": msg,
        "confidence": confidence,
        "last_weight": base_weight,
        "last_reps": base_reps,
        "last_avg_rpe": avg_rpe,
    }
