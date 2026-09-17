import uuid
import pytest
from app.models.project import Project
from app.models.artifact import Artifact


def test_create_project_success(client):
    """Verify that a valid project payload is accepted and persisted with 201 Created."""
    payload = {
        "title": "Autonomous Smart Grid Optimizer",
        "problem_statement": "Renewable energy sources cause fluctuations in localized distribution grids.",
        "description": "An AI-powered edge telemetry platform that balances power distribution automatically.",
        "requirements": "R1: Telemetry response < 50ms\nR2: Anomaly prediction",
        "tech_stack": ["FastAPI", "React", "Python"],
        "architecture_summary": "Edge broker architecture connecting Kafka and SQLite.",
        "github_repo_url": "https://github.com/example/smart-grid",
    }

    response = client.post("/api/projects", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert data["title"] == payload["title"]
    assert data["problem_statement"] == payload["problem_statement"]
    assert data["description"] == payload["description"]
    assert data["requirements"] == payload["requirements"]
    assert data["tech_stack"] == payload["tech_stack"]
    assert data["architecture_summary"] == payload["architecture_summary"]
    assert data["github_repo_url"] == payload["github_repo_url"]
    assert data["status"] == "created"
    assert "created_at" in data
    assert "updated_at" in data


def test_create_project_validation_error(client):
    """Verify that malformed or incomplete project payloads fail with 422."""
    # Missing required title and short description
    payload = {
        "problem_statement": "Too short",
        "description": "Short",
    }

    response = client.post("/api/projects", json=payload)
    assert response.status_code == 422
    errors = response.json().get("detail", [])
    fields_with_errors = [e["loc"][-1] for e in errors]
    assert "title" in fields_with_errors


def test_create_project_invalid_github_url(client):
    """Verify that invalid github_repo_url without http/https protocol fails with 422."""
    payload = {
        "title": "Valid Title Project",
        "problem_statement": "Valid problem statement with sufficient length.",
        "description": "Valid description with sufficient length for validation.",
        "github_repo_url": "ftp://not-allowed.com",
    }

    response = client.post("/api/projects", json=payload)
    assert response.status_code == 422


def test_get_project_by_id_success(client):
    """Verify that an existing project can be retrieved by its UUID."""
    # Create project first
    create_res = client.post(
        "/api/projects",
        json={
            "title": "Queryable Project",
            "problem_statement": "A problem statement that is sufficiently detailed.",
            "description": "A project description that is sufficiently detailed.",
        },
    )
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # Fetch project
    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == project_id
    assert data["title"] == "Queryable Project"
    assert isinstance(data["artifacts"], list)


def test_get_project_not_found(client):
    """Verify that requesting a non-existent UUID returns 404 Not Found."""
    random_id = uuid.uuid4()
    response = client.get(f"/api/projects/{random_id}")
    assert response.status_code == 404
    assert f"'{random_id}' not found" in response.json()["detail"]


def test_get_project_malformed_uuid(client):
    """Verify that passing an invalid non-UUID string returns 422 Unprocessable Entity."""
    response = client.get("/api/projects/not-a-valid-uuid")
    assert response.status_code == 422


def test_list_projects_pagination(client):
    """Verify pagination behavior on GET /api/projects."""
    # Create multiple projects
    for i in range(5):
        client.post(
            "/api/projects",
            json={
                "title": f"Batch Project {i}",
                "problem_statement": f"Problem statement number {i} with sufficient text length.",
                "description": f"Description number {i} with sufficient text length.",
            },
        )

    # Page 1: limit 2
    res_page1 = client.get("/api/projects?skip=0&limit=2")
    assert res_page1.status_code == 200
    data1 = res_page1.json()
    assert len(data1["items"]) == 2
    assert data1["total"] >= 5
    assert data1["skip"] == 0
    assert data1["limit"] == 2

    # Page 2: skip 2, limit 2
    res_page2 = client.get("/api/projects?skip=2&limit=2")
    assert res_page2.status_code == 200
    data2 = res_page2.json()
    assert len(data2["items"]) == 2

    # Ensure items are distinct between pages
    ids_page1 = {item["id"] for item in data1["items"]}
    ids_page2 = {item["id"] for item in data2["items"]}
    assert ids_page1.isdisjoint(ids_page2)


def test_project_cascade_delete(client, db_session):
    """Verify that deleting a project cascades and deletes all associated artifacts."""
    # Create project
    create_res = client.post(
        "/api/projects",
        json={
            "title": "Cascade Delete Project",
            "problem_statement": "Problem statement testing foreign key cascading.",
            "description": "Description testing foreign key cascading on delete.",
        },
    )
    assert create_res.status_code == 201
    project_id = uuid.UUID(create_res.json()["id"])

    # Create dummy artifact directly linked to this project
    artifact = Artifact(
        id=uuid.uuid4(),
        project_id=project_id,
        original_filename="dummy.pdf",
        stored_filename=f"{uuid.uuid4()}_dummy.pdf",
        storage_path="storage/uploads/dummy.pdf",
        file_type="proposal",
        mime_type="application/pdf",
        file_size_bytes=1024,
        status="uploaded",
    )
    db_session.add(artifact)
    db_session.commit()

    # Verify artifact exists
    assert db_session.get(Artifact, artifact.id) is not None

    # Delete project
    project = db_session.get(Project, project_id)
    db_session.delete(project)
    db_session.commit()

    # Verify artifact was cascade deleted
    assert db_session.get(Artifact, artifact.id) is None
