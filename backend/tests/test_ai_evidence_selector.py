"""
Tests for AIEvidenceSelector context budgeting, token estimation, and citation safety boundaries.
"""

import json
import uuid
import pytest
import httpx

from app.schemas.ai_evidence import (
    AIEvidencePackage,
    AIEvidenceRequirementItem,
    AIEvidenceFindingItem,
    AIEvidenceArtifactItem,
    AIEvidenceFileItem,
    AIEvidenceTraceabilityItem,
)
from app.schemas.ai_analysis import (
    AIAnalysisResult,
    ProjectUnderstandingAssessment,
    AIObservation,
    AIEvidenceCitation,
    AICrossArtifactCorrelation,
    AIContradiction,
    AIEvidenceGap,
    AIDiagnosticInterpretation,
)
from app.services.analysis.ai_evidence_selector import (
    AIEvidenceSelector,
    estimate_prompt_tokens,
    CHARS_PER_TOKEN_ESTIMATE,
)
from app.services.analysis.citation_validator import CitationValidator, CitationIntegrityError
from app.services.ai.groq_client import GroqProvider
from app.services.ai.base import AIAnalysisGenerationError


def _make_dummy_package(
    num_findings: int = 5,
    num_requirements: int = 5,
    num_files: int = 10,
    snippet_length: int = 200,
) -> AIEvidencePackage:
    """Create a synthetic AIEvidencePackage with configurable entity counts."""
    proj_id = uuid.uuid4()
    snap_id = uuid.uuid4()

    artifacts = [
        AIEvidenceArtifactItem(
            id=uuid.uuid4(),
            filename="SRS_Document.pdf",
            artifact_type="requirement_doc",
        )
    ]

    findings = []
    severities = ["critical", "high", "medium", "low", "info"]
    for i in range(num_findings):
        fid = uuid.uuid4()
        fhash = f"hash_{i}_{fid.hex[:8]}"
        sev = severities[i % len(severities)]
        findings.append(
            AIEvidenceFindingItem(
                finding_id=fid,
                finding_hash=fhash,
                finding_type="security_or_architecture",
                severity=sev,
                title=f"Diagnostic Finding {i} ({sev})",
                summary=f"Summary of deterministic finding {i} detailing structural gap.",
                why_it_matters=f"Detailed justification of why finding {i} matters for engineering.",
                suggested_action=f"Remediation step for finding {i}.",
                evidence_references=[{"file_path": f"src/module_{i}.py", "line": 10 + i}],
            )
        )

    requirements = []
    for i in range(num_requirements):
        rid = uuid.uuid4()
        requirements.append(
            AIEvidenceRequirementItem(
                id=rid,
                requirement_id=f"REQ-{i+1:03d}",
                title=f"Functional Requirement {i+1}",
                category="core",
                is_ambiguous=(i % 3 == 0),
                conflict_summary=None,
                traceability_status="unmatched" if i % 2 == 0 else "candidate",
                implementation_count=0 if i % 2 == 0 else 1,
                test_count=0,
                candidate_files=[f"src/module_{i}.py"],
            )
        )

    indexed_files = []
    for i in range(num_files):
        fid = uuid.uuid4()
        indexed_files.append(
            {
                "id": str(fid),
                "file_path": f"src/module_{i}.py",
                "evidence_type": "source_code",
            }
        )

    trace_items = []
    snippets = []
    for i in range(min(num_requirements, num_findings)):
        tid = uuid.uuid4()
        trace_items.append(
            {
                "id": str(tid),
                "requirement_id": f"REQ-{i+1:03d}",
                "status": "candidate",
                "implementation_count": 1,
                "test_count": 0,
                "candidate_files": [f"src/module_{i}.py"],
            }
        )
        snippets.append(
            {
                "traceability_id": str(tid),
                "file_path": f"src/module_{i}.py",
                "line_start": 1,
                "line_end": 20,
                "snippet": ("def process(): pass # " + "x" * snippet_length)[:snippet_length],
                "evidence_type": "implementation",
                "match_confidence": 0.95,
            }
        )

    repo_summary = {
        "snapshot_id": str(snap_id),
        "commit_sha": "abcdef1234567890",
        "branch": "main",
        "total_files": num_files,
        "total_size_bytes": 100000,
        "evidence_counts": {"files": num_files},
        "manifests": ["package.json"],
        "entrypoints": ["src/main.py"],
        "directory_tree": [f"src/module_{i}.py" for i in range(min(num_files, 10))],
        "sensitive_files_omitted_count": 0,
        "sensitive_file_paths": [],
        "all_indexed_files": indexed_files,
    }

    trace_summary = {
        "total_records": len(trace_items),
        "matched_count": len(trace_items),
        "unmatched_count": 0,
        "ambiguous_count": 0,
        "items": trace_items,
        "candidate_snippets": snippets,
    }

    return AIEvidencePackage(
        project_id=proj_id,
        project_title="Test Synthetic Project",
        snapshot_id=snap_id,
        commit_sha="abcdef1234567890",
        project_context={
            "title": "Test Synthetic Project",
            "problem_statement": "A synthetic problem statement for testing context budgeting.",
            "description": "Synthetic project description.",
            "tech_stack": ["Python", "FastAPI"],
            "architecture_summary": "Modular monolith.",
            "declared_requirements": "Basic authentication and data storage.",
        },
        document_understanding={
            "problem": "Synthetic problem.",
            "target_users": ["Students", "Professors"],
            "objectives": ["Test budgeting"],
            "requirements_summary": "Summary of requirements.",
            "modules": ["Backend", "Frontend"],
            "tech_stack": ["Python"],
        },
        artifacts=artifacts,
        requirements=requirements,
        repository_summary=repo_summary,
        traceability_summary=trace_summary,
        diagnostic_findings=findings,
        evidence_counts={},
    )


def test_small_evidence_package_untouched():
    """Small evidence packages well within the budget should be returned completely unmodified."""
    small_pkg = _make_dummy_package(num_findings=2, num_requirements=2, num_files=3)
    est = estimate_prompt_tokens(small_pkg)
    assert est < 4500

    bounded = AIEvidenceSelector.select_bounded_evidence(small_pkg, max_input_tokens=4500)
    # Fast path returns the exact same object reference
    assert bounded is small_pkg
    assert len(bounded.diagnostic_findings) == 2
    assert len(bounded.requirements) == 2


def test_large_package_bounded_within_configured_budget():
    """A large package with extensive findings, requirements, and snippets must be bounded within the budget."""
    large_pkg = _make_dummy_package(
        num_findings=25,
        num_requirements=20,
        num_files=50,
        snippet_length=300,
    )
    unbounded_estimate = estimate_prompt_tokens(large_pkg)
    assert unbounded_estimate > 4500

    bounded = AIEvidenceSelector.select_bounded_evidence(large_pkg, max_input_tokens=4500)
    bounded_estimate = estimate_prompt_tokens(bounded)

    assert bounded_estimate <= 4500
    assert bounded is not large_pkg  # New bounded copy was constructed
    # Canonical package must be completely unmodified
    assert len(large_pkg.diagnostic_findings) == 25
    assert len(large_pkg.requirements) == 20


def test_mandatory_context_preserved():
    """Project context, documents/artifacts, and base repository metadata must always be preserved."""
    pkg = _make_dummy_package(num_findings=30, num_requirements=30, num_files=60)
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=2500)

    # Core context preserved
    assert bounded.project_id == pkg.project_id
    assert bounded.project_title == pkg.project_title
    assert bounded.commit_sha == pkg.commit_sha
    assert bounded.project_context["title"] == pkg.project_context["title"]
    assert len(bounded.artifacts) == len(pkg.artifacts)
    assert bounded.repository_summary["branch"] == "main"
    assert bounded.repository_summary["manifests"] == ["package.json"]


def test_priority_evidence_retention_and_pruning():
    """High-severity findings (critical/high) must be retained before lower severity findings."""
    pkg = _make_dummy_package(num_findings=15, num_requirements=15, num_files=20)
    # Find critical and info findings
    critical_findings = [f for f in pkg.diagnostic_findings if f.severity == "critical"]
    info_findings = [f for f in pkg.diagnostic_findings if f.severity == "info"]

    assert len(critical_findings) > 0
    assert len(info_findings) > 0

    # Select with conservative budget that accommodates critical findings but forces pruning of low-priority ones
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3800)

    retained_finding_ids = {f.finding_id for f in bounded.diagnostic_findings}
    # Critical findings should all be retained
    for cf in critical_findings:
        assert cf.finding_id in retained_finding_ids

    # Info findings should be pruned under tight budget
    retained_severities = {f.severity for f in bounded.diagnostic_findings}
    assert "critical" in retained_severities
    assert "info" not in retained_severities


def test_citation_validator_passes_for_retained_evidence():
    """Citations pointing to entities present in bounded_evidence must pass validation."""
    pkg = _make_dummy_package(num_findings=10, num_requirements=10, num_files=20)
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3500)

    retained_req = bounded.requirements[0]
    retained_finding = bounded.diagnostic_findings[0]

    valid_result = AIAnalysisResult(
        analysis_summary="Technical synthesis grounded in bounded evidence.",
        project_understanding=ProjectUnderstandingAssessment(
            summary="Project summary.",
            primary_purpose="Testing.",
            target_users_identified=["Students"],
            key_capabilities_claimed=["Analysis"],
            evidence_basis="Evidence basis.",
            confidence="high",
        ),
        observations=[
            AIObservation(
                observation_type="fact",
                category="specification",
                title="Observed Requirement",
                statement="Requirement is documented.",
                technical_rationale="Specification clarity.",
                evidence_citations=[
                    AIEvidenceCitation(
                        target_type="requirement",
                        target_id=retained_req.id,
                        identifier=retained_req.requirement_id,
                        detail="Documented requirement.",
                    )
                ],
                confidence="high",
            )
        ],
        cross_artifact_correlations=[],
        contradictions=[],
        evidence_gaps=[],
        diagnostic_interpretations=[
            AIDiagnosticInterpretation(
                finding_id=retained_finding.finding_id,
                finding_title=retained_finding.title,
                project_context_impact="High context impact.",
                uncertainty_note=None,
            )
        ],
        uncertainty_notes=[],
    )

    # Validating against bounded_evidence MUST pass without error
    CitationValidator.validate_citation_integrity(valid_result, bounded)


def test_citation_validator_rejects_pruned_evidence():
    """Citations pointing to entities pruned from bounded_evidence must be strictly rejected."""
    pkg = _make_dummy_package(num_findings=20, num_requirements=20, num_files=30)
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3500)

    # Identify a finding that was in the canonical package but pruned from the bounded package
    retained_finding_ids = {f.finding_id for f in bounded.diagnostic_findings}
    pruned_findings = [f for f in pkg.diagnostic_findings if f.finding_id not in retained_finding_ids]
    assert len(pruned_findings) > 0
    pruned_finding = pruned_findings[0]

    assert len(bounded.requirements) > 0
    retained_req = bounded.requirements[0]

    # Result attempting to cite the pruned finding in diagnostic_interpretations
    invalid_result = AIAnalysisResult(
        analysis_summary="Analysis trying to cite pruned finding.",
        project_understanding=ProjectUnderstandingAssessment(
            summary="Project summary.",
            primary_purpose="Testing.",
            target_users_identified=["Students"],
            key_capabilities_claimed=["Analysis"],
            evidence_basis="Evidence basis.",
            confidence="high",
        ),
        observations=[
            AIObservation(
                observation_type="fact",
                category="specification",
                title="Valid observation",
                statement="Statement.",
                technical_rationale="Rationale.",
                evidence_citations=[
                    AIEvidenceCitation(
                        target_type="requirement",
                        target_id=retained_req.id,
                        identifier=retained_req.requirement_id,
                        detail="Valid.",
                    )
                ],
                confidence="high",
            )
        ],
        cross_artifact_correlations=[],
        contradictions=[],
        evidence_gaps=[],
        diagnostic_interpretations=[
            AIDiagnosticInterpretation(
                finding_id=pruned_finding.finding_id,
                finding_title=pruned_finding.title,
                project_context_impact="Attempting to interpret pruned finding.",
                uncertainty_note=None,
            )
        ],
        uncertainty_notes=[],
    )

    with pytest.raises(CitationIntegrityError) as exc_info:
        CitationValidator.validate_citation_integrity(invalid_result, bounded)
    assert str(pruned_finding.finding_id) in str(exc_info.value)


def test_groq_payload_includes_max_output_tokens():
    """Verify that GroqProvider includes max_tokens in the completion payload."""
    recorded_requests = []

    def mock_transport(request: httpx.Request):
        recorded_requests.append(json.loads(request.content.decode("utf-8")))
        return httpx.Response(
            200,
            json={
                "model": "openai/gpt-oss-120b",
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "analysis_summary": "Test summary",
                                    "project_understanding": {
                                        "summary": "Sum",
                                        "primary_purpose": "Purp",
                                        "target_users_identified": ["Users"],
                                        "key_capabilities_claimed": ["Caps"],
                                        "evidence_basis": "Basis",
                                        "confidence": "high",
                                    },
                                    "observations": [],
                                    "cross_artifact_correlations": [],
                                    "contradictions": [],
                                    "evidence_gaps": [],
                                    "diagnostic_interpretations": [],
                                    "uncertainty_notes": [],
                                }
                            )
                        },
                        "finish_reason": "stop",
                    }
                ],
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(mock_transport))
    provider = GroqProvider(
        api_key="mock_groq_key",
        max_output_tokens=1500,
        http_client=client,
    )

    dummy_pkg = _make_dummy_package(num_findings=1, num_requirements=1, num_files=1)
    provider.analyze_project(dummy_pkg)

    assert len(recorded_requests) == 1
    sent_payload = recorded_requests[0]
    assert sent_payload.get("max_tokens") == 1500


def test_groq_truncation_detection_reports_length_finish_reason():
    """Verify that GroqProvider includes truncation context if finish_reason is length and JSON is broken."""
    def mock_transport(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "model": "openai/gpt-oss-120b",
                "choices": [
                    {
                        # Incomplete JSON cut off mid-stream
                        "message": {
                            "content": '{"analysis_summary": "Incomplete json due to token limit...'
                        },
                        "finish_reason": "length",
                    }
                ],
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(mock_transport))
    provider = GroqProvider(
        api_key="mock_groq_key",
        max_output_tokens=1500,
        http_client=client,
    )

    dummy_pkg = _make_dummy_package(num_findings=1, num_requirements=1, num_files=1)
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(dummy_pkg)

    err_text = str(exc_info.value)
    assert "finish_reason='length'" in err_text
    assert "1500 tokens" in err_text
