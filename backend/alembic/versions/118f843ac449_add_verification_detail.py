"""add_verification_detail

Revision ID: 118f843ac449
Revises: 9ad35f8fac55
Create Date: 2026-10-04 14:18:05.465613

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '118f843ac449'
down_revision: Union[str, Sequence[str], None] = '9ad35f8fac55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('improvement_items', sa.Column('verification_detail', sa.Text(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()
    null_count = connection.execute(sa.text("SELECT COUNT(*) FROM improvement_items WHERE analysis_id IS NULL OR finding_id IS NULL")).scalar()
    if null_count > 0:
        raise ValueError(
            f"Cannot safely downgrade: {null_count} improvement items have NULL analysis_id or finding_id. "
            "These items were created by the new feature and cannot be mapped to the old analysis-scoped schema. "
            "Downgrade aborted to prevent data loss or constraint corruption."
        )

    op.drop_column('improvement_items', 'verification_detail')
