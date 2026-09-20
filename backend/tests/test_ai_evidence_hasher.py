import uuid
import pytest

from app.schemas.ai_evidence import (
    AIEvidencePackage,
    AIEvidenceRequirementItem,
    AIEvidenceFindingItem,
    AIEvidenceArtifactItem,
)
from app.services.analysis.evidence_hasher import compute_evidence_hash


@pytest.fixture
def sample_package():
    proj_id = uuid.uuid4()
    req1_id = uuid.uuid4()
    req2_id = uuid.uuid4()
    f1_id = uuid.uuid4()
    art1_id = uuid.uuid4()

    return AIEvidencePackage(
        project_id=proj_id,
        project_title="Project Doctor AI Test",
        snapshot_id=None,
        commit_sha=None,
        project_context={
            "title": "Project Doctor AI Test",
            "problem_statement": "Automating project evaluation.",
            "description": "Evidence-backed project evaluation engine.",
            "tech_stack": ["Python", "FastAPI"],
            "architecture_summary": "Modular service architecture.",
            "declared_requirements": "R1: Evaluation",
        },
        document_understanding={
            "problem": "Manual project grading is slow.",
            "modules": ["Backend", "Frontend"],
            "target_users": ["Students", "Faculty"],
        },
        artifacts=[
            AIEvidenceArtifactItem(
                id=art1_id,
                filename="proposal.pdf",
                artifact_type="proposal",
            )
        ],
        requirements=[
            AIEvidenceRequirementItem(
                id=req1_id,
                requirement_id="REQ-001",
                title="Automated Grading",
                category="functional",
                is_ambiguous=False,
                traceability_status="unmatched",
            ),
            AIEvidenceRequirementItem(
                id=req2_id,
                requirement_id="REQ-002",
                title="Evidence Grounding",
                category="functional",
                is_ambiguous=False,
                traceability_status="candidate",
            ),
        ],
        repository_summary={
            "total_files": 12,
            "manifests": ["requirements.txt", "package.json"],
            "entrypoints": ["main.py"],
            "directory_tree": ["src", "tests", "docs"],
            "all_indexed_files": [
                {"id": str(uuid.uuid4()), "file_path": "main.py"},
                {"id": str(uuid.uuid4()), "file_path": "requirements.txt"},
            ],
        },
        traceability_summary={
            "total_records": 2,
            "items": [
                {"id": str(uuid.uuid4()), "requirement_id": "REQ-001", "status": "unmatched"},
                {"id": str(uuid.uuid4()), "requirement_id": "REQ-002", "status": "candidate"},
            ],
        },
        diagnostic_findings=[
            AIEvidenceFindingItem(
                finding_id=f1_id,
                finding_hash="abc123hash",
                finding_type="requirement_gap",
                severity="major",
                title="Requirement without candidate implementation",
                summary="REQ-001 is unmatched.",
                why_it_matters="Evaluators require code proof.",
            )
        ],
        evidence_counts={"requirements_count": 2, "findings_count": 1},
    )


def test_same_evidence_and_prompt_produces_identical_hash(sample_package):
    h1 = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")
    h2 = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")
    assert h1 == h2
    assert len(h1) == 64


def test_prompt_version_change_alters_hash(sample_package):
    h1 = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")
    h2 = compute_evidence_hash(sample_package, prompt_version="cp8-v1.1")
    assert h1 != h2


def test_order_invariance_requirements(sample_package):
    h_original = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")

    # Invert the order of requirements
    reversed_reqs = list(reversed(sample_package.requirements))
    shuffled_package = sample_package.model_copy(update={"requirements": reversed_reqs})

    h_shuffled = compute_evidence_hash(shuffled_package, prompt_version="cp8-v1.0")
    assert h_original == h_shuffled


def test_order_invariance_manifests_and_tree(sample_package):
    h_original = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")

    repo_sum = dict(sample_package.repository_summary)
    repo_sum["manifests"] = ["package.json", "requirements.txt"]  # Swapped
    repo_sum["directory_tree"] = ["tests", "src", "docs"]  # Swapped
    shuffled_package = sample_package.model_copy(update={"repository_summary": repo_sum})

    h_shuffled = compute_evidence_hash(shuffled_package, prompt_version="cp8-v1.0")
    assert h_original == h_shuffled


def test_material_change_changes_hash(sample_package):
    h_original = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")

    # Change description
    ctx = dict(sample_package.project_context)
    ctx["description"] = "Different description content"
    modified_package = sample_package.model_copy(update={"project_context": ctx})

    h_modified = compute_evidence_hash(modified_package, prompt_version="cp8-v1.0")
    assert h_original != h_modified


def test_whitespace_normalization(sample_package):
    h_original = compute_evidence_hash(sample_package, prompt_version="cp8-v1.0")

    # Add trailing whitespace to string fields
    ctx = dict(sample_package.project_context)
    ctx["problem_statement"] = ctx["problem_statement"] + "   \n"
    modified_package = sample_package.model_copy(update={"project_context": ctx})

    h_trimmed = compute_evidence_hash(modified_package, prompt_version="cp8-v1.0")
    assert h_original == h_trimmed
