import io
import uuid
import pytest


def test_understanding_strict_no_invention_rule(client, db_session):
    """Verify that unstated fields remain strictly null or [] without any generic guessing."""
    # Create project with only basic fields
    proj_resp = client.post(
        "/api/projects",
        json={
            "title": "Minimal Project",
            "problem_statement": "Manual grading takes too long.",
            "description": "An automated workflow.",
        },
    )
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # Before generating, GET returns 404
    get_before = client.get(f"/api/projects/{project_id}/understanding")
    assert get_before.status_code == 404
    assert "has not been generated yet" in get_before.json()["detail"]

    # Generate understanding with no documents
    gen_resp = client.post(f"/api/projects/{project_id}/understanding")
    assert gen_resp.status_code == 200
    data = gen_resp.json()

    # Explicit metadata is preserved
    assert data["problem"] == "Manual grading takes too long."
    assert data["provenance"]["problem"]["source_type"] == "project_metadata"

    # STRICT NO-INVENTION VERIFICATION: Unstated fields MUST remain null or []
    assert data["target_users"] == []
    assert data["objectives"] == []
    assert data["modules"] == []
    assert data["expected_scale"] is None
    assert data["deployment"] is None
    assert data["team"] == []
    assert data["dependencies"] == []

    # Checkpoint 4 Boundary: Requirements are NOT converted into R1/RN entities
    assert data["requirements_summary"] is None
    assert "r1" not in str(data).lower()
    assert "traceability" not in str(data).lower()


def test_understanding_from_extracted_documents(client, db_session):
    """Verify that document evidence is correctly mapped into understanding with provenance."""
    # 1. Create project
    proj_resp = client.post(
        "/api/projects",
        json={
            "title": "Full Documented Project",
            "problem_statement": "Medical errors in diagnosis.",
            "description": "A diagnosis assistant.",
            "tech_stack": ["Python", "FastAPI"],
        },
    )
    project_id = proj_resp.json()["id"]

    # 2. Upload document containing explicit sections
    doc_markdown = """# Project Proposal
## Target Users
- Hospital Clinicians
- Medical Residents
- Patient Advocates

## Objectives
- Reduce triage time by 40%
- Detect dosage discrepancies

## Architecture Overview
Event-driven microservices with Redis queues.

## Expected Scale
10,000 requests per minute with 99.9% uptime.

## Deployment
Kubernetes cluster on AWS EKS.

## Team Members
- Dr. Sarah Smith - Clinical Lead
- John Doe - Senior Engineer
"""
    upload_resp = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("proposal.md", io.BytesIO(doc_markdown.encode("utf-8")), "text/markdown")},
        data={"file_type": "proposal"},
    )
    artifact_id = upload_resp.json()["id"]

    # 3. Extract text from artifact
    ext_resp = client.post(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extraction"
    )
    assert ext_resp.status_code == 200
    assert ext_resp.json()["status"] == "completed"

    # 4. Generate project understanding
    und_resp = client.post(f"/api/projects/{project_id}/understanding")
    assert und_resp.status_code == 200
    data = und_resp.json()

    # Verify extracted dimensions
    assert "Hospital Clinicians" in data["target_users"]
    assert "Medical Residents" in data["target_users"]
    assert any("Reduce triage time" in obj for obj in data["objectives"])
    assert "Event-driven microservices with Redis queues" in data["architecture_overview"]
    assert "10,000 requests per minute" in data["expected_scale"]
    assert "Kubernetes cluster on AWS EKS" in data["deployment"]

    # Tech stack: metadata union
    assert "Python" in data["tech_stack"]
    assert "FastAPI" in data["tech_stack"]

    # Team: members parsed
    team_names = [m["name"] for m in data["team"]]
    assert "Dr. Sarah Smith" in team_names
    assert "John Doe" in team_names

    # Provenance verification
    provenance = data["provenance"]
    assert provenance["problem"]["source_type"] == "project_metadata"
    assert provenance["expected_scale"]["source_type"] == "artifact"
    assert provenance["expected_scale"]["artifact_id"] == artifact_id
    assert provenance["deployment"]["source_type"] == "artifact"

    # GET endpoint retrieval
    get_resp = client.get(f"/api/projects/{project_id}/understanding")
    assert get_resp.status_code == 200
    assert get_resp.json()["problem"] == data["problem"]
    assert get_resp.json()["deployment"] == data["deployment"]
