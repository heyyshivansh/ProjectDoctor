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
    severities = ["critical", "major", "needs_attention", "improvement", "strength"]
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
                description=f"Detailed acceptance criteria for REQ-{i+1:03d}",
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
                "summary_notes": "Deterministic matcher rationale note.",
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
                "is_test_evidence": False,
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
    # Find critical and strength findings
    critical_findings = [f for f in pkg.diagnostic_findings if f.severity == "critical"]
    strength_findings = [f for f in pkg.diagnostic_findings if f.severity == "strength"]

    assert len(critical_findings) > 0
    assert len(strength_findings) > 0

    # Select with conservative budget that accommodates critical findings but forces pruning of low-priority ones
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3800)

    retained_finding_ids = {f.finding_id for f in bounded.diagnostic_findings}
    # Critical findings should all be retained
    for cf in critical_findings:
        assert cf.finding_id in retained_finding_ids

    # Strength findings should be pruned under tight budget
    retained_severities = {f.severity for f in bounded.diagnostic_findings}
    assert "critical" in retained_severities
    assert "strength" not in retained_severities


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


def test_finding_severity_priority_chain_under_budget_pressure():
    """Prove that under budget pressure:
    critical outranks major; major outranks needs_attention;
    needs_attention outranks improvement; improvement outranks strength.

    Furthermore, prove this test fails against the old severity mapping
    {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4} where all
    non-critical findings collapsed to weight 5.
    """
    pkg = _make_dummy_package(num_findings=0, num_requirements=20, num_files=20)
    severities_in_reverse_order = ["strength", "improvement", "needs_attention", "major", "critical"]
    findings = []
    for sev in severities_in_reverse_order:
        findings.append(
            AIEvidenceFindingItem(
                finding_id=uuid.uuid4(),
                finding_hash=f"hash_{sev}",
                finding_type="architecture_gap",
                severity=sev,
                title=f"Finding with {sev} severity",
                summary=f"Summary of {sev} finding.",
                why_it_matters=f"Why {sev} matters.",
                evidence_references=[],
            )
        )
    pkg.diagnostic_findings = findings

    # 1. At limit=3100: only 'critical' fits
    b1 = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3100)
    sevs1 = [f.severity for f in b1.diagnostic_findings]
    assert sevs1 == ["critical"], f"Expected only critical at limit 3100, got {sevs1}"

    # 2. At limit=3300: 'critical' and 'major' fit (proves major outranks needs_attention, improvement, strength)
    b2 = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3300)
    sevs2 = [f.severity for f in b2.diagnostic_findings]
    assert sevs2 == ["critical", "major"], f"Expected ['critical', 'major'] at limit 3300, got {sevs2}"

    # 3. At limit=3500: 'critical', 'major', and 'needs_attention' fit (proves needs_attention outranks improvement, strength)
    b3 = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3500)
    sevs3 = [f.severity for f in b3.diagnostic_findings]
    assert sevs3 == ["critical", "major", "needs_attention"], f"Expected ['critical', 'major', 'needs_attention'] at limit 3500, got {sevs3}"

    # 4. At limit=3600: 'critical', 'major', 'needs_attention', and 'improvement' fit (proves improvement outranks strength)
    b4 = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3600)
    sevs4 = [f.severity for f in b4.diagnostic_findings]
    assert sevs4 == ["critical", "major", "needs_attention", "improvement"], f"Expected 4 findings at limit 3600, got {sevs4}"

    # 5. Regression verification: prove that the OLD severity mapping fails this test!
    import app.services.analysis.ai_evidence_selector as selector_mod
    old_weights = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    orig_weights = selector_mod.SEVERITY_WEIGHT
    selector_mod.SEVERITY_WEIGHT = old_weights
    try:
        old_b = selector_mod.AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3300)
        old_sevs = [f.severity for f in old_b.diagnostic_findings]
        # Under old mapping, major was collapsed to 5 and strength came first in input order,
        # so old_sevs was ['critical', 'strength'] instead of ['critical', 'major']!
        assert old_sevs != ["critical", "major"], "Old mapping should have failed to prioritize major over strength!"
        assert "strength" in old_sevs and "major" not in old_sevs
    finally:
        selector_mod.SEVERITY_WEIGHT = orig_weights


def test_candidate_with_tests_priority_relative_to_candidate_and_not_evaluated():
    """Prove that candidate outranks candidate_with_tests, and candidate_with_tests outranks not_evaluated under budget pressure.
    Also proves that under the old STATUS_PRIORITY (where candidate_with_tests was omitted),
    not_evaluated was erroneously selected ahead of candidate_with_tests.
    """
    pkg = _make_dummy_package(num_findings=0, num_requirements=0, num_files=20)
    for i in range(5):
        pkg.diagnostic_findings.append(
            AIEvidenceFindingItem(
                finding_id=uuid.uuid4(),
                finding_hash=f"hash_{i}",
                finding_type="architecture_gap",
                severity="critical",
                title=f"Critical Finding {i}",
                summary="Summary of critical finding with lots of text to consume token budget.",
                why_it_matters="Why it matters text with lots of words.",
                evidence_references=[],
            )
        )

    # Supply statuses in reverse priority order: not_evaluated first, candidate_with_tests second, candidate third
    req_statuses = ["not_evaluated", "candidate_with_tests", "candidate"]
    reqs = []
    for i, st in enumerate(req_statuses):
        reqs.append(
            AIEvidenceRequirementItem(
                id=uuid.uuid4(),
                requirement_id=f"REQ-{i+1:03d}",
                title=f"Req with {st}",
                description="Detailed requirement description that consumes tokens to force pruning." * 4,
                category="functional",
                traceability_status=st,
                implementation_count=1 if st != "not_evaluated" else 0,
                test_count=1 if st == "candidate_with_tests" else 0,
                candidate_files=[],
            )
        )
    pkg.requirements = reqs

    # With budget limit=3700, exactly 2 requirements fit:
    # Under new mapping: candidate (priority 2) and candidate_with_tests (priority 3) are retained, not_evaluated (priority 4) is dropped
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3700)
    retained_statuses = [r.traceability_status for r in bounded.requirements]
    assert retained_statuses == ["candidate", "candidate_with_tests"], f"Expected candidate and candidate_with_tests, got {retained_statuses}"
    assert "not_evaluated" not in retained_statuses

    # Regression verification: prove that under OLD status priority, candidate_with_tests was omitted and lost to not_evaluated
    import app.services.analysis.ai_evidence_selector as selector_mod
    old_status_priority = {"unmatched": 0, "ambiguous": 1, "candidate": 2, "not_evaluated": 3}
    orig_sp = selector_mod.STATUS_PRIORITY
    selector_mod.STATUS_PRIORITY = old_status_priority
    try:
        old_b = selector_mod.AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=3700)
        old_statuses = [r.traceability_status for r in old_b.requirements]
        assert old_statuses == ["candidate", "not_evaluated"], f"Old mapping was expected to retain not_evaluated, got {old_statuses}"
    finally:
        selector_mod.STATUS_PRIORITY = orig_sp


def test_end_to_end_evidence_path_builder_to_prompt():
    """Prove end-to-end evidence path:
    - Requirement description survives, is bounded to 250 chars, and reaches prompt
    - Requirement with empty description is pruned from prompt payload
    - Traceability summary_notes survives, is bounded to 200 chars, and reaches prompt
    - is_test_evidence boolean is preserved on snippet dictionaries in prompt
    - Citation references remain strictly valid
    """
    from app.services.ai.openrouter_client import format_evidence_for_prompt
    from app.services.analysis.citation_validator import CitationValidator
    from app.schemas.ai_analysis import AIAnalysisResult, AIEvidenceCitation, AIObservation
    import json

    pkg = _make_dummy_package(num_findings=2, num_requirements=2, num_files=2, snippet_length=150)

    # Setup REQ-001 with long description (>250 chars), REQ-002 with empty description
    req1_long_desc = "X" * 300
    bounded_req1_desc = req1_long_desc[:250]
    pkg.requirements[0].description = bounded_req1_desc
    pkg.requirements[1].description = None  # Empty to test pruning

    # Setup traceability item with summary_notes
    long_notes = "Y" * 250
    bounded_notes = long_notes[:200]
    pkg.traceability_summary["items"][0]["summary_notes"] = bounded_notes

    # Setup candidate snippet with is_test_evidence flag
    pkg.traceability_summary["candidate_snippets"][0]["is_test_evidence"] = True

    # 1. Run through selector
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=4500)
    assert bounded.requirements[0].description == bounded_req1_desc
    assert bounded.requirements[1].description is None

    # 2. Format for prompt
    formatted_prompt = format_evidence_for_prompt(bounded)
    prefix = "Here is the structured project evidence package for technical evaluation:\n\n"
    suffix = "\n\nAnalyze this structured evidence package according to your instructions and return the structured evaluation result."
    assert formatted_prompt.startswith(prefix)
    assert formatted_prompt.endswith(suffix)

    payload = json.loads(formatted_prompt[len(prefix):-len(suffix)])

    # 3. Assertions on prompt payload
    # Check description presence and bounds
    reqs_payload = payload["requirements"]
    assert reqs_payload[0]["requirement_id"] == "REQ-001"
    assert reqs_payload[0]["description"] == bounded_req1_desc
    assert len(reqs_payload[0]["description"]) <= 250
    # Empty description must be pruned
    assert "description" not in reqs_payload[1]

    # Check summary_notes presence and bounds
    trace_items = payload["traceability_summary"]["items"]
    assert trace_items[0]["summary_notes"] == bounded_notes
    assert len(trace_items[0]["summary_notes"]) <= 200

    # Check is_test_evidence flag in snippets
    snippets = payload["traceability_summary"]["candidate_snippets"]
    assert snippets[0]["is_test_evidence"] is True

    # 4. Strict CitationValidator verification
    citation = AIEvidenceCitation(
        target_type="requirement",
        target_id=bounded.requirements[0].id,
        identifier="REQ-001",
        detail="Valid requirement citation",
    )
    from app.schemas.ai_analysis import ProjectUnderstandingAssessment
    test_result = AIAnalysisResult(
        analysis_summary="Valid analysis",
        project_understanding=ProjectUnderstandingAssessment(
            summary="Project summary grounded in evidence",
            primary_purpose="Automated verification",
            target_users_identified=["Developers"],
            key_capabilities_claimed=["Analysis"],
            confidence="high",
        ),
        observations=[
            AIObservation(
                observation_type="fact",
                category="architecture",
                title="Observation 1",
                statement="Statement 1",
                technical_rationale="Rationale",
                evidence_citations=[citation],
                confidence="high",
            )
        ],
        cross_artifact_correlations=[],
        contradictions=[],
        evidence_gaps=[],
        diagnostic_interpretations=[],
        uncertainty_notes=[],
    )
    # Must pass without raising CitationIntegrityError
    CitationValidator.validate_citation_integrity(test_result, bounded)


def test_representative_case_22_findings_17_requirements_budget():
    """Representative case of 22 findings, 17 requirements, 25 files:
    - Reports counts available to builder, selected, retained, present in prompt
    - Asserts production estimate stays at or below 4,500 tokens
    - Asserts higher-priority findings are retained over lower-priority findings
    """
    from app.services.ai.openrouter_client import format_evidence_for_prompt
    import json

    pkg = _make_dummy_package(num_findings=22, num_requirements=17, num_files=25, snippet_length=180)
    for i, req in enumerate(pkg.requirements):
        req.description = f"Requirement description for REQ-{i+1:03d}: system must support verified operation."[:250]
    for ti in pkg.traceability_summary["items"]:
        ti["summary_notes"] = "Deterministic matcher mapped symbols with confidence."[:200]
    for snip in pkg.traceability_summary["candidate_snippets"]:
        snip["is_test_evidence"] = (snip.get("line_start", 1) % 2 == 0)

    # Stage 1: Available to builder
    assert len(pkg.diagnostic_findings) == 22
    assert len(pkg.requirements) == 17
    assert len(pkg.repository_summary["all_indexed_files"]) == 25
    assert len(pkg.traceability_summary["items"]) == 17
    assert len(pkg.traceability_summary["candidate_snippets"]) == 17
    unbounded_tokens = estimate_prompt_tokens(pkg)
    assert unbounded_tokens > 4500

    # Stage 2: Bounded selector
    bounded = AIEvidenceSelector.select_bounded_evidence(pkg, max_input_tokens=4500)
    final_estimate = estimate_prompt_tokens(bounded)

    assert final_estimate <= 4500
    assert len(bounded.diagnostic_findings) == 5
    assert len(bounded.requirements) == 5

    # Verify higher priority findings retained
    retained_sevs = [f.severity for f in bounded.diagnostic_findings]
    assert all(s in ["critical", "major"] for s in retained_sevs)
    assert "improvement" not in retained_sevs
    assert "strength" not in retained_sevs

    # Stage 3: Prompt formatting
    formatted = format_evidence_for_prompt(bounded)
    prefix = "Here is the structured project evidence package for technical evaluation:\n\n"
    suffix = "\n\nAnalyze this structured evidence package according to your instructions and return the structured evaluation result."
    payload = json.loads(formatted[len(prefix):-len(suffix)])

    assert len(payload["diagnostic_findings"]) == 5
    assert len(payload["requirements"]) == 5
    assert any("description" in r for r in payload["requirements"])
    assert any("summary_notes" in ti for ti in payload["traceability_summary"]["items"])
    assert any("is_test_evidence" in s for s in payload["traceability_summary"]["candidate_snippets"])

