"""create_findings_table

Revision ID: 4a1b2c3d4e5f
Revises: 3a9b8c7d6e5f
Create Date: 2026-09-19 22:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '3a9b8c7d6e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add findings table."""
    op.create_table(
        'findings',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), nullable=True),
        sa.Column('commit_sha', sa.String(length=40), nullable=True),
        sa.Column('finding_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('why_it_matters', sa.Text(), nullable=False),
        sa.Column('suggested_action', sa.Text(), nullable=True),
        sa.Column('evidence_references', sa.JSON(), nullable=False),
        sa.Column('technical_details', sa.JSON(), nullable=False),
        sa.Column('finding_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['repository_snapshots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'finding_hash', name='uq_project_finding_hash'),
    )
    op.create_index(op.f('ix_findings_project_id'), 'findings', ['project_id'], unique=False)
    op.create_index(op.f('ix_findings_snapshot_id'), 'findings', ['snapshot_id'], unique=False)
    op.create_index(op.f('ix_findings_commit_sha'), 'findings', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_findings_finding_type'), 'findings', ['finding_type'], unique=False)
    op.create_index(op.f('ix_findings_severity'), 'findings', ['severity'], unique=False)
    op.create_index(op.f('ix_findings_finding_hash'), 'findings', ['finding_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove findings table."""
    op.drop_index(op.f('ix_findings_finding_hash'), table_name='findings')
    op.drop_index(op.f('ix_findings_severity'), table_name='findings')
    op.drop_index(op.f('ix_findings_finding_type'), table_name='findings')
    op.drop_index(op.f('ix_findings_commit_sha'), table_name='findings')
    op.drop_index(op.f('ix_findings_snapshot_id'), table_name='findings')
    op.drop_index(op.f('ix_findings_project_id'), table_name='findings')
    op.drop_table('findings')
