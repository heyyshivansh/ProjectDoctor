import hashlib
import uuid
from datetime import datetime, timezone
import pytest
import sqlalchemy as sa

from app.models.project import Project
from app.models.requirement import Requirement
from app.models.finding import Finding
from app.models.ai_analysis import AIAnalysis
from app.services.ai.service import AIAnalysisService
from app.services.ai.mock_provider import MockAIProvider
from app.services.analysis.citation_validator import CitationIntegrityError


@pytest.fixture
def test_project_with_evidence(db_session):
    project = Project(
        title="AI Analysis Test Project",
        problem_statement="Automated verification of student capstones.",
        description="Comprehensive evaluation engine using static facts and AI reasoning.",
        tech_stack=["Python", "FastAPI"],
        architecture_summary="Modular monolithic architecture.",
        status="created",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # Add a requirement
    req = Requirement(
        project_id=project.id,
        requirement_id="REQ-001",
        title="Automated Test Execution",
        description="The system must execute unit tests automatically.",
        category="functional",
        content_hash=hashlib.sha256(b"REQ-001 content").hexdigest(),
    )
    db_session.add(req)

    # Add a CP7 Finding
    f_hash = hashlib.sha256(f"{project.id}:test_rule".encode("utf-8")).hexdigest()
    finding = Finding(
        project_id=project.id,
        finding_type="testing_gap",
        severity="major",
        title="No automated test suite detected",
        summary="Repository does not contain test suites.",
        why_it_matters="Quality cannot be verified.",
        suggested_action="Add tests.",
        finding_hash=f_hash,
    )
    db_session.add(finding)
    db_session.commit()
    db_session.refresh(project)

    return project


def test_insufficient_evidence_project(db_session):
    empty_project = Project(
        title="Empty Project",
        problem_statement="None",
        description="None",
    )
    db_session.add(empty_project)
    db_session.commit()

    provider = MockAIProvider()
    resp, was_cached = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=empty_project.id,
        provider=provider,
    )

    assert resp.status == "not_enough_evidence_yet"
    assert was_cached is False
    assert provider.call_count == 0


def test_ai_analysis_generation_and_caching(db_session, test_project_with_evidence):
    project = test_project_with_evidence
    provider = MockAIProvider()

    # 1. Initial generation -> should call provider and cache
    resp1, was_cached1 = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=project.id,
        provider=provider,
        prompt_version="cp8-v1.0",
    )
    assert resp1.status == "completed"
    assert was_cached1 is False
    assert provider.call_count == 1
    assert resp1.id is not None
    assert resp1.result is not None

    # 2. Second generation with force=False -> should be a CACHE HIT (0 provider calls)
    resp2, was_cached2 = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=project.id,
        provider=provider,
        force=False,
        prompt_version="cp8-v1.0",
    )
    assert resp2.status == "completed"
    assert was_cached2 is True
    assert provider.call_count == 1  # Still 1! Provider was not called
    assert resp2.id == resp1.id

    # 3. Third generation with force=True -> should bypass cache
    resp3, was_cached3 = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=project.id,
        provider=provider,
        force=True,
        prompt_version="cp8-v1.0",
    )
    assert resp3.status == "completed"
    assert was_cached3 is False
    assert provider.call_count == 2  # Provider was called again
    assert resp3.id != resp1.id


def test_prompt_version_cache_invalidation(db_session, test_project_with_evidence):
    project = test_project_with_evidence
    provider = MockAIProvider()

    # 1. Generation with v1.0
    resp1, was_cached1 = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=project.id,
        provider=provider,
        prompt_version="cp8-v1.0",
    )
    assert was_cached1 is False
    assert provider.call_count == 1

    # 2. Generation with bumped prompt version "cp8-v1.1" -> cache miss
    resp2, was_cached2 = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=project.id,
        provider=provider,
        force=False,
        prompt_version="cp8-v1.1",
    )
    assert was_cached2 is False
    assert provider.call_count == 2


def test_cp7_findings_immutability(db_session, test_project_with_evidence):
    """Verify that generating an AI analysis NEVER mutates, updates, or deletes CP7 findings."""
    project = test_project_with_evidence

    # Snapshot CP7 findings before AI generation
    findings_before = list(
        db_session.scalars(
            sa.select(Finding).where(Finding.project_id == project.id)
        ).all()
    )
    assert len(findings_before) == 1
    f_orig = findings_before[0]
    orig_id = f_orig.id
    orig_hash = f_orig.finding_hash
    orig_severity = f_orig.severity
    orig_title = f_orig.title
    orig_summary = f_orig.summary
    orig_updated_at = f_orig.updated_at

    # Run AI generation
    provider = MockAIProvider()
    resp, _ = AIAnalysisService.generate_analysis(
        db=db_session,
        project_id=project.id,
        provider=provider,
    )
    assert resp.status == "completed"

    # Snapshot CP7 findings after AI generation
    findings_after = list(
        db_session.scalars(
            sa.select(Finding).where(Finding.project_id == project.id)
        ).all()
    )
    assert len(findings_after) == 1
    f_after = findings_after[0]

    # Verify 100% identical
    assert f_after.id == orig_id
    assert f_after.finding_hash == orig_hash
    assert f_after.severity == orig_severity
    assert f_after.title == orig_title
    assert f_after.summary == orig_summary
    assert f_after.updated_at == orig_updated_at


def test_citation_integrity_failure_rolls_back(db_session, test_project_with_evidence):
    """Verify that hallucinated citations fail safely without persisting anything."""
    project = test_project_with_evidence
    failing_provider = MockAIProvider(should_fail_citation=True)

    analyses_count_before = db_session.scalar(
        sa.select(sa.func.count(AIAnalysis.id)).where(AIAnalysis.project_id == project.id)
    )

    with pytest.raises(CitationIntegrityError):
        AIAnalysisService.generate_analysis(
            db=db_session,
            project_id=project.id,
            provider=failing_provider,
        )

    # Verify no record was persisted
    analyses_count_after = db_session.scalar(
        sa.select(sa.func.count(AIAnalysis.id)).where(AIAnalysis.project_id == project.id)
    )
    assert analyses_count_after == analyses_count_before
