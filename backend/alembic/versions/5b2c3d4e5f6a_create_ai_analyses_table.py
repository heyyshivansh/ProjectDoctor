"""create_ai_analyses_table

Revision ID: 5b2c3d4e5f6a
Revises: 4a1b2c3d4e5f
Create Date: 2026-09-20 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b2c3d4e5f6a'
down_revision: Union[str, Sequence[str], None] = '4a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add ai_analyses table."""
    op.create_table(
        'ai_analyses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), nullable=True),
        sa.Column('commit_sha', sa.String(length=40), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('model_provider', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('prompt_version', sa.String(length=50), nullable=False),
        sa.Column('evidence_hash', sa.String(length=64), nullable=False),
        sa.Column('analysis_summary', sa.Text(), nullable=False),
        sa.Column('structured_result', sa.JSON(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['repository_snapshots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ai_analyses_project_id'), 'ai_analyses', ['project_id'], unique=False)
    op.create_index(op.f('ix_ai_analyses_snapshot_id'), 'ai_analyses', ['snapshot_id'], unique=False)
    op.create_index(op.f('ix_ai_analyses_commit_sha'), 'ai_analyses', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_ai_analyses_status'), 'ai_analyses', ['status'], unique=False)
    op.create_index(op.f('ix_ai_analyses_evidence_hash'), 'ai_analyses', ['evidence_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove ai_analyses table."""
    op.drop_index(op.f('ix_ai_analyses_evidence_hash'), table_name='ai_analyses')
    op.drop_index(op.f('ix_ai_analyses_status'), table_name='ai_analyses')
    op.drop_index(op.f('ix_ai_analyses_commit_sha'), table_name='ai_analyses')
    op.drop_index(op.f('ix_ai_analyses_snapshot_id'), table_name='ai_analyses')
    op.drop_index(op.f('ix_ai_analyses_project_id'), table_name='ai_analyses')
    op.drop_table('ai_analyses')
