import hashlib
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session
import sqlalchemy as sa

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
def project_with_full_evidence(db_session: Session) -> Tuple_Fixture:
    """Fixture creating project, requirements, repo, snapshot, files, and traceability."""
    # 1. Create Project
    project = Project(
        title="Diagnostic Engine Test Project",
        problem_statement="Validate CP7a deterministic finding rules",
        description="Comprehensive diagnostic verification fixture",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # 2. Create Requirements
    # REQ-1: Unmatched -> will test RULE-01
    req_unmatched = Requirement(
        project_id=project.id,
        requirement_id="REQ-001",
        title="Decentralized Storage Support",
        description="Must integrate IPFS decentralized storage nodes.",
        category="functional",
        content_hash="hash_unmatched_1",
    )
    # REQ-2: Ambiguous -> will test RULE-02
    req_ambiguous = Requirement(
        project_id=project.id,
        requirement_id="REQ-002",
        title="Payment Gateway Integration",
        description="Process credit card transactions via Stripe or PayPal.",
        category="functional",
        content_hash="hash_ambiguous_2",
    )
    # REQ-3: Candidate without tests -> will test RULE-03
    req_candidate = Requirement(
        project_id=project.id,
        requirement_id="REQ-003",
        title="Document Upload Handler",
        description="Users can upload PDF and text documents.",
        category="functional",
        content_hash="hash_candidate_3",
    )
    # REQ-4: Candidate with tests -> will test RULE-08 (strength)
    req_with_tests = Requirement(
        project_id=project.id,
        requirement_id="REQ-004",
        title="User Authentication",
        description="Authenticate users via JWT tokens and bcrypt.",
        category="security",
        content_hash="hash_with_tests_4",
    )
    # REQ-5: Ambiguous Specification -> will test RULE-06
    req_spec_ambiguous = Requirement(
        project_id=project.id,
        requirement_id="REQ-005",
        title="Real-Time Notifications",
        description="Notification system with conflicting requirements in SRS.",
        category="interface",
        is_ambiguous=True,
        conflict_summary="Proposal specifies WebSocket alerts but architecture specifies polling.",
        content_hash="hash_spec_ambiguous_5",
    )
    db_session.add_all([req_unmatched, req_ambiguous, req_candidate, req_with_tests, req_spec_ambiguous])
    db_session.commit()

    # Add specification evidence to REQ-004
    spec_ev = RequirementEvidence(
        requirement_id=req_with_tests.id,
        project_id=project.id,
        source_type="artifact_document",
        artifact_name="SRS.pdf",
        page_number=4,
        section_title="3.2 Authentication",
        exact_snippet="The system shall provide JWT authentication.",
        extraction_method="deterministic_section_extraction",
        confidence=1.0,
    )
    db_session.add(spec_ev)
    db_session.commit()

    # 3. Create Repository & Snapshot
    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/diagnose-repo",
        owner="student",
        repo_name="diagnose-repo",
        default_branch="main",
        status="synced",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="a1b2c3d4e5f67890123456789012345678901234",
        branch="main",
        total_files=5,
        total_size_bytes=10240,
        structure_summary={
            "total_files": 5,
            "total_size_bytes": 10240,
            "languages": {"Python": 4},
            "evidence_counts": {
                "manifest": 1,
                "configuration": 1,
                "entrypoint": 1,
                "test_suite": 1,
                "documentation": 1,
            },
        },
        is_current=True,
        status="completed",
    )
    db_session.add(snapshot)
    db_session.commit()
    db_session.refresh(snapshot)

    # 4. Create Repository Files (including a sensitive file for RULE-04)
    file_auth = RepositoryFile(
        snapshot_id=snapshot.id,
        project_id=project.id,
        file_path="app/auth.py",
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        blob_sha="blob_auth",
        content_status="indexed_metadata_only",
    )
    file_test_auth = RepositoryFile(
        snapshot_id=snapshot.id,
        project_id=project.id,
        file_path="tests/test_auth.py",
        file_name="test_auth.py",
        file_extension=".py",
        language="Python",
        blob_sha="blob_test_auth",
        content_status="indexed_metadata_only",
    )
    file_upload = RepositoryFile(
        snapshot_id=snapshot.id,
        project_id=project.id,
        file_path="app/upload.py",
        file_name="upload.py",
        file_extension=".py",
        language="Python",
        blob_sha="blob_upload",
        content_status="indexed_metadata_only",
    )
    file_secret = RepositoryFile(
        snapshot_id=snapshot.id,
        project_id=project.id,
        file_path=".env",
        file_name=".env",
        file_extension="",
        language=None,
        blob_sha="blob_secret",
        content_status="security_omitted",  # Sensitive file
    )
    db_session.add_all([file_auth, file_test_auth, file_upload, file_secret])
    db_session.commit()

    # 5. Create Traceability Summaries & Links
    # REQ-1: unmatched
    trace_1 = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req_unmatched.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        status="unmatched",
        implementation_count=0,
        test_count=0,
        summary_notes="No matching code found.",
    )
    # REQ-2: ambiguous
    trace_2 = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req_ambiguous.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        status="ambiguous",
        implementation_count=2,
        test_count=0,
        summary_notes="Multiple competing variants found.",
    )
    # REQ-3: candidate (without tests)
    trace_3 = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req_candidate.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        status="candidate",
        implementation_count=1,
        test_count=0,
        summary_notes="Located upload.py without tests.",
    )
    # REQ-4: candidate_with_tests
    trace_4 = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req_with_tests.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        status="candidate_with_tests",
        implementation_count=1,
        test_count=1,
        summary_notes="Located auth.py and test_auth.py.",
    )
    db_session.add_all([trace_1, trace_2, trace_3, trace_4])
    db_session.commit()

    # Add traceability link for REQ-4
    link_4 = RequirementTraceabilityLink(
        traceability_id=trace_4.id,
        project_id=project.id,
        requirement_id=req_with_tests.id,
        snapshot_id=snapshot.id,
        commit_sha=snapshot.commit_sha,
        file_path="app/auth.py",
        evidence_type="route_endpoint",
        is_test_evidence=False,
        match_confidence=0.85,
        match_level="strong_match",
        match_rationale="Route decorator contains 'auth'",
        line_start=10,
        line_end=25,
        code_snippet="@router.post('/login')\ndef login(): pass",
        link_hash="hash_link_4",
    )
    db_session.add(link_4)
    db_session.commit()

    return project, snapshot, req_unmatched, req_ambiguous, req_candidate, req_with_tests, req_spec_ambiguous


class Tuple_Fixture:
    pass


def test_unique_finding_hash_and_uniqueness(db_session: Session):
    """Verify that (project_id, finding_hash) unique constraint prevents duplicate findings."""
    project = Project(
        title="Uniqueness Project",
        problem_statement="Test unique hash constraint",
        description="Testing duplicate prevention",
    )
    db_session.add(project)
    db_session.commit()

    finding1 = Finding(
        project_id=project.id,
        snapshot_id=None,
        commit_sha=None,
        finding_type="specification_gap",
        severity="needs_attention",
        title="Unique Finding 1",
        summary="Testing uniqueness",
        why_it_matters="Why this matters for evaluation: Consistency is verified.",
        evidence_references=[],
        technical_details={},
        finding_hash="fixed_test_hash_12345",
    )
    db_session.add(finding1)
    db_session.commit()

    # Attempt to insert identical hash for same project -> should raise IntegrityError
    finding2 = Finding(
        project_id=project.id,
        snapshot_id=None,
        commit_sha=None,
        finding_type="specification_gap",
        severity="needs_attention",
        title="Duplicate Finding",
        summary="Testing uniqueness violation",
        why_it_matters="Why this matters for evaluation: Duplicate constraint check.",
        evidence_references=[],
        technical_details={},
        finding_hash="fixed_test_hash_12345",
    )
    db_session.add(finding2)
    with pytest.raises(sa.exc.IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_deterministic_finding_generation_all_rules(db_session: Session, project_with_full_evidence):
    """Verify deterministic generation of all rules (RULE-01, 02, 03, 04, 06, 08, 09, 10)."""
    project, snapshot, req_unmatched, req_ambiguous, req_candidate, req_with_tests, req_spec_ambiguous = project_with_full_evidence

    # Run diagnosis generation
    diagnosis = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot.id)

    assert diagnosis.project_id == project.id
    assert diagnosis.snapshot_id == snapshot.id
    # RULE-04 (security_omitted on .env) is critical -> status must be 'significant_concern'
    assert diagnosis.status == "significant_concern"
    assert diagnosis.status_label == "Significant Concern"
    assert diagnosis.critical_count == 1
    assert diagnosis.major_count >= 1
    assert diagnosis.needs_attention_count >= 2
    assert diagnosis.improvements_count >= 1
    assert diagnosis.strengths_count >= 3  # RULE-08, RULE-09, RULE-10

    # Query raw findings from DB
    findings = list(db_session.scalars(sa.select(Finding).where(Finding.project_id == project.id)).all())
    finding_hashes = {f.finding_hash: f for f in findings}

    # Verify RULE-01 (Unmatched requirement)
    r1_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_01_UNMATCHED:{req_unmatched.id}".encode("utf-8")).hexdigest()
    assert r1_hash in finding_hashes
    f_r1 = finding_hashes[r1_hash]
    assert f_r1.severity == "major"
    assert f_r1.finding_type == "requirement_gap"
    assert "Requirement without clear implementation evidence" in f_r1.title
    assert "Why this matters for evaluation" in f_r1.why_it_matters
    assert req_unmatched.title in f_r1.summary

    # Verify RULE-02 (Ambiguous implementation)
    r2_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_02_AMBIGUOUS:{req_ambiguous.id}".encode("utf-8")).hexdigest()
    assert r2_hash in finding_hashes
    f_r2 = finding_hashes[r2_hash]
    assert f_r2.severity == "needs_attention"
    assert f_r2.finding_type == "code_organization"
    assert "Multiple competing implementation files" in f_r2.title

    # Verify RULE-03 (Candidate without tests)
    r3_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_03_NO_TESTS:{req_candidate.id}".encode("utf-8")).hexdigest()
    assert r3_hash in finding_hashes
    f_r3 = finding_hashes[r3_hash]
    assert f_r3.severity == "improvement"
    assert f_r3.finding_type == "testing_gap"
    assert "Candidate implementation code found without associated tests" in f_r3.title

    # Verify RULE-04 (Sensitive file security_omitted)
    r4_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_04_SECURITY:.env".encode("utf-8")).hexdigest()
    assert r4_hash in finding_hashes
    f_r4 = finding_hashes[r4_hash]
    assert f_r4.severity == "critical"
    assert f_r4.finding_type == "security_risk"
    assert "Potentially sensitive configuration file" in f_r4.title
    # Verify no secret content is leaked
    assert "contents were omitted from ingestion" in f_r4.summary

    # Verify RULE-06 (Specification conflict/ambiguity - project level)
    r6_hash = hashlib.sha256(f"{project.id}:project:RULE_06_AMBIGUITY:{req_spec_ambiguous.id}".encode("utf-8")).hexdigest()
    assert r6_hash in finding_hashes
    f_r6 = finding_hashes[r6_hash]
    assert f_r6.snapshot_id is None
    assert f_r6.severity == "needs_attention"
    assert "Specification conflict or ambiguity" in f_r6.title
    assert "Proposal specifies WebSocket" in f_r6.summary

    # Verify RULE-08 (Strength: Candidate with tests)
    r8_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_08_STRENGTH_TESTS:{req_with_tests.id}".encode("utf-8")).hexdigest()
    assert r8_hash in finding_hashes
    f_r8 = finding_hashes[r8_hash]
    assert f_r8.severity == "strength"
    assert "Implementation accompanied by candidate test evidence" in f_r8.title

    # Verify RULE-09 (Strength: Automated test suite present)
    r9_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_09_TEST_SUITE_PRESENT:repo".encode("utf-8")).hexdigest()
    assert r9_hash in finding_hashes
    f_r9 = finding_hashes[r9_hash]
    assert f_r9.severity == "strength"
    assert "Automated test suite detected" in f_r9.title

    # Verify RULE-10 (Strength: Documentation present)
    r10_hash = hashlib.sha256(f"{project.id}:{snapshot.id}:RULE_10_DOC_PRESENT:repo".encode("utf-8")).hexdigest()
    assert r10_hash in finding_hashes
    f_r10 = finding_hashes[r10_hash]
    assert f_r10.severity == "strength"
    assert "Standard project documentation detected" in f_r10.title


def test_traceability_gating_prevents_false_findings(db_session: Session):
    """Verify that when a snapshot has NO traceability records, traceability-dependent rules are suppressed."""
    project = Project(
        title="Gating Test Project",
        problem_statement="Test traceability gating",
        description="Verify suppression when traceability not run",
    )
    db_session.add(project)
    db_session.commit()

    req = Requirement(
        project_id=project.id,
        requirement_id="REQ-G1",
        title="Feature Without Traceability Run",
        description="A requirement that has not been evaluated against code yet.",
        category="functional",
        content_hash="hash_g1",
    )
    db_session.add(req)
    db_session.commit()

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/gate-repo",
        owner="student",
        repo_name="gate-repo",
        default_branch="main",
        status="synced",
    )
    db_session.add(repo)
    db_session.commit()

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        branch="main",
        total_files=2,
        total_size_bytes=2048,
        structure_summary={
            "total_files": 2,
            "total_size_bytes": 2048,
            "languages": {"Python": 2},
            "evidence_counts": {"test_suite": 0, "documentation": 0},
        },
        is_current=True,
        status="completed",
    )
    db_session.add(snapshot)
    db_session.commit()

    # NOTE: NO RequirementSnapshotTraceability records created for this snapshot!

    # 1. Check get_diagnosis -> should report status: not_enough_evidence_yet
    diagnosis_read = DiagnosticService.get_diagnosis(db_session, project.id, snapshot_id=snapshot.id)
    assert diagnosis_read.status == "not_enough_evidence_yet"
    assert "Traceability Analysis Pending" in diagnosis_read.status_label

    # 2. Run generate_diagnosis -> should NOT create RULE-01 unmatched findings!
    diagnosis_gen = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot.id)

    findings = list(db_session.scalars(sa.select(Finding).where(Finding.project_id == project.id)).all())
    rule_01_findings = [f for f in findings if f.technical_details.get("rule_code") == "RULE_01_UNMATCHED_REQUIREMENT"]

    # Must be 0: No false 'unmatched' findings created when traceability has not run!
    assert len(rule_01_findings) == 0

    # Non-traceability rules (e.g. RULE-05 no tests, RULE-07 no docs) can execute
    rule_05 = [f for f in findings if f.technical_details.get("rule_code") == "RULE_05_NO_TEST_SUITE"]
    assert len(rule_05) == 1


def test_missing_test_suites_and_documentation_rules(db_session: Session):
    """Verify RULE-05 and RULE-07 trigger when evidence_counts is 0."""
    project = Project(
        title="Empty Repo Project",
        problem_statement="Test missing docs and tests",
        description="Testing RULE-05 and RULE-07",
    )
    db_session.add(project)
    db_session.commit()

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/empty-repo",
        owner="student",
        repo_name="empty-repo",
        default_branch="main",
    )
    db_session.add(repo)
    db_session.commit()

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="cccccccccccccccccccccccccccccccccccccccc",
        branch="main",
        total_files=3,
        total_size_bytes=1000,
        structure_summary={
            "total_files": 3,
            "total_size_bytes": 1000,
            "languages": {"JavaScript": 3},
            "evidence_counts": {"test_suite": 0, "documentation": 0},
        },
        is_current=True,
    )
    db_session.add(snapshot)
    db_session.commit()

    DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot.id)

    findings = list(db_session.scalars(sa.select(Finding).where(Finding.project_id == project.id)).all())
    types = {f.finding_type: f for f in findings}

    assert "testing_gap" in types
    assert types["testing_gap"].severity == "major"
    assert "No automated test suites detected" in types["testing_gap"].title

    assert "documentation_gap" in types
    assert types["documentation_gap"].severity == "improvement"
    assert "Missing project documentation or README" in types["documentation_gap"].title


def test_finding_idempotency_and_snapshot_pinning(db_session: Session, project_with_full_evidence):
    """Verify that re-running diagnosis does not duplicate findings, and older snapshot findings are scoped."""
    project, snapshot1, _, _, _, _, _ = project_with_full_evidence

    # Run 1
    diag1 = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot1.id)
    count1 = db_session.scalar(sa.select(sa.func.count(Finding.id)).where(Finding.project_id == project.id))

    # Run 2 (idempotent re-run)
    diag2 = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot1.id)
    count2 = db_session.scalar(sa.select(sa.func.count(Finding.id)).where(Finding.project_id == project.id))

    assert count1 == count2  # No duplicates created!

    # Create snapshot 2
    repo = db_session.scalars(sa.select(GitHubRepository).where(GitHubRepository.project_id == project.id)).first()
    snapshot1.is_current = False
    snapshot2 = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="2222222222222222222222222222222222222222",
        branch="main",
        total_files=10,
        total_size_bytes=20000,
        structure_summary={
            "total_files": 10,
            "total_size_bytes": 20000,
            "languages": {"Python": 10},
            "evidence_counts": {"test_suite": 2, "documentation": 1},
        },
        is_current=True,
    )
    db_session.add(snapshot2)
    db_session.commit()

    # Querying diagnosis for snapshot2 before generating findings should return not_analyzed / pending
    diag_s2 = DiagnosticService.get_diagnosis(db_session, project.id, snapshot_id=snapshot2.id)
    assert diag_s2.snapshot_id == snapshot2.id
    assert diag_s2.commit_sha == snapshot2.commit_sha
    # Findings from snapshot1 should NOT leak into snapshot2 diagnosis
    for f in diag_s2.top_findings:
        assert f.snapshot_id != snapshot1.id


def test_canonical_evidence_hydration(db_session: Session, project_with_full_evidence):
    """Verify that get_finding_detail hydrates specification and traceability links from canonical tables."""
    project, snapshot, _, _, _, req_with_tests, _ = project_with_full_evidence

    DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot.id)

    # Find the RULE_08 strength finding
    f_stmt = sa.select(Finding).where(
        Finding.project_id == project.id,
        Finding.finding_type == "strength",
        Finding.severity == "strength",
    )
    strength_finding = db_session.scalars(f_stmt).first()
    assert strength_finding is not None

    detail = DiagnosticService.get_finding_detail(db_session, project.id, strength_finding.id)
    assert detail.id == strength_finding.id
    assert len(detail.hydrated_evidence) > 0

    # Verify hydrated items have data from canonical tables
    req_item = next(item for item in detail.hydrated_evidence if item.target_type == "requirement")
    assert req_item.target_id == req_with_tests.id
    assert "User Authentication" in (req_item.title or "")
    assert req_item.page_number == 4

    trace_item = next(item for item in detail.hydrated_evidence if item.target_type == "traceability")
    assert "app/auth.py" in (trace_item.file_path or "")
    assert "@router.post" in (trace_item.snippet or "")


def test_project_isolation(db_session: Session, project_with_full_evidence):
    """Verify that queries for Project A never return findings belonging to Project B."""
    project_a, snapshot_a, _, _, _, _, _ = project_with_full_evidence
    DiagnosticService.generate_diagnosis(db_session, project_a.id, snapshot_id=snapshot_a.id)

    # Create Project B
    project_b = Project(
        title="Project B",
        problem_statement="Isolation test",
        description="Verify findings are never leaked",
    )
    db_session.add(project_b)
    db_session.commit()

    # Diagnosis for Project B should have 0 findings
    diag_b = DiagnosticService.get_diagnosis(db_session, project_b.id)
    assert diag_b.total_findings == 0
    assert len(diag_b.top_findings) == 0

    # Attempting to fetch Project A's finding using Project B's ID must raise ValueError
    finding_a = db_session.scalars(sa.select(Finding).where(Finding.project_id == project_a.id)).first()
    with pytest.raises(ValueError, match="not found for project"):
        DiagnosticService.get_finding_detail(db_session, project_b.id, finding_a.id)


def test_exact_rule_contract_mapping_and_severities(db_session: Session, project_with_full_evidence):
    """Explicitly verify the exact rule contract (RULE-01 through RULE-10) and approved severity taxonomy."""
    project, snapshot, req_unmatched, req_ambiguous, req_candidate, req_with_tests, req_spec_ambiguous = project_with_full_evidence

    # Run diagnosis generation
    diagnosis = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot.id)

    findings = list(db_session.scalars(sa.select(Finding).where(Finding.project_id == project.id)).all())
    rules_by_code = {f.technical_details.get("rule_code"): f for f in findings}

    # Verify approved CP7 severity vocabulary
    approved_severities = {"critical", "major", "needs_attention", "improvement", "strength"}
    disallowed_severities = {"high", "medium", "low", "positive"}

    for f in findings:
        assert f.severity in approved_severities, f"Finding '{f.title}' has non-approved severity '{f.severity}'"
        assert f.severity not in disallowed_severities, f"Finding '{f.title}' has disallowed legacy severity '{f.severity}'"
        if f.severity != "strength":
            assert f.finding_type != f.severity, f"finding_type '{f.finding_type}' should not be used as severity substitute"
            assert f.finding_type in {"requirement_gap", "code_organization", "testing_gap", "security_risk", "specification_gap", "documentation_gap"}

    # RULE-01: Requirement without implementation evidence
    # Source: RequirementSnapshotTraceability.status == "unmatched"
    assert "RULE_01_UNMATCHED_REQUIREMENT" in rules_by_code
    f1 = rules_by_code["RULE_01_UNMATCHED_REQUIREMENT"]
    assert f1.severity == "major"
    assert f1.finding_type == "requirement_gap"
    assert "Requirement without clear implementation evidence" in f1.title
    assert "Why this matters for evaluation:" in f1.why_it_matters
    assert f1.suggested_action is not None and len(f1.suggested_action) > 0

    # RULE-02: Ambiguous implementation candidates
    # Source: RequirementSnapshotTraceability.status == "ambiguous"
    assert "RULE_02_AMBIGUOUS_CANDIDATES" in rules_by_code
    f2 = rules_by_code["RULE_02_AMBIGUOUS_CANDIDATES"]
    assert f2.severity == "needs_attention"
    assert f2.finding_type == "code_organization"
    assert "Multiple competing implementation files found for requirement" in f2.title
    assert "Why this matters for evaluation:" in f2.why_it_matters

    # RULE-03: Candidate implementation without associated test evidence
    # Source: RequirementSnapshotTraceability.status == "candidate"
    assert "RULE_03_IMPL_WITHOUT_TESTS" in rules_by_code
    f3 = rules_by_code["RULE_03_IMPL_WITHOUT_TESTS"]
    assert f3.severity == "improvement"
    assert f3.finding_type == "testing_gap"
    assert "Candidate implementation code found without associated tests" in f3.title
    assert "Why this matters for evaluation:" in f3.why_it_matters

    # RULE-04: Potentially sensitive file detected
    # Source: RepositoryFile.content_status == "security_omitted"
    assert "RULE_04_SECURITY_OMITTED" in rules_by_code
    f4 = rules_by_code["RULE_04_SECURITY_OMITTED"]
    assert f4.severity == "critical"
    assert f4.finding_type == "security_risk"
    assert f4.title == "Potentially sensitive configuration file detected in repository"
    assert f4.summary.startswith("A potentially sensitive configuration file was detected in the repository")
    assert "Why this matters for evaluation:" in f4.why_it_matters
    # Confirm secret content is never present in any field
    assert "password" not in f4.summary.lower()
    assert "secret" not in f4.summary.lower() or "secrets" in f4.suggested_action.lower()

    # RULE-06: Specification conflict or ambiguity
    # Source: Requirement.is_ambiguous == True OR Requirement.conflict_summary != None
    assert "RULE_06_SPEC_AMBIGUITY" in rules_by_code
    f6 = rules_by_code["RULE_06_SPEC_AMBIGUITY"]
    assert f6.severity == "needs_attention"
    assert f6.finding_type == "specification_gap"
    assert f6.snapshot_id is None  # Must be project-level
    assert "Specification conflict or ambiguity detected in project documentation" in f6.title
    assert "Why this matters for evaluation:" in f6.why_it_matters

    # RULE-08: Strength: implementation accompanied by candidate test evidence
    # Source: RequirementSnapshotTraceability.status == "candidate_with_tests"
    assert "RULE_08_IMPL_WITH_TESTS" in rules_by_code
    f8 = rules_by_code["RULE_08_IMPL_WITH_TESTS"]
    assert f8.severity == "strength"
    assert f8.finding_type == "strength"
    assert "Implementation accompanied by candidate test evidence" in f8.title
    assert "Why this matters for evaluation:" in f8.why_it_matters

    # RULE-09: Strength: automated test suite present
    # Source: snapshot.structure_summary["evidence_counts"]["test_suite"] > 0
    assert "RULE_09_TEST_SUITE_PRESENT" in rules_by_code
    f9 = rules_by_code["RULE_09_TEST_SUITE_PRESENT"]
    assert f9.severity == "strength"
    assert f9.finding_type == "strength"
    assert f9.title == "Automated test suite detected in repository"
    assert "Why this matters for evaluation:" in f9.why_it_matters

    # RULE-10: Strength: standard project documentation present
    # Source: snapshot.structure_summary["evidence_counts"]["documentation"] > 0
    assert "RULE_10_DOCUMENTATION_PRESENT" in rules_by_code
    f10 = rules_by_code["RULE_10_DOCUMENTATION_PRESENT"]
    assert f10.severity == "strength"
    assert f10.finding_type == "strength"
    assert f10.title == "Standard project documentation detected in repository"
    assert "Why this matters for evaluation:" in f10.why_it_matters


def test_rule_05_and_rule_07_contract(db_session: Session):
    """Explicitly verify RULE-05 (no test suites) and RULE-07 (missing docs and no README)."""
    project = Project(
        title="Rule 05 and 07 Test",
        problem_statement="Verify zero test and zero doc rules",
        description="Explicit contract verification",
    )
    db_session.add(project)
    db_session.commit()

    repo = GitHubRepository(
        project_id=project.id,
        repo_url="https://github.com/student/contract-test-repo",
        owner="student",
        repo_name="contract-test-repo",
        default_branch="main",
    )
    db_session.add(repo)
    db_session.commit()

    snapshot = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        branch="main",
        total_files=2,
        total_size_bytes=500,
        structure_summary={
            "total_files": 2,
            "total_size_bytes": 500,
            "languages": {"Python": 2},
            "evidence_counts": {"test_suite": 0, "documentation": 0},
        },
        is_current=True,
    )
    db_session.add(snapshot)
    db_session.commit()

    # Add code files (no test files, no readme)
    f1 = RepositoryFile(
        snapshot_id=snapshot.id,
        project_id=project.id,
        file_path="main.py",
        file_name="main.py",
        file_extension=".py",
        language="Python",
        blob_sha="blob_main",
        content_status="indexed_metadata_only",
    )
    db_session.add(f1)
    db_session.commit()

    DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot.id)

    findings = list(db_session.scalars(sa.select(Finding).where(Finding.project_id == project.id)).all())
    rules_by_code = {f.technical_details.get("rule_code"): f for f in findings}

    # RULE-05: Repository lacks automated test suites
    # Source: snapshot.structure_summary["evidence_counts"]["test_suite"] == 0
    assert "RULE_05_NO_TEST_SUITE" in rules_by_code
    f5 = rules_by_code["RULE_05_NO_TEST_SUITE"]
    assert f5.severity == "major"
    assert f5.finding_type == "testing_gap"
    assert f5.title == "No automated test suites detected in repository"
    assert "Without automated tests, software quality" in f5.why_it_matters

    # RULE-07: Missing repository documentation
    # Source: snapshot.structure_summary["evidence_counts"]["documentation"] == 0 and no README
    assert "RULE_07_NO_DOCUMENTATION" in rules_by_code
    f7 = rules_by_code["RULE_07_NO_DOCUMENTATION"]
    assert f7.severity == "improvement"
    assert f7.finding_type == "documentation_gap"
    assert f7.title == "Missing project documentation or README in repository"
    assert "Why this matters for evaluation:" in f7.why_it_matters


def test_snapshot_a_and_b_scoping_and_historical_preservation(db_session: Session, project_with_full_evidence):
    """Verify that Snapshot A findings are preserved when Snapshot B is analyzed,

    and active diagnosis only returns active snapshot findings + project-level findings.
    """
    project, snapshot_a, _, _, _, _, req_spec_ambiguous = project_with_full_evidence

    # 1. Generate findings for Snapshot A
    diag_a = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot_a.id)
    snapshot_a_findings = list(db_session.scalars(
        sa.select(Finding).where(Finding.project_id == project.id, Finding.snapshot_id == snapshot_a.id)
    ).all())
    count_a = len(snapshot_a_findings)
    assert count_a > 0

    # 2. Create Snapshot B with new commit and different characteristics
    repo = db_session.scalars(sa.select(GitHubRepository).where(GitHubRepository.project_id == project.id)).first()
    snapshot_a.is_current = False
    snapshot_b = RepositorySnapshot(
        repository_id=repo.id,
        project_id=project.id,
        commit_sha="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        branch="main",
        total_files=4,
        total_size_bytes=8000,
        structure_summary={
            "total_files": 4,
            "total_size_bytes": 8000,
            "languages": {"Python": 4},
            "evidence_counts": {"test_suite": 2, "documentation": 2},
        },
        is_current=True,
    )
    db_session.add(snapshot_b)
    db_session.commit()

    # Add traceability for Snapshot B
    req1 = db_session.scalars(sa.select(Requirement).where(Requirement.project_id == project.id)).first()
    trace_b = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req1.id,
        snapshot_id=snapshot_b.id,
        commit_sha=snapshot_b.commit_sha,
        status="candidate_with_tests",
        implementation_count=1,
        test_count=1,
    )
    db_session.add(trace_b)
    db_session.commit()

    # 3. Generate diagnosis for Snapshot B
    diag_b = DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot_b.id)

    # 4. Confirm: Snapshot A findings were NOT deleted merely because Snapshot B was analyzed!
    snapshot_a_findings_after = list(db_session.scalars(
        sa.select(Finding).where(Finding.project_id == project.id, Finding.snapshot_id == snapshot_a.id)
    ).all())
    assert len(snapshot_a_findings_after) == count_a, "Historical Snapshot A findings must NOT be deleted"

    # 5. Confirm: Current diagnosis for Snapshot B returns active snapshot findings + project-level findings ONLY
    diag_b_read = DiagnosticService.get_diagnosis(db_session, project.id, snapshot_id=snapshot_b.id)
    for f in diag_b_read.top_findings + diag_b_read.strengths:
        assert f.snapshot_id != snapshot_a.id, f"Snapshot A finding '{f.title}' leaked into Snapshot B diagnosis"
        assert f.snapshot_id == snapshot_b.id or f.snapshot_id is None

    # 6. Confirm: Repeated generation against Snapshot B does not duplicate findings
    total_findings_before = db_session.scalar(sa.select(sa.func.count(Finding.id)).where(Finding.project_id == project.id))
    DiagnosticService.generate_diagnosis(db_session, project.id, snapshot_id=snapshot_b.id)
    total_findings_after = db_session.scalar(sa.select(sa.func.count(Finding.id)).where(Finding.project_id == project.id))
    assert total_findings_before == total_findings_after, "Repeated generation must be strictly idempotent"

