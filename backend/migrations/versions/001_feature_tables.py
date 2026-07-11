"""Add feature tables

Revision ID: 001
Revises: 
Create Date: 2026-07-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create all new feature tables
    # 1. Workout Templates
    op.create_table('workout_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('split_type', sa.String(50), nullable=True),
        sa.Column('days_per_week', sa.Integer(), nullable=True),
        sa.Column('duration_weeks', sa.Integer(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workout_templates_id'), 'workout_templates', ['id'], unique=False)

    # 2. Template Exercises
    op.create_table('template_exercises',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('exercise_name', sa.String(200), nullable=False),
        sa.Column('exercise_name_cn', sa.String(200), nullable=True),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.Column('target_sets', sa.Integer(), nullable=True),
        sa.Column('target_reps', sa.String(50), nullable=True),
        sa.Column('target_rpe', sa.String(10), nullable=True),
        sa.Column('rest_seconds', sa.Integer(), nullable=True),
        sa.Column('is_warmup', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['workout_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_template_exercises_id'), 'template_exercises', ['id'], unique=False)

    # 3. Training Programs
    op.create_table('training_programs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('goal', sa.String(200), nullable=True),
        sa.Column('start_date', sa.String(10), nullable=True),
        sa.Column('end_date', sa.String(10), nullable=True),
        sa.Column('current_week', sa.Integer(), nullable=True),
        sa.Column('total_weeks', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['workout_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_programs_id'), 'training_programs', ['id'], unique=False)

    # 4. Program Weeks
    op.create_table('program_weeks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('program_id', sa.Integer(), nullable=False),
        sa.Column('week_number', sa.Integer(), nullable=False),
        sa.Column('week_type', sa.String(20), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True),
        sa.Column('scheduled_sessions', sa.Integer(), nullable=True),
        sa.Column('completed_sessions', sa.Integer(), nullable=True),
        sa.Column('adherence_pct', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['program_id'], ['training_programs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_program_weeks_id'), 'program_weeks', ['id'], unique=False)

    # 5. Exercise Library
    op.create_table('exercise_library',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('name_cn', sa.String(200), nullable=True),
        sa.Column('muscle_group', sa.String(50), nullable=True),
        sa.Column('secondary_muscles', sa.String(500), nullable=True),
        sa.Column('equipment', sa.String(50), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=True),
        sa.Column('exercise_type', sa.String(20), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('video_url', sa.String(500), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('has_variant', sa.Boolean(), nullable=True),
        sa.Column('variant_of', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_exercise_library_id'), 'exercise_library', ['id'], unique=False)

    # 6. Exercise Substitutions
    op.create_table('exercise_substitutions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('exercise_name', sa.String(200), nullable=False),
        sa.Column('alternative_name', sa.String(200), nullable=False),
        sa.Column('similarity_score', sa.Float(), nullable=True),
        sa.Column('equipment_match', sa.String(50), nullable=True),
        sa.Column('reason', sa.String(200), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exercise_substitutions_id'), 'exercise_substitutions', ['id'], unique=False)

    # 7. Personal Records
    op.create_table('personal_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('exercise_name', sa.String(200), nullable=False),
        sa.Column('record_type', sa.String(20), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('reps', sa.Integer(), nullable=True),
        sa.Column('set_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('achieved_at', sa.DateTime(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['set_id'], ['exercise_sets.id'], ),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_personal_records_id'), 'personal_records', ['id'], unique=False)

    # 8. Body Measurements
    op.create_table('body_measurements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.String(10), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('body_fat_pct', sa.Float(), nullable=True),
        sa.Column('measurements', sa.JSON(), nullable=True),
        sa.Column('photo_url', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_body_measurements_id'), 'body_measurements', ['id'], unique=False)

    # 9. Social Posts
    op.create_table('social_posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('post_type', sa.String(30), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('like_count', sa.Integer(), nullable=True),
        sa.Column('comment_count', sa.Integer(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_posts_id'), 'social_posts', ['id'], unique=False)

    # 10. Social Likes
    op.create_table('social_likes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['social_posts.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_likes_id'), 'social_likes', ['id'], unique=False)

    # 11. Social Comments
    op.create_table('social_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['social_posts.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_comments_id'), 'social_comments', ['id'], unique=False)

    # 12. Challenges
    op.create_table('challenges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('challenge_type', sa.String(30), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(30), nullable=True),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_challenges_id'), 'challenges', ['id'], unique=False)

    # 13. Challenge Participants
    op.create_table('challenge_participants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_value', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_challenge_participants_id'), 'challenge_participants', ['id'], unique=False)

    # 14. Health Data
    op.create_table('health_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(30), nullable=False),
        sa.Column('data_type', sa.String(30), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(20), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_health_data_id'), 'health_data', ['id'], unique=False)

    # 15. Sync Queue
    op.create_table('sync_queue',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('operation_id', sa.String(36), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('entity_type', sa.String(30), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(20), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('operation_id')
    )
    op.create_index(op.f('ix_sync_queue_id'), 'sync_queue', ['id'], unique=False)


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_index(op.f('ix_sync_queue_id'), table_name='sync_queue')
    op.drop_table('sync_queue')
    
    op.drop_index(op.f('ix_health_data_id'), table_name='health_data')
    op.drop_table('health_data')
    
    op.drop_index(op.f('ix_challenge_participants_id'), table_name='challenge_participants')
    op.drop_table('challenge_participants')
    
    op.drop_index(op.f('ix_challenges_id'), table_name='challenges')
    op.drop_table('challenges')
    
    op.drop_index(op.f('ix_social_comments_id'), table_name='social_comments')
    op.drop_table('social_comments')
    
    op.drop_index(op.f('ix_social_likes_id'), table_name='social_likes')
    op.drop_table('social_likes')
    
    op.drop_index(op.f('ix_social_posts_id'), table_name='social_posts')
    op.drop_table('social_posts')
    
    op.drop_index(op.f('ix_body_measurements_id'), table_name='body_measurements')
    op.drop_table('body_measurements')
    
    op.drop_index(op.f('ix_personal_records_id'), table_name='personal_records')
    op.drop_table('personal_records')
    
    op.drop_index(op.f('ix_exercise_substitutions_id'), table_name='exercise_substitutions')
    op.drop_table('exercise_substitutions')
    
    op.drop_index(op.f('ix_exercise_library_id'), table_name='exercise_library')
    op.drop_table('exercise_library')
    
    op.drop_index(op.f('ix_program_weeks_id'), table_name='program_weeks')
    op.drop_table('program_weeks')
    
    op.drop_index(op.f('ix_training_programs_id'), table_name='training_programs')
    op.drop_table('training_programs')
    
    op.drop_index(op.f('ix_template_exercises_id'), table_name='template_exercises')
    op.drop_table('template_exercises')
    
    op.drop_index(op.f('ix_workout_templates_id'), table_name='workout_templates')
    op.drop_table('workout_templates')