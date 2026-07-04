"""
Muscle Fatigue Engine
Uses exponential decay model to estimate current fatigue per muscle group.
"""
from __future__ import annotations
import math
import datetime
from sqlalchemy.orm import Session
from app.database import WorkoutSession, Exercise, ExerciseSet, ExerciseMuscleImpact, MuscleGroup


def calculate_muscle_fatigue(user_id: int, db: Session) -> dict:
    """
    Calculate current muscle fatigue for all muscle groups.

    Returns:
        {muscle_id: {fatigue_pct, state, name_en, name_cn}}
    """
    now = datetime.datetime.utcnow()
    cutoff = now - datetime.timedelta(days=7)

    # Load all muscle groups
    muscle_groups = db.query(MuscleGroup).all()
    mg_map = {mg.id: mg for mg in muscle_groups}

    # Accumulate raw fatigue per muscle
    fatigue_raw: dict[str, float] = {mg.id: 0.0 for mg in muscle_groups}

    # Query recent sessions
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date >= cutoff.strftime("%Y-%m-%d"),
        )
        .all()
    )

    for session in sessions:
        # Parse session date to datetime
        try:
            session_dt = datetime.datetime.strptime(session.date, "%Y-%m-%d")
        except ValueError:
            continue

        for exercise in session.exercises:
            ex_name_lower = exercise.name.lower().strip()

            # Get muscle impacts for this exercise
            impacts = (
                db.query(ExerciseMuscleImpact)
                .filter(ExerciseMuscleImpact.exercise_name == ex_name_lower)
                .all()
            )

            # Also try with underscores/spaces variant
            if not impacts:
                alt_name = ex_name_lower.replace(" ", "_")
                impacts = (
                    db.query(ExerciseMuscleImpact)
                    .filter(ExerciseMuscleImpact.exercise_name == alt_name)
                    .all()
                )
            if not impacts:
                alt_name = ex_name_lower.replace("_", " ")
                impacts = (
                    db.query(ExerciseMuscleImpact)
                    .filter(ExerciseMuscleImpact.exercise_name == alt_name)
                    .all()
                )

            if not impacts:
                continue

            # Calculate volume for this exercise
            volume = 0.0
            if exercise.set_list:
                for es in exercise.set_list:
                    w = float(es.weight_kg or 0)
                    r = float(es.reps or 0)
                    volume += w * r
            else:
                w = float(exercise.weight_kg or 0)
                r = float(exercise.reps or 0)
                s = float(exercise.sets or 1)
                volume = w * r * s

            if volume == 0:
                # Use rep-only volume for bodyweight/cardio
                if exercise.set_list:
                    for es in exercise.set_list:
                        volume += float(es.reps or 1)
                else:
                    volume = float((exercise.sets or 1) * (exercise.reps or 1))

            # Hours since this session
            hours_since = max(0.0, (now - session_dt).total_seconds() / 3600.0)

            # Apply exponential decay per muscle
            for impact in impacts:
                mg = mg_map.get(str(impact.muscle_group_id))
                if not mg:
                    continue

                half_life = float(mg.half_life_hours or 48)
                lam = math.log(2) / half_life  # decay constant
                impact_factor = 1.0 if bool(impact.is_primary) else 0.4

                # fatigue contribution: volume × impact × e^(-λt)
                contribution = volume * impact_factor * math.exp(-lam * hours_since)
                fatigue_raw[str(mg.id)] += contribution

    # Normalize: find max value and scale to 0–100
    max_val = max(fatigue_raw.values()) if fatigue_raw else 1.0
    if max_val == 0:
        max_val = 1.0

    result = {}
    for mg in muscle_groups:
        raw = fatigue_raw.get(mg.id, 0.0)
        pct = min(100.0, (raw / max_val) * 100.0)

        if pct <= 20:
            state = "fresh"
        elif pct <= 60:
            state = "training"
        else:
            state = "danger"

        result[mg.id] = {
            "fatigue_pct": round(pct, 1),
            "state": state,
            "name_en": mg.name_en,
            "name_cn": mg.name_cn,
            "category": mg.category,
            "half_life_hours": mg.half_life_hours,
        }

    return result
