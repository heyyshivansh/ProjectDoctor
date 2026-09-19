import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.requirement import Requirement, RequirementEvidence
from app.models.github_repository import (
    GitHubRepository,
    RepositorySnapshot,
    RepositoryFile,
    RepositoryEvidence,
)
from app.models.traceability import (
    RequirementSnapshotTraceability,
    RequirementTraceabilityLink,
)
from app.models.finding import Finding
from app.services.analysis.diagnostic_service import DiagnosticService


@pytest.fixture
def project_with_traceability_api(db_session: Session) -> Project:
    """Create project, requirements, repo, snapshot, and traceability for API testing."""
    project = Project(
        title="Diagnosis API Project",
        problem_statement="Validate diagnosis and finding endpoints",
        description="Fixture for API testing",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    req1 = Requirement(
        project_id=project.id,
        requirement_id="REQ-API-1",
        title="User Login",
        description="Authenticate users with JWT",
        category="security",
        content_hash="hash_api_1",
    )
    req2 = Requirement(
        project_id=project.id,
        requirement_id="REQ-API-2",
        title="Export Data",
        description="Export reporting data to CSV format",
        category="functional",
        content_hash="hash_api_2",
    )
    db_session.add_all([req1, req2])
    db_session.commit()

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/api-repo",
        owner="student",
        repo_name="api-repo",
        default_branch="main",
        status="synced",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="9999999999999999999999999999999999999999",
        branch="main",
        total_files=3,
        total_size_bytes=5000,
        structure_summary={
            "total_files": 3,
            "total_size_bytes": 5000,
            "languages": {"Python": 3},
            "evidence_counts": {"test_suite": 1, "documentation": 1},
        },
        is_current=True,
    )
    db_session.add(snapshot)
    db_session.commit()

    # Traceability: req1 is candidate_with_tests, req2 is unmatched
    trace1 = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req1.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        status="candidate_with_tests",
        implementation_count=1,
        test_count=1,
    )
    trace2 = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req2.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        status="unmatched",
        implementation_count=0,
        test_count=0,
    )
    db_session.add_all([trace1, trace2])
    db_session.commit()

    return project


def test_get_diagnosis_read_only(client: TestClient, db_session: Session):
    """Verify that GET /diagnosis is strictly read-only and does NOT create findings."""
    project = Project(
        title="Read Only Test",
        problem_statement="Test read only GET",
        description="Verifying zero side-effects",
    )
    db_session.add(project)
    db_session.commit()

    # Ensure 0 findings exist before request
    findings_before = db_session.query(Finding).filter(Finding.project_id == project.id).count()
    assert findings_before == 0

    response = client.get(f"/api/projects/{project.id}/diagnosis")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == str(project.id)
    assert data["status"] == "not_enough_evidence_yet"
    assert data["total_findings"] == 0

    # Ensure 0 findings exist after request (STRICTLY READ-ONLY)
    findings_after = db_session.query(Finding).filter(Finding.project_id == project.id).count()
    assert findings_after == 0


def test_get_diagnosis_not_found(client: TestClient):
    """Verify 404 returned for nonexistent project."""
    fake_id = uuid.uuid4()
    response = client.get(f"/api/projects/{fake_id}/diagnosis")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_post_diagnosis_generate(client: TestClient, project_with_traceability_api: Project):
    """Verify that POST /diagnosis/generate creates and returns populated diagnosis."""
    project = project_with_traceability_api
    response = client.post(f"/api/projects/{project.id}/diagnosis/generate")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    diag = data["diagnosis"]
    assert diag["project_id"] == str(project.id)
    assert diag["status"] in ("needs_attention", "significant_concern", "looks_solid")
    assert diag["total_findings"] > 0
    assert len(diag["top_findings"]) > 0
    assert len(diag["strengths"]) > 0


def test_list_findings_filtering_and_pagination(client: TestClient, project_with_traceability_api: Project):
    """Verify GET /findings with severity, limit, and offset filtering."""
    project = project_with_traceability_api
    # Generate findings first
    client.post(f"/api/projects/{project.id}/diagnosis/generate")

    # List all findings
    resp_all = client.get(f"/api/projects/{project.id}/findings")
    assert resp_all.status_code == 200
    all_findings = resp_all.json()
    assert len(all_findings) > 0

    # Filter by severity = major
    resp_major = client.get(f"/api/projects/{project.id}/findings?severity=major")
    assert resp_major.status_code == 200
    for f in resp_major.json():
        assert f["severity"] == "major"

    # Filter by severity = strength
    resp_strengths = client.get(f"/api/projects/{project.id}/findings?severity=strength")
    assert resp_strengths.status_code == 200
    for f in resp_strengths.json():
        assert f["severity"] == "strength"

    # Pagination test
    resp_paginated = client.get(f"/api/projects/{project.id}/findings?limit=1&offset=0")
    assert resp_paginated.status_code == 200
    assert len(resp_paginated.json()) == 1


def test_get_finding_detail_and_isolation(client: TestClient, project_with_traceability_api: Project, db_session: Session):
    """Verify GET /findings/{id} returns hydrated details and enforces project boundary isolation."""
    project_a = project_with_traceability_api
    client.post(f"/api/projects/{project_a.id}/diagnosis/generate")

    findings_a = client.get(f"/api/projects/{project_a.id}/findings").json()
    assert len(findings_a) > 0
    finding_id = findings_a[0]["id"]

    # 1. Fetch valid finding detail
    detail_resp = client.get(f"/api/projects/{project_a.id}/findings/{finding_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == finding_id
    assert "why_it_matters" in detail
    assert "technical_details" in detail

    # 2. Project Isolation: Fetch Project A's finding using Project B's ID -> must 404
    project_b = Project(
        title="Project B Isolation",
        problem_statement="Isolation check",
        description="Isolation verification",
    )
    db_session.add(project_b)
    db_session.commit()

    cross_resp = client.get(f"/api/projects/{project_b.id}/findings/{finding_id}")
    assert cross_resp.status_code == 404


def test_traceability_integration_triggers_diagnosis(client: TestClient, db_session: Session):
    """Verify that TraceabilityService automatically triggers diagnosis generation upon completion."""
    project = Project(
        title="Trace Integration Project",
        problem_statement="Test auto diagnosis trigger",
        description="Traceability to diagnosis flow",
    )
    db_session.add(project)
    db_session.commit()

    req = Requirement(
        project_id=project.id,
        requirement_id="REQ-INT-1",
        title="Core Engine",
        description="The primary processing logic",
        category="functional",
        content_hash="hash_int_1",
    )
    db_session.add(req)
    db_session.commit()

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/auto-diag",
        owner="student",
        repo_name="auto-diag",
        default_branch="main",
        status="synced",
    )
    db_session.add(repo)
    db_session.commit()

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="7777777777777777777777777777777777777777",
        branch="main",
        total_files=2,
        total_size_bytes=1000,
        structure_summary={
            "total_files": 2,
            "total_size_bytes": 1000,
            "languages": {"Python": 2},
            "evidence_counts": {"test_suite": 1, "documentation": 1},
        },
        is_current=True,
    )
    db_session.add(snapshot)
    db_session.commit()

    # Prior to traceability generation, findings count should be 0
    count_before = db_session.query(Finding).filter(Finding.project_id == project.id).count()
    assert count_before == 0

    # Call traceability generate endpoint
    trace_resp = client.post(f"/api/projects/{project.id}/traceability/generate?force=true")
    assert trace_resp.status_code == 200

    # Verify that diagnosis was automatically generated at the orchestration boundary!
    findings_after = db_session.query(Finding).filter(Finding.project_id == project.id).count()
    assert findings_after > 0

    # Verify read endpoint returns the generated diagnosis directly
    diag_resp = client.get(f"/api/projects/{project.id}/diagnosis")
    assert diag_resp.status_code == 200
    diag_data = diag_resp.json()
    assert diag_data["total_findings"] > 0
