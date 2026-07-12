"""Seed workout templates into the database."""
import json
import sqlite3

# Load workout programs
with open('/home/noki/workout_programs.json', 'r') as f:
    programs = json.load(f)

conn = sqlite3.connect('/home/noki/gymtrack-data/gymtrack.db')
cursor = conn.cursor()

# Get admin user (api_test)
cursor.execute("SELECT id FROM users WHERE username = 'api_test'")
user_id = cursor.fetchone()[0]

for program in programs['workout_programs']:
    # Create template
    cursor.execute("""
        INSERT INTO workout_templates (user_id, name, description, split_type, days_per_week, duration_weeks, is_public, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
    """, (
        user_id,
        program['template_name'],
        program.get('description', ''),
        program['template_name'].split('(')[0].strip().replace(' ', '_').lower(),
        len(program['exercises']),
        12
    ))
    template_id = cursor.lastrowid
    
    # Add exercises for each workout day
    for day_idx, workout_day in enumerate(program['exercises']):
        for ex_idx, exercise in enumerate(workout_day['exercises']):
            cursor.execute("""
                INSERT INTO template_exercises 
                (template_id, exercise_name, exercise_name_cn, day_of_week, sort_order, target_sets, target_reps, rest_seconds, is_warmup)
                VALUES (?, ?, NULL, ?, ?, ?, ?, 90, 0)
            """, (
                template_id,
                exercise['name'],
                day_idx,
                ex_idx,
                exercise['sets'],
                str(exercise['reps'])
            ))

conn.commit()
conn.close()
print("Seeded workout templates successfully!")