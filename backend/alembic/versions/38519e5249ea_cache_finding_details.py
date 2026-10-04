"""cache_finding_details

Revision ID: 38519e5249ea
Revises: 118f843ac449
Create Date: 2026-10-04 14:34:50.499427

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38519e5249ea'
down_revision: Union[str, Sequence[str], None] = '118f843ac449'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('improvement_items') as batch_op:
        batch_op.add_column(sa.Column('title', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('severity', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('summary', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('why_it_matters', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('suggested_action', sa.Text(), nullable=True))
        
    connection = op.get_bind()
    
    # Backfill using the latest finding if it exists, otherwise the original finding
    connection.execute(sa.text('''
        UPDATE improvement_items 
        SET 
            title = f.title,
            severity = f.severity,
            summary = f.summary,
            why_it_matters = f.why_it_matters,
            suggested_action = f.suggested_action
        FROM (SELECT id, title, severity, summary, why_it_matters, suggested_action FROM findings) AS f
        WHERE f.id = COALESCE(improvement_items.latest_matching_finding_id, improvement_items.finding_id)
    '''))
    
    connection.execute(sa.text('''
        UPDATE improvement_items 
        SET 
            title = 'Unknown',
            severity = 'minor',
            summary = 'No summary available.',
            why_it_matters = '',
            suggested_action = ''
        WHERE title IS NULL
    '''))
    
    with op.batch_alter_table('improvement_items') as batch_op:
        batch_op.alter_column('title', nullable=False, server_default='Unknown')
        batch_op.alter_column('severity', nullable=False, server_default='minor')
        batch_op.alter_column('summary', nullable=False, server_default='')


def downgrade() -> None:
    connection = op.get_bind()
    null_count = connection.execute(sa.text("SELECT COUNT(*) FROM improvement_items WHERE analysis_id IS NULL OR finding_id IS NULL")).scalar()
    if null_count > 0:
        raise ValueError(
            f"Cannot safely downgrade: {null_count} improvement items have NULL analysis_id or finding_id. "
            "These items were created by the new feature and cannot be mapped to the old analysis-scoped schema. "
            "Downgrade aborted to prevent data loss or constraint corruption."
        )

    with op.batch_alter_table('improvement_items') as batch_op:
        batch_op.drop_column('suggested_action')
        batch_op.drop_column('why_it_matters')
        batch_op.drop_column('summary')
        batch_op.drop_column('severity')
        batch_op.drop_column('title')
