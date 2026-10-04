"""fix_improvement_fks

Revision ID: 42b6eae40841
Revises: 38519e5249ea
Create Date: 2026-10-04 14:43:46.545374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42b6eae40841'
down_revision: Union[str, Sequence[str], None] = '38519e5249ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    context = op.get_context()
    if context.dialect.name == 'sqlite':
        # Use raw SQL to recreate the table with SET NULL on finding_id and analysis_id for SQLite
        op.execute("""
        CREATE TABLE improvement_items_new (
            id CHAR(32) NOT NULL, 
            project_id CHAR(32) NOT NULL, 
            analysis_id CHAR(32), 
            finding_id CHAR(32), 
            status VARCHAR(20) NOT NULL, 
            created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
            updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
            original_run_id CHAR(32), 
            stable_identity VARCHAR(255) NOT NULL, 
            latest_verification_run_id CHAR(32), 
            latest_matching_finding_id CHAR(32), 
            verification_status VARCHAR(50) DEFAULT 'unverified' NOT NULL, 
            verification_detail TEXT, 
            title VARCHAR(255) DEFAULT 'Unknown' NOT NULL, 
            severity VARCHAR(50) DEFAULT 'minor' NOT NULL, 
            summary TEXT DEFAULT '' NOT NULL, 
            why_it_matters TEXT, 
            suggested_action TEXT, 
            PRIMARY KEY (id), 
            CONSTRAINT fk_ii_latest_run FOREIGN KEY(latest_verification_run_id) REFERENCES analysis_runs (id) ON DELETE SET NULL, 
            CONSTRAINT uq_project_stable_identity UNIQUE (project_id, stable_identity), 
            CONSTRAINT fk_ii_latest_finding FOREIGN KEY(latest_matching_finding_id) REFERENCES findings (id) ON DELETE SET NULL, 
            CONSTRAINT fk_ii_orig_run FOREIGN KEY(original_run_id) REFERENCES analysis_runs (id) ON DELETE SET NULL, 
            FOREIGN KEY(finding_id) REFERENCES findings (id) ON DELETE SET NULL, 
            FOREIGN KEY(analysis_id) REFERENCES ai_analyses (id) ON DELETE SET NULL, 
            FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
        """)
        op.execute('INSERT INTO improvement_items_new SELECT * FROM improvement_items;')
        op.execute('DROP TABLE improvement_items;')
        op.execute('ALTER TABLE improvement_items_new RENAME TO improvement_items;')
        
        # Recreate indexes
        op.execute('CREATE INDEX ix_improvement_items_analysis_id ON improvement_items (analysis_id);')
        op.execute('CREATE INDEX ix_improvement_items_finding_id ON improvement_items (finding_id);')
        op.execute('CREATE INDEX ix_improvement_items_latest_verification_run_id ON improvement_items (latest_verification_run_id);')
        op.execute('CREATE INDEX ix_improvement_items_original_run_id ON improvement_items (original_run_id);')
        op.execute('CREATE INDEX ix_improvement_items_project_id ON improvement_items (project_id);')
        op.execute('CREATE INDEX ix_improvement_items_stable_identity ON improvement_items (stable_identity);')
        op.execute('CREATE INDEX ix_improvement_items_status ON improvement_items (status);')
        op.execute('CREATE INDEX ix_improvement_items_verification_status ON improvement_items (verification_status);')
    else:
        # Standard Postgres/MySQL behavior using Alembic
        with op.batch_alter_table('improvement_items') as batch_op:
            batch_op.drop_constraint('improvement_items_finding_id_fkey', type_='foreignkey')
            batch_op.drop_constraint('improvement_items_analysis_id_fkey', type_='foreignkey')
            batch_op.create_foreign_key('improvement_items_finding_id_fkey', 'findings', ['finding_id'], ['id'], ondelete='SET NULL')
            batch_op.create_foreign_key('improvement_items_analysis_id_fkey', 'ai_analyses', ['analysis_id'], ['id'], ondelete='SET NULL')

def downgrade() -> None:
    connection = op.get_bind()
    null_count = connection.execute(sa.text("SELECT COUNT(*) FROM improvement_items WHERE analysis_id IS NULL OR finding_id IS NULL")).scalar()
    if null_count > 0:
        raise ValueError(
            f"Cannot safely downgrade: {null_count} improvement items have NULL analysis_id or finding_id. "
            "These items were created by the new feature and cannot be mapped to the old analysis-scoped schema. "
            "Downgrade aborted to prevent data loss or constraint corruption."
        )

    context = op.get_context()
    if context.dialect.name == 'sqlite':
        op.execute("""
        CREATE TABLE improvement_items_new (
            id CHAR(32) NOT NULL, 
            project_id CHAR(32) NOT NULL, 
            analysis_id CHAR(32), 
            finding_id CHAR(32), 
            status VARCHAR(20) NOT NULL, 
            created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
            updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
            original_run_id CHAR(32), 
            stable_identity VARCHAR(255) NOT NULL, 
            latest_verification_run_id CHAR(32), 
            latest_matching_finding_id CHAR(32), 
            verification_status VARCHAR(50) DEFAULT 'unverified' NOT NULL, 
            verification_detail TEXT, 
            title VARCHAR(255) DEFAULT 'Unknown' NOT NULL, 
            severity VARCHAR(50) DEFAULT 'minor' NOT NULL, 
            summary TEXT DEFAULT '' NOT NULL, 
            why_it_matters TEXT, 
            suggested_action TEXT, 
            PRIMARY KEY (id), 
            CONSTRAINT fk_ii_latest_run FOREIGN KEY(latest_verification_run_id) REFERENCES analysis_runs (id) ON DELETE SET NULL, 
            CONSTRAINT uq_project_stable_identity UNIQUE (project_id, stable_identity), 
            CONSTRAINT fk_ii_latest_finding FOREIGN KEY(latest_matching_finding_id) REFERENCES findings (id) ON DELETE SET NULL, 
            CONSTRAINT fk_ii_orig_run FOREIGN KEY(original_run_id) REFERENCES analysis_runs (id) ON DELETE SET NULL, 
            FOREIGN KEY(finding_id) REFERENCES findings (id) ON DELETE CASCADE, 
            FOREIGN KEY(analysis_id) REFERENCES ai_analyses (id) ON DELETE CASCADE, 
            FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
        """)
        op.execute('INSERT INTO improvement_items_new SELECT * FROM improvement_items;')
        op.execute('DROP TABLE improvement_items;')
        op.execute('ALTER TABLE improvement_items_new RENAME TO improvement_items;')
        
        # Recreate indexes
        op.execute('CREATE INDEX ix_improvement_items_analysis_id ON improvement_items (analysis_id);')
        op.execute('CREATE INDEX ix_improvement_items_finding_id ON improvement_items (finding_id);')
        op.execute('CREATE INDEX ix_improvement_items_latest_verification_run_id ON improvement_items (latest_verification_run_id);')
        op.execute('CREATE INDEX ix_improvement_items_original_run_id ON improvement_items (original_run_id);')
        op.execute('CREATE INDEX ix_improvement_items_project_id ON improvement_items (project_id);')
        op.execute('CREATE INDEX ix_improvement_items_stable_identity ON improvement_items (stable_identity);')
        op.execute('CREATE INDEX ix_improvement_items_status ON improvement_items (status);')
        op.execute('CREATE INDEX ix_improvement_items_verification_status ON improvement_items (verification_status);')
    else:
        with op.batch_alter_table('improvement_items') as batch_op:
            batch_op.drop_constraint('improvement_items_finding_id_fkey', type_='foreignkey')
            batch_op.drop_constraint('improvement_items_analysis_id_fkey', type_='foreignkey')
            batch_op.create_foreign_key('improvement_items_finding_id_fkey', 'findings', ['finding_id'], ['id'], ondelete='CASCADE')
            batch_op.create_foreign_key('improvement_items_analysis_id_fkey', 'ai_analyses', ['analysis_id'], ['id'], ondelete='CASCADE')

