"""
AI Personal Coach Service
Uses OpenAI-compatible API (DeepSeek V3) for personalized coaching responses.
"""
from __future__ import annotations
import os
import json
import datetime
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.database import WorkoutSession, Exercise, ExerciseSet, ReadinessLog, User
from app.engine_fatigue import calculate_muscle_fatigue
from app.engine_overload import calculate_next_targets
from app.engine_plateau import check_plateau

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    _openai_available = True
except ImportError:
    _openai_available = False


# ---- AI Safety Configuration ------------------------------------------------
MEDICAL_ESCALATION_KEYWORDS = [
    "chest pain", "fainting", "severe shortness of breath",
    "dizziness", "numbness", "sharp pain", "heart", "stroke",
    "seizure", "unconscious", "medical emergency"
]

MEDICAL_ESCALATION_RESPONSE = """
⚠️ **Medical Safety Notice**

I noticed you mentioned a potentially serious symptom. For your safety, I cannot provide workout advice for this situation.

**Please consult a medical professional before continuing training.**

If this is a medical emergency, please seek immediate medical attention or call emergency services.

Your health and safety are the top priority.
"""

AI_UNAVAILABLE_RESPONSE = """
AI coach is temporarily unavailable. You can still log workouts and track progress.

**Quick suggestions:**
- Focus on proper form and controlled movements
- Listen to your body and rest when needed
- Stay hydrated and maintain good nutrition

The AI coach will be back soon!
"""


def check_medical_escalation(text: str) -> bool:
    """Check if user input contains medical emergency keywords"""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in MEDICAL_ESCALATION_KEYWORDS)


def sanitize_session_data(session_data: dict) -> dict:
    """Remove PII before sending to AI provider"""
    return {
        "date": session_data.get("date"),
        "duration_min": session_data.get("duration_minutes"),
        "exercises": [
            {
                "name": ex.get("name"),
                "sets": ex.get("sets"),
                "reps": ex.get("reps"),
                "weight_kg": ex.get("weight_kg"),
            }
            for ex in session_data.get("exercises", [])
        ]
    }


def _get_client():
    api_key = os.environ.get("AI_API_KEY", "")
    base_url = os.environ.get("AI_BASE_URL", "https://yuanyuaicloud.cn/v1")
    if not api_key or not _openai_available:
        return None
    return OpenAI(api_key=api_key, base_url=base_url)


def _call_ai(messages: list[dict], max_tokens: int = 600) -> str:
    """Call AI API and return text response. Falls back to helpful message if unavailable."""
    client = _get_client()
    if not client:
        logger.warning("AI client not available")
        return AI_UNAVAILABLE_RESPONSE

    try:
        response = client.chat.completions.create(
            model="glm-5.2",
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        result = response.choices[0].message.content or "No response generated."
        logger.info(f"AI call successful, response length: {len(result)}")
        return result
    except Exception as e:
        logger.error(f"AI call failed: {str(e)[:100]}")
        return AI_UNAVAILABLE_RESPONSE


def _get_recent_sessions_summary(user_id: int, db: Session, days: int = 7) -> list[dict]:
    """Get summary of recent sessions."""
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=days)).strftime("%Y-%m-%d")
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date >= cutoff,
        )
        .order_by(WorkoutSession.date.desc())
        .limit(10)
        .all()
    )

    summaries = []
    for s in sessions:
        exercises_data = []
        for ex in s.exercises:
            sets_info = []
            if ex.set_list:
                for es in ex.set_list:
                    sets_info.append({
                        "set": es.set_number,
                        "weight": es.weight_kg,
                        "reps": es.reps,
                        "rpe": es.rpe,
                    })
            exercises_data.append({
                "name": ex.name,
                "sets": sets_info or [{"weight": ex.weight_kg, "reps": ex.reps}],
            })
        summaries.append({
            "date": s.date,
            "duration_min": s.duration_minutes,
            "exercises": exercises_data,
        })
    return summaries


def _get_readiness_score(user_id: int, db: Session) -> Optional[float]:
    """Get most recent readiness score."""
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    record = (
        db.query(ReadinessLog)
        .filter(
            ReadinessLog.user_id == user_id,
            ReadinessLog.logged_at >= datetime.datetime.utcnow() - datetime.timedelta(hours=24),
        )
        .order_by(ReadinessLog.logged_at.desc())
        .first()
    )
    return float(record.score) if record else None


def get_today_recommendation(user_id: int, db: Session) -> dict:
    """
    Generate a personalized training recommendation for today.
    """
    # Gather context
    heatmap = calculate_muscle_fatigue(user_id, db)
    recent_sessions = _get_recent_sessions_summary(user_id, db, days=7)
    readiness = _get_readiness_score(user_id, db)

    # Get user info
    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else "Athlete"

    # Build fatigue summary for prompt
    fatigue_summary = []
    for muscle_id, data in heatmap.items():
        fatigue_summary.append(f"- {data['name_en']} ({data['name_cn']}): {data['fatigue_pct']}% ({data['state']})")

    # Build sessions summary
    sessions_text = ""
    for s in recent_sessions[:3]:
        ex_names = [e["name"] for e in s["exercises"]]
        sessions_text += f"  • {s['date']} ({s['duration_min']} min): {', '.join(ex_names)}\n"

    readiness_text = f"Today's readiness score: {readiness}/5" if readiness else "No readiness check-in today"

    system_prompt = """You are a professional personal fitness coach with expertise in strength training, periodization, and sports science. 
You give concise, actionable advice based on the athlete's data. 
Respond in the same language as the user's recent data context — use English unless there's clear indication the user prefers another language.
Keep responses practical and motivating."""

    user_message = f"""Athlete: {username}
{readiness_text}

Recent training (last 7 days):
{sessions_text or "No recent sessions logged."}

Current muscle fatigue levels:
{chr(10).join(fatigue_summary)}

Based on this data, what should I train today and why? 
Suggest 3-5 specific exercises I should focus on, considering recovery and muscle balance.
Keep response to 3-4 sentences."""

    ai_response = _call_ai([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ])

    # Build suggested exercises from fresh muscles
    suggested = [
        muscle_id for muscle_id, data in heatmap.items()
        if data["state"] == "fresh"
    ]

    return {
        "recommendation": ai_response,
        "heatmap_summary": heatmap,
        "suggested_exercises": suggested[:5],
        "readiness": readiness,
    }


def get_post_session_debrief(user_id: int, session_id: int, db: Session) -> str:
    """
    Generate coaching debrief for a completed session.
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == user_id,
    ).first()

    if not session:
        return "Session not found."

    # Build session summary
    exercises_summary = []
    overload_insights = []

    for ex in session.exercises:
        sets_detail = []
        if ex.set_list:
            for es in ex.set_list:
                sets_detail.append(f"{es.weight_kg or 0}kg×{es.reps or 0}" + (f" @RPE{es.rpe}" if es.rpe else ""))
        exercises_summary.append(f"- {ex.name}: {', '.join(sets_detail) or f'{ex.sets}×{ex.reps} @ {ex.weight_kg}kg'}")

        # Get overload recommendation
        try:
            next_targets = calculate_next_targets(ex.name, user_id, db)
            if next_targets.get("weight"):
                overload_insights.append(f"  → Next {ex.name}: {next_targets['weight']}kg×{next_targets['reps']}")
        except Exception:
            pass

    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else "Athlete"

    system_prompt = """You are an encouraging personal fitness coach. Give warm, specific, motivating feedback on the completed workout.
Mention specific achievements and give one actionable tip. Keep it to 2-3 sentences. Be enthusiastic but not over the top."""

    user_message = f"""Athlete {username} just completed a workout:
Date: {session.date}
Duration: {session.duration_minutes} minutes

Exercises completed:
{chr(10).join(exercises_summary)}

Next session targets (AI calculation):
{chr(10).join(overload_insights) or "Calculate next time."}

Give a brief, encouraging 2-3 sentence coaching debrief for this session."""

    return _call_ai([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ], max_tokens=200)


def get_weekly_summary(user_id: int, db: Session) -> dict:
    """
    Generate an encouraging weekly summary narrative.
    """
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date >= cutoff,
        )
        .order_by(WorkoutSession.date.desc())
        .all()
    )

    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else "Athlete"

    total_sessions = len(sessions)
    total_minutes = sum(s.duration_minutes for s in sessions)
    total_exercises = sum(len(s.exercises) for s in sessions)

    # Calculate volume
    total_volume = 0.0
    for s in sessions:
        for ex in s.exercises:
            if ex.set_list:
                for es in ex.set_list:
                    total_volume += float(es.weight_kg or 0) * float(es.reps or 0)
            else:
                total_volume += float(ex.weight_kg or 0) * float(ex.reps or 0) * float(ex.sets or 1)

    stats = {
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "total_exercises": total_exercises,
        "total_volume_kg": round(total_volume, 0),
        "xp": user.xp if user else 0,
        "level": user.level if user else 1,
        "streak": user.current_streak if user else 0,
    }

    if total_sessions == 0:
        return {
            "summary_text": f"No workouts logged this week, {username}. The hardest part is starting — get in there and crush it next week! 💪",
            "stats": stats,
        }

    system_prompt = """You are an enthusiastic personal fitness coach writing a weekly progress summary.
Be encouraging, specific, and motivating. Celebrate wins, no matter how small. 
Keep it to 3-4 sentences. End with a motivational note for next week."""

    user_message = f"""Weekly summary for athlete {username}:

This week's stats:
- Sessions completed: {total_sessions}
- Total time: {total_minutes} minutes ({total_minutes/60:.1f} hours)
- Exercises performed: {total_exercises}
- Total volume lifted: {round(total_volume, 0)}kg
- Current XP: {user.xp if user else 0}
- Current level: {user.level if user else 1}
- Streak: {user.current_streak if user else 0} days

Write an encouraging 3-4 sentence weekly narrative summary celebrating their progress and motivating them for next week."""

    summary_text = _call_ai([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ], max_tokens=250)

    return {
        "summary_text": summary_text,
        "stats": stats,
    }


def chat_with_coach(user_id: int, message: str, conversation_history: list[dict], db: Session) -> str:
    """
    Multi-turn chat with AI personal coach.
    """
    # Gather full context
    heatmap = calculate_muscle_fatigue(user_id, db)
    recent_sessions = _get_recent_sessions_summary(user_id, db, days=14)
    readiness = _get_readiness_score(user_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else "Athlete"

    # Fatigue summary
    fatigue_lines = [
        f"- {d['name_en']}: {d['fatigue_pct']}% ({d['state']})"
        for d in heatmap.values()
    ]

    # Sessions summary
    session_lines = []
    for s in recent_sessions[:5]:
        ex_names = [e["name"] for e in s["exercises"]]
        session_lines.append(f"  {s['date']}: {', '.join(ex_names[:4])} ({s['duration_min']}min)")

    system_prompt = f"""You are a knowledgeable, supportive personal fitness coach named Coach AI for athlete {username}.

Current athlete data:
- XP Level: {user.level if user else 1}
- Current streak: {user.current_streak if user else 0} days
- Today's readiness: {f"{readiness}/5" if readiness else "not logged"}

Recent training (last 14 days):
{chr(10).join(session_lines) or "No recent sessions."}

Current muscle recovery status:
{chr(10).join(fatigue_lines)}

You are a personal coach who knows this athlete well. Answer their questions with specific, data-driven advice.
Be conversational, encouraging, and practical. If you don't have enough data to answer something specific, 
say so and give general guidance.
Respond in the same language as the user's message."""

    # Build messages array
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (limit to last 10 messages to stay within context)
    for msg in conversation_history[-10:]:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Check for medical escalation in user message
    if check_medical_escalation(message):
        logger.warning(f"Medical escalation detected for user {user_id}")
        return MEDICAL_ESCALATION_RESPONSE
    
    # Add current message
    messages.append({"role": "user", "content": message})
    
    return _call_ai(messages, max_tokens=500)


def generate_workout_plan(user_id: int, goal: str, days_per_week: int, equipment: list[str], db: Session) -> dict:
    """
    Generate a structured weekly workout plan.
    """
    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else "Athlete"

    equipment_str = ", ".join(equipment) if equipment else "full gym"

    system_prompt = """You are an expert strength and conditioning coach. 
Generate a structured weekly workout plan in JSON format.
The plan must be practical, progressive, and well-balanced.
Return ONLY valid JSON with no extra text."""

    user_message = f"""Create a {days_per_week}-day per week workout plan for athlete {username}.

Goal: {goal}
Equipment available: {equipment_str}
Current level: {user.level if user else 1}/20

Return a JSON object with this exact structure:
{{
  "plan_name": "string",
  "goal": "string",
  "days_per_week": {days_per_week},
  "days": [
    {{
      "day": "Day 1",
      "focus": "muscle groups",
      "exercises": [
        {{
          "name": "Exercise Name",
          "sets": 3,
          "reps": "8-10",
          "rest_seconds": 90,
          "notes": "form tip"
        }}
      ]
    }}
  ],
  "notes": "general plan notes"
}}"""

    response = _call_ai([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ], max_tokens=1500)

    # Try to parse JSON
    try:
        # Extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            plan = json.loads(json_match.group())
            return {"plan": plan, "raw": response}
    except (json.JSONDecodeError, Exception):
        pass

    return {
        "plan": {"raw_text": response},
        "raw": response,
    }
