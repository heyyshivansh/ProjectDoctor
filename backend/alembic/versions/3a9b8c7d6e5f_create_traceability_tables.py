"""create_traceability_tables

Revision ID: 3a9b8c7d6e5f
Revises: 127f3da2f1c7
Create Date: 2026-09-19 20:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a9b8c7d6e5f'
down_revision: Union[str, Sequence[str], None] = '127f3da2f1c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add requirement traceability tables."""
    # 1. requirement_snapshot_traceabilities
    op.create_table(
        'requirement_snapshot_traceabilities',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('requirement_id', sa.Uuid(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), nullable=False),
        sa.Column('commit_sha', sa.String(length=40), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='unmatched', nullable=False),
        sa.Column('implementation_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('test_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('summary_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requirement_id'], ['requirements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['repository_snapshots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('requirement_id', 'snapshot_id', name='uq_req_snapshot_traceability'),
    )
    op.create_index(op.f('ix_requirement_snapshot_traceabilities_project_id'), 'requirement_snapshot_traceabilities', ['project_id'], unique=False)
    op.create_index(op.f('ix_requirement_snapshot_traceabilities_requirement_id'), 'requirement_snapshot_traceabilities', ['requirement_id'], unique=False)
    op.create_index(op.f('ix_requirement_snapshot_traceabilities_snapshot_id'), 'requirement_snapshot_traceabilities', ['snapshot_id'], unique=False)
    op.create_index(op.f('ix_requirement_snapshot_traceabilities_commit_sha'), 'requirement_snapshot_traceabilities', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_requirement_snapshot_traceabilities_status'), 'requirement_snapshot_traceabilities', ['status'], unique=False)

    # 2. requirement_traceability_links
    op.create_table(
        'requirement_traceability_links',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('traceability_id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('requirement_id', sa.Uuid(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), nullable=False),
        sa.Column('commit_sha', sa.String(length=40), nullable=False),
        sa.Column('repository_file_id', sa.Uuid(), nullable=True),
        sa.Column('repository_evidence_id', sa.Uuid(), nullable=True),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('evidence_type', sa.String(length=50), server_default='implementation_code', nullable=False),
        sa.Column('is_test_evidence', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('match_confidence', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('match_level', sa.String(length=50), server_default='candidate_match', nullable=False),
        sa.Column('match_rationale', sa.Text(), nullable=False),
        sa.Column('line_start', sa.Integer(), nullable=True),
        sa.Column('line_end', sa.Integer(), nullable=True),
        sa.Column('code_snippet', sa.Text(), nullable=True),
        sa.Column('link_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['traceability_id'], ['requirement_snapshot_traceabilities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requirement_id'], ['requirements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['repository_snapshots.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_file_id'], ['repository_files.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['repository_evidence_id'], ['repository_evidence.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('snapshot_id', 'link_hash', name='uq_snapshot_link_hash'),
    )
    op.create_index(op.f('ix_requirement_traceability_links_traceability_id'), 'requirement_traceability_links', ['traceability_id'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_project_id'), 'requirement_traceability_links', ['project_id'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_requirement_id'), 'requirement_traceability_links', ['requirement_id'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_snapshot_id'), 'requirement_traceability_links', ['snapshot_id'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_commit_sha'), 'requirement_traceability_links', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_repository_file_id'), 'requirement_traceability_links', ['repository_file_id'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_repository_evidence_id'), 'requirement_traceability_links', ['repository_evidence_id'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_file_path'), 'requirement_traceability_links', ['file_path'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_evidence_type'), 'requirement_traceability_links', ['evidence_type'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_is_test_evidence'), 'requirement_traceability_links', ['is_test_evidence'], unique=False)
    op.create_index(op.f('ix_requirement_traceability_links_link_hash'), 'requirement_traceability_links', ['link_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove requirement traceability tables."""
    op.drop_index(op.f('ix_requirement_traceability_links_link_hash'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_is_test_evidence'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_evidence_type'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_file_path'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_repository_evidence_id'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_repository_file_id'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_commit_sha'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_snapshot_id'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_requirement_id'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_project_id'), table_name='requirement_traceability_links')
    op.drop_index(op.f('ix_requirement_traceability_links_traceability_id'), table_name='requirement_traceability_links')
    op.drop_table('requirement_traceability_links')

    op.drop_index(op.f('ix_requirement_snapshot_traceabilities_status'), table_name='requirement_snapshot_traceabilities')
    op.drop_index(op.f('ix_requirement_snapshot_traceabilities_commit_sha'), table_name='requirement_snapshot_traceabilities')
    op.drop_index(op.f('ix_requirement_snapshot_traceabilities_snapshot_id'), table_name='requirement_snapshot_traceabilities')
    op.drop_index(op.f('ix_requirement_snapshot_traceabilities_requirement_id'), table_name='requirement_snapshot_traceabilities')
    op.drop_index(op.f('ix_requirement_snapshot_traceabilities_project_id'), table_name='requirement_snapshot_traceabilities')
    op.drop_table('requirement_snapshot_traceabilities')
