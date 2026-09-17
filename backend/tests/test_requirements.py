import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.artifact import Artifact
from app.models.requirement import Requirement, RequirementEvidence


def create_sample_project(client: TestClient, title="Test Project", requirements=None) -> dict:
    """Helper to create a test project."""
    payload = {
        "title": title,
        "problem_statement": "Students face difficulty in grading projects rigorously.",
        "description": "An automated evaluation and grading platform.",
        "requirements": requirements,
        "tech_stack": ["FastAPI", "React"],
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 201
    return response.json()


def upload_and_extract_text(client: TestClient, project_id: str, filename: str, content: str) -> dict:
    """Helper to upload a markdown/text artifact and run extraction."""
    file_bytes = io.BytesIO(content.encode("utf-8"))
    upload_res = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": (filename, file_bytes, "text/markdown")},
    )
    assert upload_res.status_code == 201
    artifact = upload_res.json()

    extract_res = client.post(
        f"/api/projects/{project_id}/artifacts/{artifact['id']}/extraction"
    )
    assert extract_res.status_code == 200
    return artifact


def test_extract_requirements_from_metadata(client: TestClient):
    """Verify requirements are extracted deterministically from project declared requirements."""
    req_text = (
        "- The system shall provide secure user authentication via JWT. [High]\n"
        "- As an Admin, I want to manage project evaluation criteria.\n"
        "- The API must respond to queries within 200ms latency.\n"
    )
    project = create_sample_project(client, requirements=req_text)
    project_id = project["id"]

    # Trigger extraction
    res = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res.status_code == 200
    data = res.json()

    assert data["total_extracted"] == 3
    assert data["functional_count"] >= 1
    assert data["security_count"] >= 1
    assert data["non_functional_count"] >= 1

    # Fetch list
    list_res = client.get(f"/api/projects/{project_id}/requirements")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 3

    # Check first requirement: REQ-001 with priority High and security category
    auth_req = next(r for r in items if "authentication" in r["description"].lower())
    assert auth_req["requirement_id"] == "REQ-001"
    assert auth_req["priority"] == "high"
    assert auth_req["category"] == "security"

    # Check actor detection in user story
    admin_req = next(r for r in items if "criteria" in r["description"].lower())
    assert admin_req["actor"] == "Admin"


def test_extract_requirements_from_document_sections(client: TestClient):
    """Verify requirements extracted from explicit section headings with page/section provenance."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_content = """# Architecture & Requirements Document

## Functional Requirements
1. The user shall upload project specification documents in PDF or DOCX format.
2. The evaluator shall inspect extracted requirement provenance.
3. System must encrypt all passwords using bcrypt hashing. [High]

## Performance Requirements
- The search endpoint must support 500 concurrent queries per second.
"""
    upload_and_extract_text(client, project_id, "spec.md", doc_content)

    res = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res.status_code == 200
    data = res.json()

    assert data["total_extracted"] == 4

    # Verify requirement detail with provenance
    detail_res = client.get(f"/api/projects/{project_id}/requirements/REQ-001")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    assert detail["requirement_id"] == "REQ-001"
    assert len(detail["evidence"]) >= 1
    ev = detail["evidence"][0]
    assert ev["source_type"] == "artifact"
    assert ev["artifact_name"] == "spec.md"
    assert "Functional Requirements" in ev["section_title"]
    assert "upload project specification" in ev["exact_snippet"]
    assert ev["confidence"] == 1.0


def test_extract_requirements_modal_verbs_in_prose(client: TestClient):
    """Verify RFC 2119 modal verbs ('shall', 'must') in prose are extracted as requirements."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_content = """# Project Overview

Project Doctor is an automated analysis engine. The application shall monitor system health continuously.
Furthermore, the backend must log all diagnostic events with timestamps.
"""
    upload_and_extract_text(client, project_id, "overview.md", doc_content)

    res = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res.status_code == 200
    data = res.json()

    assert data["total_extracted"] == 2
    req_titles = [r["title"].lower() for r in data["requirements"]]
    assert any("health" in t for t in req_titles)
    assert any("diagnostic" in t for t in req_titles)


def test_strict_no_invention_rule(client: TestClient):
    """Verify priority, actor, and details remain strictly None when not in evidence."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_content = """## System Requirements
- Generate daily analytical reports.
"""
    upload_and_extract_text(client, project_id, "requirements.md", doc_content)

    res = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res.status_code == 200
    items = res.json()["requirements"]
    assert len(items) == 1

    req = items[0]
    assert req["priority"] is None
    assert req["actor"] is None
    assert req["conflict_summary"] is None


def test_deterministic_extraction(client: TestClient):
    """Verify running extraction twice on identical evidence produces identical output."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_content = """## Features
1. Support multi-tenant organization accounts.
2. Export reports to PDF format.
"""
    upload_and_extract_text(client, project_id, "features.md", doc_content)

    # First run
    res1 = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res1.status_code == 200
    data1 = res1.json()

    # Second run
    res2 = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res2.status_code == 200
    data2 = res2.json()

    assert data1["total_extracted"] == data2["total_extracted"]
    for r1, r2 in zip(data1["requirements"], data2["requirements"]):
        assert r1["requirement_id"] == r2["requirement_id"]
        assert r1["content_hash"] == r2["content_hash"]
        assert r1["title"] == r2["title"]


def test_stable_identity_on_regeneration(client: TestClient):
    """Verify requirement IDs (REQ-001, REQ-002) remain stable when re-extracting with new additions."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_v1 = """## Specifications
1. Enable single sign-on authentication.
2. Provide audit trail logs.
"""
    upload_and_extract_text(client, project_id, "v1.md", doc_v1)

    res1 = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res1.status_code == 200
    reqs_v1 = res1.json()["requirements"]
    assert len(reqs_v1) == 2
    assert reqs_v1[0]["requirement_id"] == "REQ-001"
    assert reqs_v1[1]["requirement_id"] == "REQ-002"

    # Add second artifact with a new requirement
    doc_v2 = """## Specifications
1. Enable single sign-on authentication.
2. Provide audit trail logs.
3. Automatically archive expired projects.
"""
    upload_and_extract_text(client, project_id, "v2.md", doc_v2)

    res2 = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res2.status_code == 200
    reqs_v2 = res2.json()["requirements"]

    assert len(reqs_v2) == 3
    # Existing IDs must be strictly preserved
    assert reqs_v2[0]["requirement_id"] == "REQ-001"
    assert "single sign-on" in reqs_v2[0]["description"].lower()
    assert reqs_v2[1]["requirement_id"] == "REQ-002"
    assert "audit trail" in reqs_v2[1]["description"].lower()
    # New requirement gets the next sequential ID
    assert reqs_v2[2]["requirement_id"] == "REQ-003"
    assert "archive" in reqs_v2[2]["description"].lower()


def test_duplicate_requirements_consolidation(client: TestClient):
    """Verify exact duplicate requirements across artifacts are consolidated with multiple evidence links."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_a = """## Features
- Users can register using email address.
"""
    doc_b = """## User Requirements
- Users can register using email address.
"""
    upload_and_extract_text(client, project_id, "proposal.md", doc_a)
    upload_and_extract_text(client, project_id, "spec.md", doc_b)

    res = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res.status_code == 200
    data = res.json()

    # Must be consolidated into 1 canonical requirement
    assert data["total_extracted"] == 1
    req_id = data["requirements"][0]["requirement_id"]

    detail_res = client.get(f"/api/projects/{project_id}/requirements/{req_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    # Must contain 2 distinct evidence items (one from proposal.md, one from spec.md)
    assert len(detail["evidence"]) == 2
    artifact_names = {ev["artifact_name"] for ev in detail["evidence"]}
    assert "proposal.md" in artifact_names
    assert "spec.md" in artifact_names


def test_conflicting_requirements_detection(client: TestClient):
    """Verify contradictory technical requirements across artifacts are flagged as conflicted."""
    project = create_sample_project(client)
    project_id = project["id"]

    doc_a = """## Database Specification
- The application shall use PostgreSQL for persistent data storage.
"""
    doc_b = """## Database Specification
- The application shall use MongoDB for persistent data storage.
"""
    upload_and_extract_text(client, project_id, "doc_relational.md", doc_a)
    upload_and_extract_text(client, project_id, "doc_document.md", doc_b)

    res = client.post(f"/api/projects/{project_id}/requirements/extract")
    assert res.status_code == 200
    data = res.json()

    # Check if contradiction was flagged
    assert data["conflicted_count"] >= 1
    conflicted = [r for r in data["requirements"] if r["status"] == "conflicted"]
    assert len(conflicted) >= 1
    assert conflicted[0]["is_ambiguous"] is True
    assert "Contradiction detected" in conflicted[0]["conflict_summary"]


def test_requirements_cross_project_isolation(client: TestClient):
    """Verify requirements from Project A cannot be accessed from Project B."""
    proj_a = create_sample_project(client, title="Project A", requirements="- Feature A")
    proj_b = create_sample_project(client, title="Project B", requirements="- Feature B")

    client.post(f"/api/projects/{proj_a['id']}/requirements/extract")
    client.post(f"/api/projects/{proj_b['id']}/requirements/extract")

    # List project A requirements
    res_a = client.get(f"/api/projects/{proj_a['id']}/requirements")
    items_a = res_a.json()
    assert len(items_a) == 1
    req_a_id = items_a[0]["requirement_id"]

    # Attempt to access project A's requirement using Project B's endpoint
    cross_res = client.get(f"/api/projects/{proj_b['id']}/requirements/{req_a_id}")
    # REQ-001 in project B corresponds to Feature B, not Feature A
    if cross_res.status_code == 200:
        assert cross_res.json()["description"] != items_a[0]["description"]

    # Attempt with UUID of Project A's requirement
    cross_uuid_res = client.get(f"/api/projects/{proj_b['id']}/requirements/{items_a[0]['id']}")
    assert cross_uuid_res.status_code == 404


def test_requirements_cascade_delete(client: TestClient, db_session: Session):
    """Verify deleting a project cascades to delete all requirements and evidence rows."""
    proj = create_sample_project(client, title="Cascade Test", requirements="- Feature to be deleted")
    proj_id = proj["id"]

    client.post(f"/api/projects/{proj_id}/requirements/extract")

    # Verify rows exist in DB
    req_count = db_session.query(Requirement).filter(Requirement.project_id == uuid.UUID(proj_id)).count()
    ev_count = db_session.query(RequirementEvidence).filter(RequirementEvidence.project_id == uuid.UUID(proj_id)).count()
    assert req_count > 0
    assert ev_count > 0

    # Delete project
    del_res = client.delete(f"/api/projects/{proj_id}")
    # Note: Project delete route might not exist or might be project deletion in cascade test
    # Let's delete project directly via db or check if delete route exists
    db_proj = db_session.query(Project).filter(Project.id == uuid.UUID(proj_id)).first()
    db_session.delete(db_proj)
    db_session.commit()

    # Verify requirements and evidence rows are cascade-deleted
    assert db_session.query(Requirement).filter(Requirement.project_id == uuid.UUID(proj_id)).count() == 0
    assert db_session.query(RequirementEvidence).filter(RequirementEvidence.project_id == uuid.UUID(proj_id)).count() == 0


def test_requirements_summary_metrics(client: TestClient):
    """Verify GET /api/projects/{project_id}/requirements/summary endpoint."""
    project = create_sample_project(
        client,
        requirements=(
            "- The system must support JWT authentication. [High]\n"
            "- The system will be fast and modern.\n"
        ),
    )
    project_id = project["id"]

    client.post(f"/api/projects/{project_id}/requirements/extract")

    res = client.get(f"/api/projects/{project_id}/requirements/summary")
    assert res.status_code == 200
    metrics = res.json()

    assert metrics["total"] == 2
    assert "security" in metrics["by_category"]
    assert metrics["ambiguous_count"] >= 1
