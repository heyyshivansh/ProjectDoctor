import uuid
from app.models.github_repository import RepositorySnapshot

from datetime import datetime
import json

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.project import Project
from app.models.analysis_run import AnalysisRun
from app.models.improvement import ImprovementItem
from app.models.finding import Finding
from app.models.traceability import RequirementSnapshotTraceability
from app.models.requirement import Requirement
from app.services.improvement.improvement_service import ImprovementService

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_project(db_session):
    p = Project(
        title="Test Project",
        problem_statement="Test",
        description="Test",
        requirements="Test"
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p

@pytest.fixture
def test_run(db_session, test_project):
    from app.models.github_repository import GitHubRepository, RepositorySnapshot
    
    repo = GitHubRepository(
        project_id=test_project.id, 
        repo_url="http://test",
        owner="test",
        repo_name="test",
        default_branch="main",
        is_private=False
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)
    
    snap = RepositorySnapshot(project_id=test_project.id, repository_id=repo.id, commit_sha="test", branch="main")
    db_session.add(snap)
    db_session.commit()
    db_session.refresh(snap)

    run = AnalysisRun(
        project_id=test_project.id,
        snapshot_id=snap.id,
        input_fingerprint="test-fingerprint",
        deterministic_status="completed",
        ai_status="running"
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run


def test_reconciliation_rule_02_to_01(db_session, test_project, test_run):
    req_id = uuid.uuid4()
    req_id_str = str(req_id)
    
    req = Requirement(id=req_id, requirement_id="REQ-1", content_hash="hash", project_id=test_project.id, title="Test req", description="Test")
    db_session.add(req)
    db_session.commit()
    
    # Simulate an existing ImprovementItem for RULE_02
    item = ImprovementItem(
        project_id=test_project.id,
        original_run_id=test_run.id,
        stable_identity=f"RULE_02_AMBIGUOUS_CANDIDATES:REQ-1",
        verification_status="still_detected",
        status="completed"
    )
    db_session.add(item)
    
    # Traceability for current run is "unmatched"
    trace = RequirementSnapshotTraceability(
        project_id=test_project.id,
        snapshot_id=test_run.snapshot_id,
        requirement_id=req_id,
        status="unmatched",
        commit_sha="test"
    )
    db_session.add(trace)
    
    # Add a current finding for RULE_01 (unmatched)
    finding = Finding(
        project_id=test_project.id,
        snapshot_id=test_run.snapshot_id,
        finding_hash="test-hash",
        title="Unmatched",
        severity="major",
        summary="Test",
        finding_type="deterministic",
        why_it_matters="Test",
        suggested_action="Test",
        commit_sha="test",
        technical_details=json.dumps({"rule_code": "RULE_01_UNMATCHED_REQUIREMENT", "requirement_id": "REQ-1"})
    )
    db_session.add(finding)
    db_session.commit()

    # Reconcile
    ImprovementService.reconcile_improvements(db_session, test_project.id, test_run.id)

    db_session.refresh(item)
    assert item.verification_status == "no_longer_detected"
    assert "still missing" in item.verification_detail

    # The new finding for RULE_01 should have created a new item
    new_item = db_session.scalars(
        sa.select(ImprovementItem).where(ImprovementItem.stable_identity == f"RULE_01_UNMATCHED_REQUIREMENT:REQ-1")
    ).first()
    assert new_item is not None
    assert new_item.verification_status == "still_detected"


def test_reconciliation_missing_target(db_session, test_project, test_run):
    req_id = "req-2"
    
    # Simulate an existing ImprovementItem for RULE_01
    item = ImprovementItem(
        project_id=test_project.id,
        original_run_id=test_run.id,
        stable_identity=f"RULE_01_UNMATCHED_REQUIREMENT:{req_id}",
        verification_status="still_detected"
    )
    db_session.add(item)
    db_session.commit()
    
    # Reconcile, but no finding and no traceability for req-2 exist
    ImprovementService.reconcile_improvements(db_session, test_project.id, test_run.id)
    
    db_session.refresh(item)
    assert item.verification_status == "no_longer_detected"
    assert "removed or renamed" in item.verification_detail

def test_reconcile_api_endpoint(client, db_session, test_project, test_run):
    # Setup test run with completed deterministic status
    test_run.deterministic_status = "completed"
    
    # Needs to match the hash from orchestrator
    from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
    fingerprint = ProjectAnalysisOrchestrator._compute_input_fingerprint(db_session, test_project.id, test_run.snapshot_id)
    test_run.input_fingerprint = fingerprint
    db_session.commit()

    # Create dummy user and mock dependencies for endpoint
    # To test endpoint properly, we can just use the fastAPI client
    # The route is PATCH /api/projects/{project_id}/improvement-plan/reconcile
    
    # 1. Test current fingerprint (Success)
    response = client.post(f"/api/projects/{test_project.id}/improvement-plan/reconcile")
    assert response.status_code == 200

    # 2. Test stale fingerprint
    test_run.input_fingerprint = "old-stale-fingerprint"
    db_session.commit()
    response = client.post(f"/api/projects/{test_project.id}/improvement-plan/reconcile")
    assert response.status_code == 400
    assert "stale" in response.json()["detail"]

    # 3. Test no completed run
    test_run.deterministic_status = "running"
    db_session.commit()
    response = client.post(f"/api/projects/{test_project.id}/improvement-plan/reconcile")
    assert response.status_code == 400
    assert "No completed" in response.json()["detail"]


def test_rule_05_resolves_with_rule_09(db_session, test_project, test_run):
    # Add a pending item for RULE_05
    item = ImprovementItem(
        project_id=test_project.id,
        original_run_id=test_run.id,
        stable_identity="RULE_05_NO_TEST_SUITE:repo",
        verification_status="still_detected",
        status="not_started"
    )
    db_session.add(item)
    
    # Positive evidence from older snapshot shouldn't count!
    import uuid
    from app.models.github_repository import RepositorySnapshot

    old_snapshot_id = uuid.uuid4()
    old_snapshot = RepositorySnapshot(id=old_snapshot_id, project_id=test_project.id, commit_sha='old', branch='main', repository_id=test_run.snapshot.repository_id)
    db_session.add(old_snapshot)
    finding_old = Finding(
        project_id=test_project.id,
        snapshot_id=old_snapshot_id,
        finding_hash="old-hash",
        title="Tests Found",
        severity="strength",
        summary="Test",
        finding_type="deterministic",
        why_it_matters="Test",
        suggested_action="",
        commit_sha="old",
        technical_details=json.dumps({"rule_code": "RULE_09_TEST_SUITE_PRESENT"})
    )
    db_session.add(finding_old)
    db_session.commit()
    
    ImprovementService.reconcile_improvements(db_session, test_project.id, test_run.id)
    db_session.refresh(item)
    # Since it wasn't in the current snapshot, it doesn't resolve to 'verified_resolved'
    assert item.verification_status == "no_longer_detected"
    
    # Add positive evidence to current snapshot
    finding_current = Finding(
        project_id=test_project.id,
        snapshot_id=test_run.snapshot_id,
        finding_hash="cur-hash",
        title="Tests Found",
        severity="strength",
        summary="Test",
        finding_type="deterministic",
        why_it_matters="Test",
        suggested_action="",
        commit_sha="test",
        technical_details=json.dumps({"rule_code": "RULE_09_TEST_SUITE_PRESENT"})
    )
    db_session.add(finding_current)
    db_session.commit()
    
    # Set back to still_detected to test resolution
    item.verification_status = "still_detected"
    db_session.commit()
    
    ImprovementService.reconcile_improvements(db_session, test_project.id, test_run.id)
    db_session.refresh(item)
    assert item.verification_status == "verified_resolved"

def test_rule_07_resolves_with_rule_10(db_session, test_project, test_run):
    item = ImprovementItem(
        project_id=test_project.id,
        original_run_id=test_run.id,
        stable_identity="RULE_07_NO_DOCUMENTATION:repo",
        verification_status="still_detected",
        status="not_started"
    )
    db_session.add(item)
    
    finding = Finding(
        project_id=test_project.id,
        snapshot_id=test_run.snapshot_id,
        finding_hash="cur-hash-doc",
        title="Doc Found",
        severity="strength",
        summary="Test",
        finding_type="deterministic",
        why_it_matters="Test",
        suggested_action="",
        commit_sha="test",
        technical_details=json.dumps({"rule_code": "RULE_10_DOCUMENTATION_PRESENT"})
    )
    db_session.add(finding)
    db_session.commit()
    
    ImprovementService.reconcile_improvements(db_session, test_project.id, test_run.id)
    db_session.refresh(item)
    assert item.verification_status == "verified_resolved"


def test_safe_foreign_key_deletion_and_cache(db_session, test_project, test_run):
    # Create finding
    finding = Finding(
        project_id=test_project.id,
        snapshot_id=test_run.snapshot_id,
        finding_hash="del-hash",
        title="To be deleted",
        severity="minor",
        summary="summary_text",
        finding_type="deterministic",
        why_it_matters="matters",
        suggested_action="action",
        commit_sha="test",
        technical_details=json.dumps({"rule_code": "TEST", "requirement_id": "test"})
    )
    db_session.add(finding)
    db_session.commit()
    
    # Create item
    item = ImprovementItem(
        project_id=test_project.id,
        original_run_id=test_run.id,
        finding_id=finding.id,
        stable_identity="TEST:test",
        verification_status="still_detected",
        status="in_progress",
        title=finding.title,
        severity=finding.severity,
        summary=finding.summary
    )
    db_session.add(item)
    db_session.commit()
    
    item_id = item.id
    
    # Delete finding
    db_session.delete(finding)
    db_session.commit()
    
    # Retrieve item
    db_session.expire_all()
    item_after = db_session.get(ImprovementItem, item_id)
    
    # Proof that item is NOT deleted, and finding_id is SET NULL
    assert item_after is not None
    assert item_after.finding_id is None
    assert item_after.title == "To be deleted"
    assert item_after.summary == "summary_text"
    assert item_after.status == "in_progress"

