"""add_program_workouts_table

Revision ID: 9d7b6b236d73
Revises: 001
Create Date: 2026-07-11 16:28:44.573325

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d7b6b236d73'
down_revision: Union[str, Sequence[str], None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create program_workouts table only
    # SQLite doesn't support ALTER COLUMN, so skip type changes
    op.create_table('program_workouts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('program_id', sa.Integer(), nullable=False),
    sa.Column('week_id', sa.Integer(), nullable=False),
    sa.Column('week_number', sa.Integer(), nullable=False),
    sa.Column('day_number', sa.Integer(), nullable=False),
    sa.Column('scheduled_date', sa.String(length=10), nullable=False),
    sa.Column('workout_template_id', sa.Integer(), nullable=True),
    sa.Column('is_rest_day', sa.Boolean(), nullable=True),
    sa.Column('completed', sa.Boolean(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('actual_session_id', sa.Integer(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['actual_session_id'], ['sessions.id'], ),
    sa.ForeignKeyConstraint(['program_id'], ['training_programs.id'], ),
    sa.ForeignKeyConstraint(['week_id'], ['program_weeks.id'], ),
    sa.ForeignKeyConstraint(['workout_template_id'], ['workout_templates.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_program_workouts_id'), 'program_workouts', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_program_workouts_id'), table_name='program_workouts')
    op.drop_table('program_workouts')