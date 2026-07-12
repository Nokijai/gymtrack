"""Program Builder & Training Calendar API endpoints."""
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db, User
from app.auth import get_current_user
from app.feature_models import (
    WorkoutTemplate, TemplateExercise,
    TrainingProgram, ProgramWeek, ProgramWorkout,
)
from app.schemas_programs import (
    WorkoutTemplateCreate, WorkoutTemplateResponse, WorkoutTemplateUpdate, WorkoutTemplateList,
    TrainingProgramCreate, TrainingProgramResponse, TrainingProgramUpdate, TrainingProgramList,
    ProgramWorkoutCreate, ProgramWorkoutUpdate, ProgramWorkoutResponse,
    ProgramWeekResponse,
    CalendarView, CalendarMonth, CalendarWeek, CalendarDay,
)

router = APIRouter(prefix="/api", tags=["Program Builder"])


# ═══════════════════════════════════════════════
# Workout Templates
# ═══════════════════════════════════════════════

@router.post("/templates", response_model=WorkoutTemplateResponse, status_code=201)
def create_template(
    template: WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new workout template with exercises."""
    db_template = WorkoutTemplate(
        user_id=current_user.id,
        name=template.name,
        description=template.description,
        split_type=template.split_type,
        days_per_week=template.days_per_week,
        duration_weeks=template.duration_weeks,
        is_public=template.is_public,
        is_active=True,
    )
    db.add(db_template)
    db.flush()

    for i, ex in enumerate(template.exercises):
        db_ex = TemplateExercise(
            template_id=db_template.id,
            exercise_name=ex.exercise_name,
            exercise_name_cn=ex.exercise_name_cn,
            day_of_week=ex.day_of_week,
            sort_order=ex.sort_order,
            target_sets=ex.target_sets,
            target_reps=ex.target_reps,
            target_rpe=ex.target_rpe,
            rest_seconds=ex.rest_seconds,
            is_warmup=ex.is_warmup,
            notes=ex.notes,
        )
        db.add(db_ex)

    db.commit()
    db.refresh(db_template)
    return db_template


@router.get("/templates", response_model=WorkoutTemplateList)
def list_templates(
    include_public: bool = Query(default=True),
    split_type: Optional[str] = Query(None, max_length=50),
    search: Optional[str] = Query(None, max_length=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List workout templates (own + optionally public ones)."""
    query = db.query(WorkoutTemplate).options(
        joinedload(WorkoutTemplate.exercises)
    )

    if include_public:
        query = query.filter(
            (WorkoutTemplate.user_id == current_user.id) |
            (WorkoutTemplate.is_public == True)
        )
    else:
        query = query.filter(WorkoutTemplate.user_id == current_user.id)

    if split_type:
        query = query.filter(WorkoutTemplate.split_type == split_type)
    if search:
        query = query.filter(WorkoutTemplate.name.ilike(f"%{search}%"))

    total = query.count()
    templates = query.order_by(WorkoutTemplate.updated_at.desc()).offset(skip).limit(limit).all()

    # Deduplicate (joinedload can cause duplicates)
    seen = set()
    unique_templates = []
    for t in templates:
        if t.id not in seen:
            seen.add(t.id)
            unique_templates.append(t)

    return WorkoutTemplateList(templates=unique_templates, total=total)


@router.get("/templates/{template_id}", response_model=WorkoutTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific workout template."""
    template = db.query(WorkoutTemplate).options(
        joinedload(WorkoutTemplate.exercises)
    ).filter(WorkoutTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_id != current_user.id and not template.is_public:
        raise HTTPException(status_code=403, detail="Not authorized to view this template")

    return template


@router.put("/templates/{template_id}", response_model=WorkoutTemplateResponse)
def update_template(
    template_id: int,
    template_update: WorkoutTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a workout template."""
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this template")

    update_data = template_update.model_dump(exclude_unset=True)
    exercises_data = update_data.pop("exercises", None)

    for field, value in update_data.items():
        setattr(template, field, value)

    if exercises_data is not None:
        db.query(TemplateExercise).filter(
            TemplateExercise.template_id == template_id
        ).delete()
        for i, ex in enumerate(exercises_data):
            db_ex = TemplateExercise(
                template_id=template_id,
                exercise_name=ex.exercise_name,
                exercise_name_cn=ex.exercise_name_cn,
                day_of_week=ex.day_of_week,
                sort_order=ex.sort_order,
                target_sets=ex.target_sets,
                target_reps=ex.target_reps,
                target_rpe=ex.target_rpe,
                rest_seconds=ex.rest_seconds,
                is_warmup=ex.is_warmup,
                notes=ex.notes,
            )
            db.add(db_ex)

    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a workout template."""
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")

    db.query(TemplateExercise).filter(TemplateExercise.template_id == template_id).delete()
    db.delete(template)
    db.commit()


# ═══════════════════════════════════════════════
# Training Programs
# ═══════════════════════════════════════════════

@router.post("/programs", response_model=TrainingProgramResponse, status_code=201)
def create_program(
    program: TrainingProgramCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new training program."""
    # Parse dates from string if provided
    start_date_str = program.start_date.strftime("%Y-%m-%d") if program.start_date else None
    end_date_str = program.end_date.strftime("%Y-%m-%d") if program.end_date else None

    db_program = TrainingProgram(
        user_id=current_user.id,
        name=program.name,
        goal=program.goal,
        template_id=program.template_id,
        start_date=start_date_str,
        end_date=end_date_str,
        total_weeks=program.total_weeks,
        status=program.status,
        current_week=1,
    )
    db.add(db_program)
    db.flush()

    # Auto-create week structure
    for w in range(program.total_weeks):
        db_week = ProgramWeek(
            program_id=db_program.id,
            week_number=w + 1,
            week_type="normal",
            is_completed=False,
            scheduled_sessions=0,
            completed_sessions=0,
            adherence_pct=0.0,
        )
        db.add(db_week)

    db.commit()
    return _load_program_with_weeks(db, db_program.id, current_user.id)


@router.get("/programs", response_model=TrainingProgramList)
def list_programs(
    active_only: bool = Query(default=False),
    goal: Optional[str] = Query(None, max_length=200),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List training programs for the current user."""
    query = db.query(TrainingProgram).filter(
        TrainingProgram.user_id == current_user.id
    )

    if active_only:
        query = query.filter(TrainingProgram.status == "active")
    if goal:
        query = query.filter(TrainingProgram.goal.ilike(f"%{goal}%"))

    total = query.count()
    programs = query.order_by(TrainingProgram.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for p in programs:
        result.append(_load_program_with_weeks(db, p.id, current_user.id))

    return TrainingProgramList(programs=result, total=total)


@router.get("/programs/{program_id}", response_model=TrainingProgramResponse)
def get_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific training program with all weeks and workouts."""
    program = _load_program_with_weeks(db, program_id, current_user.id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program


@router.put("/programs/{program_id}", response_model=TrainingProgramResponse)
def update_program(
    program_id: int,
    program_update: TrainingProgramUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a training program."""
    program = db.query(TrainingProgram).filter(TrainingProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if program.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this program")

    update_data = program_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(program, field, value)

    db.commit()
    return _load_program_with_weeks(db, program_id, current_user.id)


@router.delete("/programs/{program_id}", status_code=204)
def delete_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a training program and all its weeks/workouts."""
    program = db.query(TrainingProgram).filter(TrainingProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if program.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this program")

    # Cascade delete handles weeks → workouts
    for week in program.weeks:
        db.query(ProgramWorkout).filter(ProgramWorkout.week_id == week.id).delete()
    db.query(ProgramWeek).filter(ProgramWeek.program_id == program_id).delete()
    db.delete(program)
    db.commit()


# ═══════════════════════════════════════════════
# Program Workouts
# ═══════════════════════════════════════════════

@router.post("/programs/{program_id}/weeks/{week_number}/workouts", response_model=ProgramWorkoutResponse, status_code=201)
def add_program_workout(
    program_id: int,
    week_number: int,
    workout: ProgramWorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a workout to a program week."""
    program = db.query(TrainingProgram).filter(TrainingProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if program.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    week = db.query(ProgramWeek).filter(
        ProgramWeek.program_id == program_id,
        ProgramWeek.week_number == week_number,
    ).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found in program")

    db_workout = ProgramWorkout(
        week_id=week.id,
        program_id=program_id,
        week_number=week_number,
        day_number=workout.day_number,
        scheduled_date=workout.scheduled_date.strftime("%Y-%m-%d"),
        workout_template_id=workout.workout_template_id,
        is_rest_day=workout.is_rest_day,
        notes=workout.notes,
        completed=False,
    )
    db.add(db_workout)
    db.flush()

    # Update week stats
    week.scheduled_sessions = db.query(func.count(ProgramWorkout.id)).filter(
        ProgramWorkout.week_id == week.id,
        ProgramWorkout.is_rest_day == False,
    ).scalar() or 0
    week.completed_sessions = db.query(func.count(ProgramWorkout.id)).filter(
        ProgramWorkout.week_id == week.id,
        ProgramWorkout.completed == True,
    ).scalar() or 0
    week.adherence_pct = (week.completed_sessions / week.scheduled_sessions * 100) if week.scheduled_sessions > 0 else 0.0

    db.commit()
    db.refresh(db_workout)
    return db_workout


@router.put("/programs/{program_id}/workouts/{workout_id}", response_model=ProgramWorkoutResponse)
def update_program_workout(
    program_id: int,
    workout_id: int,
    workout_update: ProgramWorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a scheduled workout in a program."""
    program = db.query(TrainingProgram).filter(TrainingProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if program.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    workout = db.query(ProgramWorkout).filter(
        ProgramWorkout.id == workout_id,
        ProgramWorkout.program_id == program_id,
    ).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    update_data = workout_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout, field, value)

    db.commit()
    db.refresh(workout)
    return workout


@router.post("/programs/{program_id}/workouts/{workout_id}/complete", response_model=ProgramWorkoutResponse)
def mark_workout_complete(
    program_id: int,
    workout_id: int,
    session_id: Optional[int] = Query(None, description="Link to the actual workout session"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a program workout as completed."""
    program = db.query(TrainingProgram).filter(TrainingProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if program.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    workout = db.query(ProgramWorkout).filter(
        ProgramWorkout.id == workout_id,
        ProgramWorkout.program_id == program_id,
    ).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    workout.completed = True
    workout.completed_at = datetime.utcnow()
    if session_id:
        workout.actual_session_id = session_id

    # Update week stats
    week = db.query(ProgramWeek).filter(ProgramWeek.id == workout.week_id).first()
    if week:
        week.completed_sessions = db.query(func.count(ProgramWorkout.id)).filter(
            ProgramWorkout.week_id == week.id,
            ProgramWorkout.completed == True,
        ).scalar() or 0
        week.adherence_pct = (week.completed_sessions / week.scheduled_sessions * 100) if week.scheduled_sessions > 0 else 0.0
        if week.completed_sessions >= week.scheduled_sessions and week.scheduled_sessions > 0:
            week.is_completed = True

    db.commit()
    db.refresh(workout)
    return workout


# ═══════════════════════════════════════════════
# Calendar View
# ═══════════════════════════════════════════════

@router.get("/calendar", response_model=CalendarView)
def get_calendar(
    year: Optional[int] = Query(None, ge=2024, le=2099),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get calendar view showing planned workouts and actual sessions."""
    today = date.today()
    year = year or today.year
    month = month or today.month

    # Get active programs
    programs = db.query(TrainingProgram).options(
        joinedload(TrainingProgram.weeks).joinedload(ProgramWeek.workouts)
    ).filter(
        TrainingProgram.user_id == current_user.id,
        TrainingProgram.status == "active",
    ).all()

    month_start = date(year, month, 1)
    if month == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, month + 1, 1) - timedelta(days=1)

    # Collect program workouts for this month
    program_workouts_by_date = {}
    for prog in programs:
        for week in prog.weeks:
            for wkt in week.workouts:
                try:
                    wkt_date = datetime.strptime(wkt.scheduled_date, "%Y-%m-%d").date()
                    if month_start <= wkt_date <= month_end:
                        program_workouts_by_date[wkt_date] = wkt
                except (ValueError, TypeError):
                    pass

    # Build calendar weeks
    weeks = []
    total_planned = len(program_workouts_by_date)
    total_completed = sum(1 for w in program_workouts_by_date.values() if w.completed and not w.is_rest_day)

    current = month_start - timedelta(days=month_start.weekday())

    while current <= month_end:
        week_end = current + timedelta(days=6)
        days = []
        week_workouts = 0
        week_completed = 0

        for i in range(7):
            day_date = current + timedelta(days=i)
            pw = program_workouts_by_date.get(day_date)

            from app.database import WorkoutSession
            actual_session = db.query(WorkoutSession).filter(
                WorkoutSession.user_id == current_user.id,
                func.date(WorkoutSession.started_at) == day_date,
            ).first()

            day = CalendarDay(
                date=day_date,
                has_program_workout=pw is not None and not pw.is_rest_day,
                program_workout=pw,
                has_actual_session=actual_session is not None,
                actual_session_id=actual_session.id if actual_session else None,
                is_rest_day=pw.is_rest_day if pw else False,
                notes=pw.notes if pw else None,
            )
            days.append(day)

            if pw and not pw.is_rest_day:
                week_workouts += 1
                if pw.completed:
                    week_completed += 1

        weeks.append(CalendarWeek(
            week_start=current,
            week_end=week_end,
            days=days,
            adherence_score=(week_completed / week_workouts * 100) if week_workouts > 0 else None,
        ))

        current += timedelta(days=7)

    calendar_month = CalendarMonth(
        month=month,
        year=year,
        weeks=weeks,
        total_workouts_planned=total_planned,
        total_workouts_completed=total_completed,
        overall_adherence=(total_completed / total_planned * 100) if total_planned > 0 else 0,
    )

    program_responses = []
    for p in programs:
        program_responses.append(_load_program_with_weeks(db, p.id, current_user.id))

    return CalendarView(
        programs=program_responses,
        calendar=calendar_month,
    )


# ═══════════════════════════════════════════════
# AI Program Generation
# ═══════════════════════════════════════════════

@router.post("/programs/generate", response_model=TrainingProgramResponse)
def generate_program_with_ai(
    goal: str = Query(..., max_length=200),
    weeks: int = Query(default=8, ge=4, le=24),
    sessions_per_week: int = Query(default=4, ge=2, le=7),
    experience_level: str = Query(default="intermediate", max_length=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a training program structure using AI-based recommendations."""
    today = date.today()
    end_date = today + timedelta(weeks=weeks)

    db_program = TrainingProgram(
        user_id=current_user.id,
        name=f"{goal.replace('_', ' ').title()} Program ({weeks}w)",
        goal=goal,
        total_weeks=weeks,
        start_date=today.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d"),
        status="active",
        current_week=1,
    )
    db.add(db_program)
    db.flush()

    # Create weeks with evenly-spaced training days
    rest_days_per_week = 7 - sessions_per_week
    gap = 7 // sessions_per_week if sessions_per_week > 0 else 1

    for w in range(weeks):
        db_week = ProgramWeek(
            program_id=db_program.id,
            week_number=w + 1,
            week_type="normal",
            is_completed=False,
            scheduled_sessions=sessions_per_week,
            completed_sessions=0,
            adherence_pct=0.0,
        )
        db.add(db_week)
        db.flush()

        week_start = today + timedelta(weeks=w)
        training_day_idx = 0
        scheduled_count = 0

        for d in range(7):
            day_date = week_start + timedelta(days=d)
            is_training = training_day_idx < sessions_per_week and (
                d % (gap + 1) == 0 or scheduled_count < sessions_per_week
            )

            if is_training:
                scheduled_count += 1

            if is_training and scheduled_count <= sessions_per_week:
                training_day_idx += 1

            db_workout = ProgramWorkout(
                week_id=db_week.id,
                program_id=db_program.id,
                week_number=w + 1,
                day_number=d + 1,
                scheduled_date=day_date.strftime("%Y-%m-%d"),
                is_rest_day=not is_training,
                notes="Rest day — recovery and mobility" if not is_training else None,
                completed=False,
            )
            db.add(db_workout)

        db_week.scheduled_sessions = scheduled_count

    db.commit()
    return _load_program_with_weeks(db, db_program.id, current_user.id)


# ═══════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════

def _load_program_with_weeks(db: Session, program_id: int, user_id: int) -> Optional[TrainingProgram]:
    """Load a program with all weeks, workouts, and adherence calculation."""
    program = db.query(TrainingProgram).options(
        joinedload(TrainingProgram.weeks).joinedload(ProgramWeek.workouts),
    ).filter(
        TrainingProgram.id == program_id,
        TrainingProgram.user_id == user_id,
    ).first()

    if not program:
        return None

    today = date.today()

    # Calculate current week based on start date
    if program.start_date:
        try:
            start = datetime.strptime(program.start_date, "%Y-%m-%d").date()
            days_since_start = (today - start).days
            program.current_week = max(1, min(
                (days_since_start // 7) + 1,
                program.total_weeks
            ))
        except (ValueError, TypeError):
            program.current_week = 1
    else:
        program.current_week = 1

    # Calculate adherence for each week
    total_workouts = 0
    total_completed = 0

    for week in program.weeks:
        week_workouts = sum(1 for w in week.workouts if not w.is_rest_day)
        week_done = sum(1 for w in week.workouts if w.completed and not w.is_rest_day)

        week.scheduled_sessions = week_workouts
        week.completed_sessions = week_done
        week.adherence_pct = (week_done / week_workouts * 100) if week_workouts > 0 else 100.0

        total_workouts += week_workouts
        total_completed += week_done

    program.overall_adherence = (total_completed / total_workouts * 100) if total_workouts > 0 else 100.0

    return program