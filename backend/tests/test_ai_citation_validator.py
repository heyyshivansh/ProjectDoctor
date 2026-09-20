import uuid
import pytest

from app.schemas.ai_evidence import (
    AIEvidencePackage,
    AIEvidenceRequirementItem,
    AIEvidenceFindingItem,
    AIEvidenceArtifactItem,
)
from app.schemas.ai_analysis import (
    AIAnalysisResult,
    AIEvidenceCitation,
    AIObservation,
    ProjectUnderstandingAssessment,
    AIDiagnosticInterpretation,
)
from app.services.analysis.citation_validator import (
    CitationValidator,
    CitationIntegrityError,
)


@pytest.fixture
def test_package():
    proj_id = uuid.uuid4()
    req1_id = uuid.uuid4()
    art1_id = uuid.uuid4()
    f1_id = uuid.uuid4()
    trace1_id = uuid.uuid4()
    file1_id = uuid.uuid4()

    return AIEvidencePackage(
        project_id=proj_id,
        project_title="Citation Test Project",
        project_context={"title": "Test", "problem_statement": "Problem"},
        artifacts=[
            AIEvidenceArtifactItem(
                id=art1_id,
                filename="srs.pdf",
                artifact_type="requirement_doc",
            )
        ],
        requirements=[
            AIEvidenceRequirementItem(
                id=req1_id,
                requirement_id="REQ-001",
                title="User Auth",
                category="functional",
                traceability_status="candidate",
            )
        ],
        repository_summary={
            "all_indexed_files": [
                {"id": str(file1_id), "file_path": "backend/main.py"},
            ],
            "manifests": ["backend/requirements.txt"],
            "entrypoints": ["backend/main.py"],
            "directory_tree": ["backend"],
        },
        traceability_summary={
            "items": [
                {"id": str(trace1_id), "requirement_id": "REQ-001", "status": "candidate"}
            ]
        },
        diagnostic_findings=[
            AIEvidenceFindingItem(
                finding_id=f1_id,
                finding_hash="hash_finding_001",
                finding_type="requirement_gap",
                severity="major",
                title="Unmatched Spec",
                summary="Summary",
                why_it_matters="Matters",
            )
        ],
    )


def _make_result_with_citations(citations, interp_finding_id=None):
    interps = []
    if interp_finding_id:
        interps.append(
            AIDiagnosticInterpretation(
                finding_id=interp_finding_id,
                finding_title="Finding",
                project_context_impact="Context",
            )
        )

    return AIAnalysisResult(
        analysis_summary="Summary",
        project_understanding=ProjectUnderstandingAssessment(
            summary="Summary",
            primary_purpose="Purpose",
            confidence="high",
        ),
        observations=[
            AIObservation(
                observation_type="fact",
                category="implementation",
                title="Obs Title",
                statement="Obs Statement",
                technical_rationale="Rationale",
                evidence_citations=citations,
                confidence="high",
            )
        ],
        diagnostic_interpretations=interps,
    )


def test_valid_requirement_citation(test_package):
    req = test_package.requirements[0]
    cit = AIEvidenceCitation(
        target_type="requirement",
        target_id=req.id,
        identifier=req.requirement_id,
    )
    result = _make_result_with_citations([cit])
    # Should pass without error
    CitationValidator.validate_citation_integrity(result, test_package)


def test_invalid_requirement_fictitious_code(test_package):
    req = test_package.requirements[0]
    cit = AIEvidenceCitation(
        target_type="requirement",
        target_id=req.id,
        identifier="REQ-999-FAKE",
    )
    result = _make_result_with_citations([cit])
    with pytest.raises(CitationIntegrityError) as exc_info:
        CitationValidator.validate_citation_integrity(result, test_package)
    assert "REQ-999-FAKE" in str(exc_info.value)


def test_invalid_requirement_fictitious_uuid(test_package):
    cit = AIEvidenceCitation(
        target_type="requirement",
        target_id=uuid.uuid4(),
        identifier="REQ-001",
    )
    result = _make_result_with_citations([cit])
    with pytest.raises(CitationIntegrityError):
        CitationValidator.validate_citation_integrity(result, test_package)


def test_valid_repository_file_citation(test_package):
    cit = AIEvidenceCitation(
        target_type="repository_file",
        identifier="backend/main.py",
    )
    result = _make_result_with_citations([cit])
    CitationValidator.validate_citation_integrity(result, test_package)
    # Check that target_id was auto-resolved
    assert cit.target_id is not None


def test_invalid_repository_file_fictitious_path(test_package):
    cit = AIEvidenceCitation(
        target_type="repository_file",
        identifier="src/magical_file.py",
    )
    result = _make_result_with_citations([cit])
    with pytest.raises(CitationIntegrityError) as exc_info:
        CitationValidator.validate_citation_integrity(result, test_package)
    assert "src/magical_file.py" in str(exc_info.value)


def test_valid_finding_citation_by_hash(test_package):
    finding = test_package.diagnostic_findings[0]
    cit = AIEvidenceCitation(
        target_type="finding",
        target_id=finding.finding_id,
        identifier=finding.finding_hash,
    )
    result = _make_result_with_citations([cit], interp_finding_id=finding.finding_id)
    CitationValidator.validate_citation_integrity(result, test_package)


def test_invalid_finding_fictitious_hash(test_package):
    cit = AIEvidenceCitation(
        target_type="finding",
        identifier="FINDING-FAKE-HASH",
    )
    result = _make_result_with_citations([cit])
    with pytest.raises(CitationIntegrityError):
        CitationValidator.validate_citation_integrity(result, test_package)


def test_valid_artifact_citation(test_package):
    art = test_package.artifacts[0]
    cit = AIEvidenceCitation(
        target_type="artifact",
        target_id=art.id,
        identifier=art.filename,
    )
    result = _make_result_with_citations([cit])
    CitationValidator.validate_citation_integrity(result, test_package)


def test_invalid_artifact_fictitious_name(test_package):
    art = test_package.artifacts[0]
    cit = AIEvidenceCitation(
        target_type="artifact",
        target_id=art.id,
        identifier="nonexistent_doc.docx",
    )
    result = _make_result_with_citations([cit])
    with pytest.raises(CitationIntegrityError):
        CitationValidator.validate_citation_integrity(result, test_package)


def test_valid_traceability_citation(test_package):
    trace = test_package.traceability_summary["items"][0]
    cit = AIEvidenceCitation(
        target_type="traceability",
        target_id=uuid.UUID(trace["id"]),
        identifier="REQ-001 -> candidate",
    )
    result = _make_result_with_citations([cit])
    CitationValidator.validate_citation_integrity(result, test_package)


def test_invalid_traceability_unknown_uuid(test_package):
    cit = AIEvidenceCitation(
        target_type="traceability",
        target_id=uuid.uuid4(),
        identifier="REQ-001 -> candidate",
    )
    result = _make_result_with_citations([cit])
    with pytest.raises(CitationIntegrityError):
        CitationValidator.validate_citation_integrity(result, test_package)
