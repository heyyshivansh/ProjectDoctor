import uuid
from datetime import datetime, timezone
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


@pytest.fixture
def project_with_requirements(db_session: Session) -> Project:
    project = Project(
        title="Traceability Test Project",
        problem_statement="Testing requirement to code traceability engine",
        description="A project for validating Checkpoint 6 traceability capabilities",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # REQ-001: User Authentication (will match auth.py and test_auth.py -> candidate_with_tests)
    req1 = Requirement(
        project_id=project.id,
        requirement_id="REQ-001",
        title="User Authentication via JWT",
        description="The system shall provide secure user login and token-based authentication.",
        category="security",
        content_hash="hash_req_001",
    )
    # REQ-002: Document Upload (will match upload.py only, no tests -> candidate)
    req2 = Requirement(
        project_id=project.id,
        requirement_id="REQ-002",
        title="Document Upload Service",
        description="Users shall be able to upload PDF and DOCX documents.",
        category="functional",
        content_hash="hash_req_002",
    )
    # REQ-003: Blockchain Integration (no matching files -> unmatched)
    req3 = Requirement(
        project_id=project.id,
        requirement_id="REQ-003",
        title="Decentralized Smart Contract Execution",
        description="The platform shall deploy Ethereum smart contracts for immutable audit logs.",
        category="functional",
        content_hash="hash_req_003",
    )
    # REQ-004: Ambiguous Notification Service (matches notification in v1 and v2)
    req4 = Requirement(
        project_id=project.id,
        requirement_id="REQ-004",
        title="Real-Time Notification Dispatcher",
        description="The system shall send instant alerts and notifications to users.",
        category="interface",
        content_hash="hash_req_004",
    )

    db_session.add_all([req1, req2, req3, req4])
    db_session.commit()

    # Add specification evidence to REQ-001
    spec_ev = RequirementEvidence(
        requirement_id=req1.id,
        project_id=project.id,
        source_type="artifact_document",
        artifact_name="SRS_Specification.pdf",
        page_number=3,
        section_title="3.1 Authentication Security",
        exact_snippet="The system shall authenticate users using JWT with bcrypt password hashing.",
        extraction_method="deterministic_section_extraction",
        confidence=1.0,
    )
    db_session.add(spec_ev)
    db_session.commit()

    db_session.refresh(project)
    return project


@pytest.fixture
def repo_with_snapshot(db_session: Session, project_with_requirements: Project) -> RepositorySnapshot:
    project = project_with_requirements
    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/test-org/trace-repo",
        owner="test-org",
        repo_name="trace-repo",
        default_branch="main",
        status="synced",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        branch="main",
        is_current=True,
        total_files=8,
        status="completed",
    )
    db_session.add(snapshot)
    db_session.commit()
    db_session.refresh(snapshot)

    # Add Repository Files
    files = [
        # Auth files
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="src/api/auth.py",
            file_name="auth.py",
            file_extension=".py",
            language="Python",
            file_size_bytes=1200,
            blob_sha="blob_auth_py",
        ),
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="tests/test_auth.py",
            file_name="test_auth.py",
            file_extension=".py",
            language="Python",
            file_size_bytes=800,
            blob_sha="blob_test_auth",
        ),
        # Upload files
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="src/services/upload_service.py",
            file_name="upload_service.py",
            file_extension=".py",
            language="Python",
            file_size_bytes=2000,
            blob_sha="blob_upload",
        ),
        # Ambiguous notification files in different dirs
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="modules/v1/notification_sender.py",
            file_name="notification_sender.py",
            file_extension=".py",
            language="Python",
            file_size_bytes=900,
            blob_sha="blob_notif_v1",
        ),
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="services/v2/notification_handler.py",
            file_name="notification_handler.py",
            file_extension=".py",
            language="Python",
            file_size_bytes=950,
            blob_sha="blob_notif_v2",
        ),
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="legacy/notifications.py",
            file_name="notifications.py",
            file_extension=".py",
            language="Python",
            file_size_bytes=700,
            blob_sha="blob_notif_legacy",
        ),
        # Ignored and binary files (must be skipped)
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path="node_modules/auth-lib/index.js",
            file_name="index.js",
            file_extension=".js",
            is_ignored=True,
            blob_sha="blob_ignored",
        ),
        RepositoryFile(
            snapshot_id=snapshot.id,
            project_id=project.id,
            file_path=".env",
            file_name=".env",
            content_status="security_omitted",
            blob_sha="blob_sec",
        ),
    ]
    db_session.add_all(files)
    db_session.commit()

    # Add Repository Evidence
    ev_auth = RepositoryEvidence(
        snapshot_id=snapshot.id,
        project_id=project.id,
        commit_sha=snapshot.commit_sha,
        file_path="src/api/auth.py",
        evidence_type="entrypoint",
        language="Python",
        start_line=10,
        end_line=25,
        content_snippet="@router.post('/login')\ndef authenticate_user(credentials):\n    return create_jwt_token(credentials)",
        evidence_hash="ev_hash_auth",
        extraction_method="deterministic_blob_inspection",
    )
    ev_test = RepositoryEvidence(
        snapshot_id=snapshot.id,
        project_id=project.id,
        commit_sha=snapshot.commit_sha,
        file_path="tests/test_auth.py",
        evidence_type="test_suite",
        language="Python",
        start_line=1,
        end_line=15,
        content_snippet="def test_authenticate_user_success():\n    assert verify_token(token)",
        evidence_hash="ev_hash_test_auth",
        extraction_method="deterministic_blob_inspection",
    )
    db_session.add_all([ev_auth, ev_test])
    db_session.commit()

    return snapshot


def test_generate_traceability_requires_repository(client: TestClient, db_session: Session):
    """Test 400 when generating traceability on a project with no connected repository."""
    proj = Project(
        title="No Repo Project",
        problem_statement="Testing repo requirement",
        description="Desc",
    )
    db_session.add(proj)
    db_session.commit()

    resp = client.post(f"/api/projects/{proj.id}/traceability/generate")
    assert resp.status_code == 400
    assert "no github repository connected" in resp.json()["detail"].lower()


def test_generate_traceability_full_suite(
    client: TestClient,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Verify deterministic candidate matching, status classification, and metrics."""
    pid = project_with_requirements.id

    resp = client.post(f"/api/projects/{pid}/traceability/generate")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "completed"
    assert data["total_requirements"] == 4
    assert data["generated_links_count"] >= 5
    assert data["commit_sha"] == repo_with_snapshot.commit_sha

    metrics = data["metrics"]
    assert metrics["candidate_with_tests_count"] >= 1  # REQ-001 (auth.py + test_auth.py)
    assert metrics["candidate_count"] >= 1  # REQ-002 (upload_service.py, no tests)
    assert metrics["unmatched_count"] >= 1  # REQ-003 (smart contracts)
    assert metrics["ambiguous_count"] >= 1  # REQ-004 (notification in v1, v2, legacy)
    assert metrics["coverage_percentage"] > 0


def test_list_traceability_summaries_and_filtering(
    client: TestClient,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Test listing requirement traceability summaries with category/status filters."""
    pid = project_with_requirements.id

    # 1. Generate traceability
    client.post(f"/api/projects/{pid}/traceability/generate")

    # 2. List all summaries
    resp = client.get(f"/api/projects/{pid}/traceability")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 4

    # Verify REQ-001 (candidate_with_tests with candidate files and test files)
    req1 = next(item for item in items if item["requirement_code"] == "REQ-001")
    assert req1["status"] == "candidate_with_tests"
    assert req1["implementation_count"] >= 1
    assert req1["test_count"] >= 1
    assert "src/api/auth.py" in req1["candidate_files"]
    assert "tests/test_auth.py" in req1["test_files"]
    assert req1["specification_evidence_count"] >= 1

    # Verify REQ-002 (candidate with implementation but 0 tests)
    req2 = next(item for item in items if item["requirement_code"] == "REQ-002")
    assert req2["status"] == "candidate"
    assert req2["implementation_count"] >= 1
    assert req2["test_count"] == 0

    # Verify REQ-003 (unmatched)
    req3 = next(item for item in items if item["requirement_code"] == "REQ-003")
    assert req3["status"] == "unmatched"
    assert req3["implementation_count"] == 0
    assert req3["test_count"] == 0

    # Verify REQ-004 (ambiguous)
    req4 = next(item for item in items if item["requirement_code"] == "REQ-004")
    assert req4["status"] == "ambiguous"

    # 3. Filter by status
    filter_resp = client.get(f"/api/projects/{pid}/traceability?status=candidate_with_tests")
    assert filter_resp.status_code == 200
    filtered = filter_resp.json()
    assert len(filtered) == 1
    assert filtered[0]["requirement_code"] == "REQ-001"


def test_get_traceability_metrics(
    client: TestClient,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Test retrieving aggregate traceability metrics."""
    pid = project_with_requirements.id
    client.post(f"/api/projects/{pid}/traceability/generate")

    resp = client.get(f"/api/projects/{pid}/traceability/summary")
    assert resp.status_code == 200
    data = resp.json()

    assert data["has_repository"] is True
    assert data["total_requirements"] == 4
    assert data["candidate_with_tests_count"] == 1
    assert data["candidate_count"] == 1
    assert data["unmatched_count"] == 1
    assert data["ambiguous_count"] == 1
    assert data["coverage_percentage"] == 50.0  # (1 candidate_with_tests + 1 candidate) / 4


def test_get_requirement_traceability_detail(
    client: TestClient,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Test retrieving deep-dive traceability detail for a single requirement."""
    pid = project_with_requirements.id
    client.post(f"/api/projects/{pid}/traceability/generate")

    resp = client.get(f"/api/projects/{pid}/traceability/REQ-001")
    assert resp.status_code == 200
    detail = resp.json()

    assert detail["requirement_code"] == "REQ-001"
    assert detail["status"] == "candidate_with_tests"
    assert len(detail["specification_evidence"]) >= 1
    assert detail["specification_evidence"][0]["artifact_name"] == "SRS_Specification.pdf"

    # Implementation links
    assert len(detail["implementation_links"]) >= 1
    impl_link = detail["implementation_links"][0]
    assert impl_link["file_path"] == "src/api/auth.py"
    assert impl_link["is_test_evidence"] is False
    assert "https://github.com/test-org/trace-repo/blob/" in impl_link["github_url"]
    assert "@router.post" in impl_link["code_snippet"]

    # Test links
    assert len(detail["test_links"]) >= 1
    test_link = detail["test_links"][0]
    assert test_link["file_path"] == "tests/test_auth.py"
    assert test_link["is_test_evidence"] is True

    # Verification note
    assert detail["verification_note"] is not None
    assert "endpoint routing" in detail["verification_note"].lower()


def test_traceability_idempotency(
    client: TestClient,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Test that running generation multiple times on the same snapshot is idempotent."""
    pid = project_with_requirements.id

    first_res = client.post(f"/api/projects/{pid}/traceability/generate")
    assert first_res.status_code == 200
    first_data = first_res.json()

    second_res = client.post(f"/api/projects/{pid}/traceability/generate")
    assert second_res.status_code == 200
    second_data = second_res.json()

    assert first_data["generated_links_count"] == second_data["generated_links_count"]
    assert first_data["metrics"] == second_data["metrics"]


def test_traceability_commit_snapshot_isolation(
    client: TestClient,
    db_session: Session,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Test that creating a new commit snapshot maintains separate traceability records."""
    pid = project_with_requirements.id
    first_snapshot = repo_with_snapshot

    # 1. Generate for first snapshot
    client.post(f"/api/projects/{pid}/traceability/generate")

    # 2. Simulate new commit arriving on GitHub
    repo = db_session.get(GitHubRepository, first_snapshot.repository_id)
    first_snapshot.is_current = False

    second_snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=pid,
        commit_sha="b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
        branch="main",
        is_current=True,
        total_files=2,
        status="completed",
    )
    db_session.add(second_snapshot)
    db_session.commit()

    # Second commit only has auth.py, no test_auth.py!
    auth_file2 = RepositoryFile(
        snapshot_id=second_snapshot.id,
        project_id=pid,
        file_path="src/api/auth.py",
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        file_size_bytes=1200,
        blob_sha="blob_auth_py2",
    )
    db_session.add(auth_file2)
    db_session.commit()

    # 3. Generate for second snapshot
    gen2_res = client.post(f"/api/projects/{pid}/traceability/generate")
    assert gen2_res.status_code == 200
    assert gen2_res.json()["commit_sha"] == second_snapshot.commit_sha

    # 4. In active snapshot, REQ-001 is now 'candidate' (since test file was removed in this commit)
    active_res = client.get(f"/api/projects/{pid}/traceability")
    active_req1 = next(r for r in active_res.json() if r["requirement_code"] == "REQ-001")
    assert active_req1["status"] == "candidate"
    assert active_req1["commit_sha"] == second_snapshot.commit_sha

    # 5. Query historical snapshot explicitly — REQ-001 remains 'candidate_with_tests' with old commit SHA!
    old_res = client.get(f"/api/projects/{pid}/traceability?snapshot_id={first_snapshot.id}")
    old_req1 = next(r for r in old_res.json() if r["requirement_code"] == "REQ-001")
    assert old_req1["status"] == "candidate_with_tests"
    assert old_req1["commit_sha"] == first_snapshot.commit_sha


def test_traceability_project_isolation(
    client: TestClient,
    db_session: Session,
    project_with_requirements: Project,
    repo_with_snapshot: RepositorySnapshot,
):
    """Test that Project B cannot access Project A's traceability."""
    # Generate for Project A
    client.post(f"/api/projects/{project_with_requirements.id}/traceability/generate")

    # Create isolated Project B
    proj_b = Project(
        title="Project B",
        problem_statement="Isolated",
        description="Isolated",
    )
    db_session.add(proj_b)
    db_session.commit()

    # Query Project B traceability
    resp_b = client.get(f"/api/projects/{proj_b.id}/traceability")
    assert resp_b.status_code == 200
    assert resp_b.json() == []

    # Attempt generate on Project B without repo -> 400
    gen_b = client.post(f"/api/projects/{proj_b.id}/traceability/generate")
    assert gen_b.status_code == 400


def test_traceability_same_directory_ambiguity(client: TestClient, db_session: Session):
    """Test that competing candidate variants in the same directory (e.g. auth.py vs auth_v2.py) trigger 'ambiguous' status."""
    proj = Project(
        title="Ambiguity Test Project",
        problem_statement="Testing same-directory candidate ambiguity",
        description="Ambiguity test",
    )
    db_session.add(proj)
    db_session.commit()
    db_session.refresh(proj)

    req = Requirement(
        project_id=proj.id,
        requirement_id="REQ-AMB-01",
        title="User Authentication Service",
        description="System must authenticate users and generate tokens.",
        category="security",
        content_hash="hash_amb_01",
    )
    db_session.add(req)
    db_session.commit()

    repo = GitHubRepository(
        project_id=proj.id,
        repo_url="https://github.com/test-org/amb-repo",
        owner="test-org",
        repo_name="amb-repo",
        default_branch="main",
        status="synced",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    snap = RepositorySnapshot(
        repository_id=repo.id,
        project_id=proj.id,
        commit_sha="c1c2c3c4c5c6c1c2c3c4c5c6c1c2c3c4c5c6c1c2",
        branch="main",
        is_current=True,
        total_files=2,
        status="completed",
    )
    db_session.add(snap)
    db_session.commit()
    db_session.refresh(snap)

    # Two competing files in the same directory: src/services/auth.py and src/services/auth_v2.py
    file1 = RepositoryFile(
        snapshot_id=snap.id,
        project_id=proj.id,
        file_path="src/services/auth.py",
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        file_size_bytes=1000,
        blob_sha="blob_auth_1",
    )
    file2 = RepositoryFile(
        snapshot_id=snap.id,
        project_id=proj.id,
        file_path="src/services/auth_v2.py",
        file_name="auth_v2.py",
        file_extension=".py",
        language="Python",
        file_size_bytes=1050,
        blob_sha="blob_auth_2",
    )
    db_session.add_all([file1, file2])
    db_session.commit()

    # Generate traceability
    resp = client.post(f"/api/projects/{proj.id}/traceability/generate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["metrics"]["ambiguous_count"] == 1

    # Check detail
    detail_resp = client.get(f"/api/projects/{proj.id}/traceability/REQ-AMB-01")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["status"] == "ambiguous"
    assert "competing candidate files" in detail["summary_notes"].lower()
    assert "auth.py" in detail["summary_notes"]
    assert "auth_v2.py" in detail["summary_notes"]
    assert "src/services" in detail["summary_notes"]
    assert detail["verification_note"] is not None
    assert "competing candidate files" in detail["verification_note"].lower()
