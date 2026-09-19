"""create_github_integration_tables

Revision ID: 127f3da2f1c7
Revises: 7d91c33b40c7
Create Date: 2026-09-19 16:54:23.125969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '127f3da2f1c7'
down_revision: Union[str, Sequence[str], None] = '7d91c33b40c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. github_repositories
    op.create_table(
        'github_repositories',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('repo_url', sa.String(length=500), nullable=False),
        sa.Column('owner', sa.String(length=100), nullable=False),
        sa.Column('repo_name', sa.String(length=100), nullable=False),
        sa.Column('default_branch', sa.String(length=100), server_default='main', nullable=False),
        sa.Column('is_private', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('access_token', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='connected', nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', name='uq_github_repositories_project_id'),
    )
    op.create_index(op.f('ix_github_repositories_project_id'), 'github_repositories', ['project_id'], unique=True)
    op.create_index(op.f('ix_github_repositories_owner'), 'github_repositories', ['owner'], unique=False)
    op.create_index(op.f('ix_github_repositories_repo_name'), 'github_repositories', ['repo_name'], unique=False)

    # 2. repository_snapshots
    op.create_table(
        'repository_snapshots',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('repository_id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('commit_sha', sa.String(length=40), nullable=False),
        sa.Column('commit_message', sa.Text(), nullable=True),
        sa.Column('commit_author', sa.String(length=255), nullable=True),
        sa.Column('commit_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('branch', sa.String(length=100), nullable=False),
        sa.Column('total_files', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_size_bytes', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('structure_summary', sa.JSON(), nullable=True),
        sa.Column('is_current', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='completed', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['github_repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_repository_snapshots_repository_id'), 'repository_snapshots', ['repository_id'], unique=False)
    op.create_index(op.f('ix_repository_snapshots_project_id'), 'repository_snapshots', ['project_id'], unique=False)
    op.create_index(op.f('ix_repository_snapshots_commit_sha'), 'repository_snapshots', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_repository_snapshots_is_current'), 'repository_snapshots', ['is_current'], unique=False)

    # 3. repository_files
    op.create_table(
        'repository_files',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_extension', sa.String(length=50), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('blob_sha', sa.String(length=40), nullable=False),
        sa.Column('is_binary', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('is_ignored', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('content_status', sa.String(length=50), server_default='indexed_metadata_only', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['repository_snapshots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('snapshot_id', 'file_path', name='uq_snapshot_file_path'),
    )
    op.create_index(op.f('ix_repository_files_snapshot_id'), 'repository_files', ['snapshot_id'], unique=False)
    op.create_index(op.f('ix_repository_files_project_id'), 'repository_files', ['project_id'], unique=False)
    op.create_index(op.f('ix_repository_files_file_path'), 'repository_files', ['file_path'], unique=False)

    # 4. repository_evidence
    op.create_table(
        'repository_evidence',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('commit_sha', sa.String(length=40), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('evidence_type', sa.String(length=50), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=True),
        sa.Column('start_line', sa.Integer(), nullable=True),
        sa.Column('end_line', sa.Integer(), nullable=True),
        sa.Column('content_snippet', sa.Text(), nullable=True),
        sa.Column('evidence_hash', sa.String(length=64), nullable=False),
        sa.Column('extraction_method', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['repository_snapshots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('snapshot_id', 'evidence_hash', name='uq_snapshot_evidence_hash'),
    )
    op.create_index(op.f('ix_repository_evidence_snapshot_id'), 'repository_evidence', ['snapshot_id'], unique=False)
    op.create_index(op.f('ix_repository_evidence_project_id'), 'repository_evidence', ['project_id'], unique=False)
    op.create_index(op.f('ix_repository_evidence_commit_sha'), 'repository_evidence', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_repository_evidence_file_path'), 'repository_evidence', ['file_path'], unique=False)
    op.create_index(op.f('ix_repository_evidence_evidence_type'), 'repository_evidence', ['evidence_type'], unique=False)
    op.create_index(op.f('ix_repository_evidence_evidence_hash'), 'repository_evidence', ['evidence_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_repository_evidence_evidence_hash'), table_name='repository_evidence')
    op.drop_index(op.f('ix_repository_evidence_evidence_type'), table_name='repository_evidence')
    op.drop_index(op.f('ix_repository_evidence_file_path'), table_name='repository_evidence')
    op.drop_index(op.f('ix_repository_evidence_commit_sha'), table_name='repository_evidence')
    op.drop_index(op.f('ix_repository_evidence_project_id'), table_name='repository_evidence')
    op.drop_index(op.f('ix_repository_evidence_snapshot_id'), table_name='repository_evidence')
    op.drop_table('repository_evidence')

    op.drop_index(op.f('ix_repository_files_file_path'), table_name='repository_files')
    op.drop_index(op.f('ix_repository_files_project_id'), table_name='repository_files')
    op.drop_index(op.f('ix_repository_files_snapshot_id'), table_name='repository_files')
    op.drop_table('repository_files')

    op.drop_index(op.f('ix_repository_snapshots_is_current'), table_name='repository_snapshots')
    op.drop_index(op.f('ix_repository_snapshots_commit_sha'), table_name='repository_snapshots')
    op.drop_index(op.f('ix_repository_snapshots_project_id'), table_name='repository_snapshots')
    op.drop_index(op.f('ix_repository_snapshots_repository_id'), table_name='repository_snapshots')
    op.drop_table('repository_snapshots')

    op.drop_index(op.f('ix_github_repositories_repo_name'), table_name='github_repositories')
    op.drop_index(op.f('ix_github_repositories_owner'), table_name='github_repositories')
    op.drop_index(op.f('ix_github_repositories_project_id'), table_name='github_repositories')
    op.drop_table('github_repositories')

