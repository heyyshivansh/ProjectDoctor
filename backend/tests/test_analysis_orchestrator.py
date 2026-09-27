import uuid
from datetime import datetime, timezone, timedelta
from typing import Tuple
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.artifact import Artifact
from app.models.document_extraction import DocumentExtraction
from app.models.project_understanding import ProjectUnderstanding
from app.models.requirement import Requirement
from app.models.github_repository import GitHubRepository, RepositorySnapshot, RepositoryFile
from app.models.finding import Finding
from app.models.ai_analysis import AIAnalysis
from app.services.analysis.orchestrator import (
    ProjectAnalysisOrchestrator,
    STAGE_DOCUMENTS,
    STAGE_UNDERSTANDING,
    STAGE_REQUIREMENTS,
    STAGE_REPOSITORY,
    STAGE_TRACEABILITY,
    STAGE_DIAGNOSIS,
    STAGE_AI_REVIEW,
)


@pytest.fixture(autouse=True)
def clear_orchestrator_active_runs():
    """Ensure in-memory registry is empty before and after each test."""
    with ProjectAnalysisOrchestrator._LOCK:
        ProjectAnalysisOrchestrator._ACTIVE_ANALYSES.clear()
    yield
    with ProjectAnalysisOrchestrator._LOCK:
        ProjectAnalysisOrchestrator._ACTIVE_ANALYSES.clear()


@pytest.fixture
def project_ready_for_analysis(db_session: Session) -> Tuple[Project, Artifact, GitHubRepository, RepositorySnapshot]:
    """Create a project with both an artifact and a connected repository snapshot."""
    project = Project(
        title="Full Pipeline Project",
        problem_statement="Automated analysis orchestration testing",
        description="A full test fixture with docs and repo",
        status="created",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    artifact = Artifact(
        project_id=project.id,
        original_filename="spec.md",
        stored_filename="spec_123.md",
        storage_path="mock/path/spec_123.md",
        file_type="markdown",
        mime_type="text/markdown",
        file_size_bytes=512,
        status="stored",
    )
    db_session.add(artifact)

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/full-pipeline",
        owner="student",
        repo_name="full-pipeline",
        default_branch="main",
        status="connected",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="abcdef1234567890abcdef1234567890abcdef12",
        commit_message="Initial commit",
        commit_author="Student",
        branch="main",
        status="completed",
        is_current=True,
        total_files=10,
        structure_summary={"evidence_counts": {"test_suite": 1, "documentation": 1}},
    )
    db_session.add(snapshot)
    db_session.commit()
    db_session.refresh(snapshot)

    return project, artifact, repo, snapshot


def test_analysis_status_404_when_project_not_found(client: TestClient):
    """Querying analysis-status for a nonexistent project returns 404."""
    resp = client.get(f"/api/projects/{uuid.uuid4()}/analysis-status")
    assert resp.status_code == 404


def test_analysis_status_insufficient_evidence_when_empty(client: TestClient, db_session: Session):
    """New project with no docs and no repo returns insufficient_evidence."""
    project = Project(
        title="Empty Project",
        problem_statement="No evidence attached",
        description="Testing insufficient evidence",
    )
    db_session.add(project)
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "insufficient_evidence"
    assert "project documentation and a connected repository" in data["message"]


def test_analysis_status_insufficient_evidence_docs_only(client: TestClient, db_session: Session):
    """Project with docs only returns insufficient_evidence indicating repo is needed."""
    project = Project(
        title="Docs Only Project",
        problem_statement="Has docs but no repo",
        description="Testing docs only preflight",
    )
    db_session.add(project)
    db_session.commit()

    artifact = Artifact(
        project_id=project.id,
        original_filename="doc.pdf",
        stored_filename="doc_1.pdf",
        storage_path="mock/doc_1.pdf",
        file_type="pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
        status="stored",
    )
    db_session.add(artifact)
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "insufficient_evidence"
    assert "connected repository" in data["message"]


def test_analysis_status_insufficient_evidence_repo_only(client: TestClient, db_session: Session):
    """Project with repo only returns insufficient_evidence indicating docs are needed."""
    project = Project(
        title="Repo Only Project",
        problem_statement="Has repo but no docs",
        description="Testing repo only preflight",
    )
    db_session.add(project)
    db_session.commit()

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/repo-only",
        owner="student",
        repo_name="repo-only",
        default_branch="main",
        status="connected",
    )
    db_session.add(repo)
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "insufficient_evidence"
    assert "project documentation" in data["message"]


def test_trigger_analysis_422_when_insufficient_evidence(client: TestClient, db_session: Session):
    """Triggering analysis when evidence is insufficient returns 422 with plain language explanation."""
    project = Project(
        title="No Evidence Project",
        problem_statement="Test 422 trigger",
        description="Should fail pre-flight",
    )
    db_session.add(project)
    db_session.commit()

    resp = client.post(f"/api/projects/{project.id}/analyze")
    assert resp.status_code == 422
    assert "Project Doctor needs" in resp.json()["detail"]


def test_trigger_analysis_202_accepted_and_starts_background_run(
    client: TestClient,
    project_ready_for_analysis,
    monkeypatch,
):
    """Triggering analysis on a ready project returns 202 Accepted and sets running state."""
    project, _, _, _ = project_ready_for_analysis

    # Prevent actual pipeline execution from running inside the test worker
    monkeypatch.setattr(
        ProjectAnalysisOrchestrator,
        "_execute_pipeline_task",
        lambda project_id, force=False: None,
    )

    resp = client.post(f"/api/projects/{project.id}/analyze")
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "running"
    assert data["current_stage"] == STAGE_DOCUMENTS
    assert len(data["stages"]) == 7
    assert data["stages"][0]["status"] == "active"


def test_trigger_analysis_duplicate_call_is_idempotent(
    client: TestClient,
    project_ready_for_analysis,
    monkeypatch,
):
    """Subsequent analyze calls while active return the running run state with 200 OK."""
    project, _, _, _ = project_ready_for_analysis

    monkeypatch.setattr(
        ProjectAnalysisOrchestrator,
        "_execute_pipeline_task",
        lambda project_id, force=False: None,
    )

    # First call returns 202
    resp1 = client.post(f"/api/projects/{project.id}/analyze")
    assert resp1.status_code == 202

    # Second call returns 200 with same status
    resp2 = client.post(f"/api/projects/{project.id}/analyze")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "running"
    assert "already actively running" in resp2.json()["message"]


def test_analysis_status_truthful_interrupted_after_backend_restart(
    client: TestClient,
    project_ready_for_analysis,
    db_session: Session,
):
    """If DB shows 'analyzing' but in-memory registry is empty, status returns 'interrupted'."""
    project, _, _, _ = project_ready_for_analysis

    # Simulate backend crash/restart: DB status is analyzing, memory is clear
    project.status = "analyzing"
    db_session.commit()

    with ProjectAnalysisOrchestrator._LOCK:
        ProjectAnalysisOrchestrator._ACTIVE_ANALYSES.clear()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "interrupted"
    assert "evaluation stopped before it finished" in data["message"]


def test_analysis_status_truthful_failed_status(
    client: TestClient,
    project_ready_for_analysis,
    db_session: Session,
):
    """If DB shows 'failed', status returns 'failed' with retry guidance."""
    project, _, _, _ = project_ready_for_analysis

    project.status = "failed"
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "safely try again" in data["message"]


def test_analysis_status_completed_with_counts(
    client: TestClient,
    project_ready_for_analysis,
    db_session: Session,
):
    """Completed analysis returns verdict counts and up-to-date state."""
    project, _, _, snapshot = project_ready_for_analysis

    # Add sample findings
    f1 = Finding(
        project_id=project.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        finding_type="security_risk",
        severity="critical",
        title="Critical finding",
        summary="Summary 1",
        why_it_matters="Matters",
        suggested_action="Fix",
        finding_hash="hash_c1",
    )
    f2 = Finding(
        project_id=project.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        finding_type="testing_gap",
        severity="major",
        title="Major finding",
        summary="Summary 2",
        why_it_matters="Matters",
        suggested_action="Fix",
        finding_hash="hash_m1",
    )
    f3 = Finding(
        project_id=project.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        finding_type="strength",
        severity="strength",
        title="Strength finding",
        summary="Summary 3",
        why_it_matters="Matters",
        suggested_action="Maintain",
        finding_hash="hash_s1",
    )
    db_session.add_all([f1, f2, f3])
    project.status = "analyzed"
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["is_stale"] is False
    assert data["critical_count"] == 1
    assert data["needs_attention_count"] == 1
    assert data["strengths_count"] == 1


def test_analysis_status_detects_commit_drift_as_stale(
    client: TestClient,
    project_ready_for_analysis,
    db_session: Session,
):
    """If repository snapshot commit differs from evaluated findings commit, status is 'stale'."""
    project, _, _, snapshot = project_ready_for_analysis

    # Finding evaluated at old commit
    old_sha = "1111111111111111111111111111111111111111"
    f = Finding(
        project_id=project.id,
        snapshot_id=snapshot.id,
        commit_sha=old_sha,
        finding_type="strength",
        severity="strength",
        title="Old strength",
        summary="Summary",
        why_it_matters="Matters",
        suggested_action="Maintain",
        finding_hash="hash_old",
    )
    db_session.add(f)
    project.status = "analyzed"
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "stale"
    assert data["is_stale"] is True
    assert "New commits detected" in data["stale_reason"]


def test_analysis_status_detects_document_drift_as_stale(
    client: TestClient,
    project_ready_for_analysis,
    db_session: Session,
):
    """If a document was uploaded after findings were created, status is 'stale'."""
    project, artifact, _, snapshot = project_ready_for_analysis

    # Finding created with timestamp T
    finding_time = datetime.now(timezone.utc) - timedelta(hours=2)
    f = Finding(
        project_id=project.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        finding_type="strength",
        severity="strength",
        title="Doc strength",
        summary="Summary",
        why_it_matters="Matters",
        suggested_action="Maintain",
        finding_hash="hash_doc_s",
        created_at=finding_time,
    )
    db_session.add(f)

    # Artifact uploaded later at T + 1 hour
    artifact.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
    project.status = "analyzed"
    db_session.commit()

    resp = client.get(f"/api/projects/{project.id}/analysis-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "stale"
    assert data["is_stale"] is True
    assert "documents uploaded" in data["stale_reason"]


def test_zero_requirements_traceability_and_repo_rules_succeed(
    db_session: Session,
    project_ready_for_analysis,
    monkeypatch,
):
    """Zero requirements extracted does not throw an error; repository structural rules succeed."""
    project, artifact, repo, snapshot = project_ready_for_analysis

    # Mock extractors and understanding
    monkeypatch.setattr(
        "app.services.documents.extraction_service.DocumentExtractionService.extract_all_project_artifacts",
        lambda db, pid: [],
    )
    monkeypatch.setattr(
        "app.services.analysis.understanding_service.ProjectUnderstandingService.generate_understanding",
        lambda db, pid: None,
    )
    monkeypatch.setattr(
        "app.services.analysis.requirement_service.RequirementService.extract_project_requirements",
        lambda db, pid, force_regenerate=False: None,
    )
    monkeypatch.setattr(
        "app.services.analysis.requirement_service.RequirementService.get_project_requirements",
        lambda db, pid: [],
    )
    monkeypatch.setattr(
        "app.services.github.service.GitHubRepositoryService.sync_repository",
        lambda db, pid, force=False: (snapshot, False),
    )
    monkeypatch.setattr(
        "app.services.ai.service.AIAnalysisService.generate_analysis",
        lambda db, pid, snapshot_id=None, force=False: (
            type("Resp", (), {"status": "completed"})(),
            False,
        ),
    )

    result = ProjectAnalysisOrchestrator.run_pipeline(
        db=db_session,
        project_id=project.id,
        force=True,
    )

    assert result.status == "completed"
    assert project.status == "analyzed"
    # Verification that repository rules ran (e.g. RULE_09 test suite present or RULE_10 docs)
    findings = db_session.scalars(
        Finding.__table__.select().where(Finding.project_id == project.id)
    ).all()
    assert len(findings) > 0


def test_ai_failure_preserves_deterministic_findings(
    db_session: Session,
    project_ready_for_analysis,
    monkeypatch,
):
    """If Gemini AI reasoning throws an exception (e.g. 429 quota or network), deterministic findings are fully preserved."""
    project, artifact, repo, snapshot = project_ready_for_analysis

    # Mock stages 1-6
    monkeypatch.setattr(
        "app.services.documents.extraction_service.DocumentExtractionService.extract_all_project_artifacts",
        lambda db, pid: [],
    )
    monkeypatch.setattr(
        "app.services.analysis.understanding_service.ProjectUnderstandingService.generate_understanding",
        lambda db, pid: None,
    )
    monkeypatch.setattr(
        "app.services.analysis.requirement_service.RequirementService.get_project_requirements",
        lambda db, pid: [],
    )
    monkeypatch.setattr(
        "app.services.github.service.GitHubRepositoryService.sync_repository",
        lambda db, pid, force=False: (snapshot, False),
    )

    def mock_ai_fail(*args, **kwargs):
        raise RuntimeError("Google Gemini API 429 RateLimitExceeded")

    monkeypatch.setattr(
        "app.services.ai.service.AIAnalysisService.generate_analysis",
        mock_ai_fail,
    )

    result = ProjectAnalysisOrchestrator.run_pipeline(
        db=db_session,
        project_id=project.id,
        force=True,
    )

    # Pipeline completes with ai_status="unavailable"
    assert result.status == "completed"
    assert result.ai_status == "unavailable"
    assert project.status == "analyzed"
    # Stage 7 recorded graceful degradation
    ai_stage = next(s for s in result.stages if s.stage == STAGE_AI_REVIEW)
    assert ai_stage.status == "completed"
    assert "AI synthesis unavailable" in ai_stage.detail


def test_preflight_repo_statuses(db_session: Session, project_ready_for_analysis):
    """Verify preflight allows connected, synced, and error statuses when docs exist,
    and rejects only when no repository record exists."""
    project, artifact, repo, snapshot = project_ready_for_analysis

    # 1. Connected repo -> passes
    repo.status = "connected"
    db_session.commit()
    ready, msg = ProjectAnalysisOrchestrator.check_preflight_evidence(db_session, project.id)
    assert ready is True
    assert msg is None

    # 2. Synced repo -> passes
    repo.status = "synced"
    db_session.commit()
    ready, msg = ProjectAnalysisOrchestrator.check_preflight_evidence(db_session, project.id)
    assert ready is True
    assert msg is None

    # 3. Error-status repo -> passes (allows recovery/retry)
    repo.status = "error"
    repo.error_message = "GitHub API rate limit exceeded"
    db_session.commit()
    ready, msg = ProjectAnalysisOrchestrator.check_preflight_evidence(db_session, project.id)
    assert ready is True
    assert msg is None


def test_preflight_rejects_when_no_repository_record(db_session: Session):
    """Project with docs but completely absent repo record is rejected."""
    project = Project(title="No Repo", problem_statement="Problem", description="Desc")
    db_session.add(project)
    db_session.commit()

    artifact = Artifact(
        project_id=project.id,
        original_filename="doc.pdf",
        stored_filename="doc.pdf",
        storage_path="mock/path",
        file_type="pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
        status="stored",
    )
    db_session.add(artifact)
    db_session.commit()

    ready, msg = ProjectAnalysisOrchestrator.check_preflight_evidence(db_session, project.id)
    assert ready is False
    assert "connected repository" in msg


def test_trigger_analysis_allows_error_status_repo_to_retry(
    client: TestClient,
    project_ready_for_analysis,
    db_session: Session,
    monkeypatch,
):
    """When repo status is 'error', POST /analyze allows analysis to start (returns 202)
    rather than blocking with 422, enabling recovery."""
    project, _, repo, _ = project_ready_for_analysis
    repo.status = "error"
    repo.error_message = "GitHub API rate limit exceeded"
    db_session.commit()

    monkeypatch.setattr(
        ProjectAnalysisOrchestrator,
        "_execute_pipeline_task",
        lambda project_id, force=False: None,
    )

    resp = client.post(f"/api/projects/{project.id}/analyze")
    assert resp.status_code == 202
    assert resp.json()["status"] == "running"


def test_stage_repository_reuses_existing_snapshot_when_refresh_fails(
    db_session: Session,
    project_ready_for_analysis,
    monkeypatch,
):
    """When force=False and remote GitHub refresh fails (e.g. rate limit),
    Stage 4 reuses the existing completed snapshot truthfully without fabricating a sync."""
    project, artifact, repo, snapshot = project_ready_for_analysis
    repo.status = "error"
    db_session.commit()

    # Mock stages 1-3, 5-7
    monkeypatch.setattr(
        "app.services.documents.extraction_service.DocumentExtractionService.list_project_extractions",
        lambda db, pid, status_filter=None: [],
    )
    monkeypatch.setattr(
        "app.services.analysis.understanding_service.ProjectUnderstandingService.generate_understanding",
        lambda db, pid: None,
    )
    monkeypatch.setattr(
        "app.services.analysis.requirement_service.RequirementService.get_project_requirements",
        lambda db, pid: [],
    )
    monkeypatch.setattr(
        "app.services.ai.service.AIAnalysisService.generate_analysis",
        lambda db, pid, snapshot_id=None, force=False: (
            type("AIResp", (), {"status": "completed"})(),
            False,
        ),
    )

    # Remote GitHub sync throws RateLimitError
    def mock_sync_fail(*args, **kwargs):
        raise RuntimeError("GitHub API rate limit exceeded. Resets at: 2026-09-21T18:00:00Z")

    monkeypatch.setattr(
        "app.services.github.service.GitHubRepositoryService.sync_repository",
        mock_sync_fail,
    )

    # When force=False, pipeline should gracefully use existing snapshot
    result = ProjectAnalysisOrchestrator.run_pipeline(
        db=db_session,
        project_id=project.id,
        force=False,
    )

    assert result.status == "completed"
    repo_stage = next(s for s in result.stages if s.stage == STAGE_REPOSITORY)
    assert repo_stage.status == "completed"
    assert "remote sync unavailable" in repo_stage.detail
    assert snapshot.commit_sha[:7] in repo_stage.detail


def test_stage_repository_fails_truthfully_on_force_when_github_fails(
    db_session: Session,
    project_ready_for_analysis,
    monkeypatch,
):
    """When force=True and remote GitHub sync fails, Stage 4 fails truthfully
    and does NOT fabricate a successful repository sync."""
    project, artifact, repo, snapshot = project_ready_for_analysis

    monkeypatch.setattr(
        "app.services.documents.extraction_service.DocumentExtractionService.list_project_extractions",
        lambda db, pid, status_filter=None: [],
    )

    def mock_sync_fail(*args, **kwargs):
        raise RuntimeError("GitHub API rate limit exceeded")

    monkeypatch.setattr(
        "app.services.github.service.GitHubRepositoryService.sync_repository",
        mock_sync_fail,
    )

    # When force=True, pipeline must NOT fabricate a sync and must raise
    with pytest.raises(RuntimeError, match="GitHub API rate limit exceeded"):
        ProjectAnalysisOrchestrator.run_pipeline(
            db=db_session,
            project_id=project.id,
            force=True,
        )
