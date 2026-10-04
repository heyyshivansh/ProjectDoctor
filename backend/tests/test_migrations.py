import os
import sqlite3
import uuid
import pytest
import subprocess

@pytest.fixture
def migration_db(request):
    db_path = f"test_migrations_durable_{request.node.name}.db"
    db_url = f"sqlite:///{db_path}"
    
    # Ensure fresh DB
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass
            
    os.environ["DATABASE_URL"] = db_url
        
    yield db_path, db_url
    
    # Cleanup
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass

def test_improvement_items_migration_preserves_duplicates(migration_db):
    db_path, db_url = migration_db
    
    # Upgrade to pre-feature schema
    subprocess.run(["alembic", "upgrade", "4c0aefadfea9"], check=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = OFF;')
    
    proj_id = uuid.uuid4().hex
    cursor.execute('INSERT INTO projects (id, title, problem_statement, description, status) VALUES (?, "Test", "prob", "desc", "active")', (proj_id,))
    
    analysis_id = uuid.uuid4().hex
    
    finding_id_1 = uuid.uuid4().hex
    finding_id_2 = uuid.uuid4().hex
    tech_details = '{"rule_code": "RULE_01", "requirement_id": "REQ_X"}'
    cursor.execute('INSERT INTO findings (id, project_id, title, summary, why_it_matters, suggested_action, finding_type, severity, finding_hash, technical_details, evidence_references) VALUES (?, ?, "Finding 1", "s", "w", "s", "bug", "high", "h1", ?, "[]")', (finding_id_1, proj_id, tech_details))
    cursor.execute('INSERT INTO findings (id, project_id, title, summary, why_it_matters, suggested_action, finding_type, severity, finding_hash, technical_details, evidence_references) VALUES (?, ?, "Finding 2", "s", "w", "s", "bug", "high", "h2", ?, "[]")', (finding_id_2, proj_id, tech_details))

    ii_1 = uuid.uuid4().hex
    ii_2 = uuid.uuid4().hex
    cursor.execute('INSERT INTO improvement_items (id, project_id, analysis_id, finding_id, status) VALUES (?, ?, ?, ?, "in_progress")', (ii_1, proj_id, analysis_id, finding_id_1))
    cursor.execute('INSERT INTO improvement_items (id, project_id, analysis_id, finding_id, status) VALUES (?, ?, ?, ?, "completed")', (ii_2, proj_id, analysis_id, finding_id_2))
    
    conn.commit()
    conn.close()
    
    # Upgrade to head
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    
    # Verify
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT id, status, stable_identity, verification_status FROM improvement_items')
    items = cursor.fetchall()
    
    assert len(items) == 2, "Both improvement items should be preserved"
    statuses = {item[1] for item in items}
    assert "in_progress" in statuses
    assert "completed" in statuses
    
    dup_count = sum(1 for item in items if ":dup:" in item[2])
    assert dup_count == 1, "Exactly one item should have :dup: appended to its stable_identity"
    
    # Add an item that makes downgrade impossible
    ii_3 = uuid.uuid4().hex
    cursor.execute('INSERT INTO improvement_items (id, project_id, stable_identity, status, verification_status, title, severity, summary) VALUES (?, ?, "NEW_ITEM", "not_started", "unverified", "t", "minor", "s")', (ii_3, proj_id))
    conn.commit()
    
    # Downgrade from head to base should fail immediately
    result = subprocess.run(["alembic", "downgrade", "4c0aefadfea9"], capture_output=True, text=True)
    assert result.returncode != 0
    assert "Cannot safely downgrade: 1 improvement items have NULL analysis_id or finding_id" in result.stderr or "Cannot safely downgrade" in result.stdout
        
    # Verify alembic_version is still at head
    cursor.execute('SELECT version_num FROM alembic_version')
    version = cursor.fetchone()[0]
    assert version == "42b6eae40841", f"Alembic version changed despite preflight failure: {version}"
    
    # Remove the problematic item to test clean downgrade
    cursor.execute('DELETE FROM improvement_items WHERE id = ?', (ii_3,))
    conn.commit()
    conn.close()
    
    # Now downgrade should succeed
    subprocess.run(["alembic", "downgrade", "4c0aefadfea9"], check=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT id, status FROM improvement_items')
    items_after_downgrade = cursor.fetchall()
    assert len(items_after_downgrade) == 2
    
    # Verify we are at base
    cursor.execute('SELECT version_num FROM alembic_version')
    version = cursor.fetchone()[0]
    assert version == "4c0aefadfea9", f"Alembic version did not downgrade cleanly: {version}"
    conn.close()

def test_foreign_keys_set_null_behavior(migration_db):
    db_path, db_url = migration_db
    
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = ON;')
    
    proj_id = uuid.uuid4().hex
    cursor.execute('INSERT INTO projects (id, title, problem_statement, description, status) VALUES (?, "Test", "prob", "desc", "active")', (proj_id,))
    
    finding_id = uuid.uuid4().hex
    tech_details = '{"rule_code": "RULE_01", "requirement_id": "REQ_X"}'
    cursor.execute('INSERT INTO findings (id, project_id, title, summary, why_it_matters, suggested_action, finding_type, severity, finding_hash, technical_details, evidence_references) VALUES (?, ?, "Finding", "s", "w", "s", "bug", "high", "h1", ?, "[]")', (finding_id, proj_id, tech_details))
    
    run_id = uuid.uuid4().hex
    cursor.execute('INSERT INTO analysis_runs (id, project_id, input_fingerprint, deterministic_status, ai_status) VALUES (?, ?, "fingerprint", "completed", "completed")', (run_id, proj_id))
    
    old_analysis_id = uuid.uuid4().hex
    cursor.execute('INSERT INTO ai_analyses (id, project_id, status, model_provider, model_name, prompt_version, evidence_hash, analysis_summary, structured_result) VALUES (?, ?, "completed", "x", "y", "z", "e", "s", "{}")', (old_analysis_id, proj_id))
    
    ii_id = uuid.uuid4().hex
    cursor.execute('INSERT INTO improvement_items (id, project_id, stable_identity, status, verification_status, latest_matching_finding_id, latest_verification_run_id, finding_id, analysis_id, title, severity, summary) VALUES (?, ?, "stable", "not_started", "unverified", ?, ?, ?, ?, "t", "minor", "s")', (ii_id, proj_id, finding_id, run_id, finding_id, old_analysis_id))
    
    conn.commit()
    
    # Delete finding and analysis
    cursor.execute('DELETE FROM findings WHERE id = ?', (finding_id,))
    cursor.execute('DELETE FROM analysis_runs WHERE id = ?', (run_id,))
    cursor.execute('DELETE FROM ai_analyses WHERE id = ?', (old_analysis_id,))
    conn.commit()
    
    # Verify improvement item survived and references were SET NULL
    cursor.execute('SELECT id, latest_matching_finding_id, latest_verification_run_id, finding_id, analysis_id, title, status FROM improvement_items WHERE id = ?', (ii_id,))
    item = cursor.fetchone()
    
    assert item is not None, "Improvement item should survive parent deletion"
    assert item[1] is None, "latest_matching_finding_id should be SET NULL"
    assert item[2] is None, "latest_verification_run_id should be SET NULL"
    assert item[3] is None, "finding_id should be SET NULL"
    assert item[4] is None, "analysis_id should be SET NULL"
    assert item[5] == "t", "Cached display fields should remain unchanged"
    assert item[6] == "not_started", "Student status should remain unchanged"
    
    conn.close()

