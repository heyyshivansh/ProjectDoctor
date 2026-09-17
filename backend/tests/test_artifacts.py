import io
import uuid
import pytest
from unittest.mock import patch
from app.services.project_service import ProjectService


def create_sample_project(client) -> str:
    """Helper to create a sample project and return its ID."""
    res = client.post(
        "/api/projects",
        json={
            "title": "Artifact Testing Project",
            "problem_statement": "Detailed problem statement for artifact upload verification.",
            "description": "Detailed description testing artifact upload and download pipelines.",
        },
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_upload_artifact_success(client):
    """Verify successful artifact upload persists file on disk and record in DB."""
    project_id = create_sample_project(client)
    file_content = b"%PDF-1.4 sample pdf content for testing"

    files = {"file": ("test_proposal.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {"file_type": "proposal"}

    response = client.post(f"/api/projects/{project_id}/artifacts", files=files, data=data)
    assert response.status_code == 201

    res_data = response.json()
    assert "id" in res_data
    assert res_data["project_id"] == project_id
    assert res_data["original_filename"] == "test_proposal.pdf"
    assert res_data["file_type"] == "proposal"
    assert res_data["file_size_bytes"] == len(file_content)
    assert res_data["status"] == "uploaded"


def test_upload_artifact_invalid_extension(client):
    """Verify that uploading an executable extension (.exe) returns 415 Unsupported Media Type."""
    project_id = create_sample_project(client)
    file_content = b"MZ executable content"

    files = {"file": ("malicious.exe", io.BytesIO(file_content), "application/x-msdownload")}
    response = client.post(f"/api/projects/{project_id}/artifacts", files=files)
    assert response.status_code == 415
    assert "Unsupported file extension" in response.json()["detail"]


def test_upload_artifact_double_extension(client):
    """Verify that double extension evasion attempts (.pdf.exe) are blocked with 415."""
    project_id = create_sample_project(client)
    file_content = b"fake pdf payload"

    files = {"file": ("evasion.pdf.exe", io.BytesIO(file_content), "application/octet-stream")}
    response = client.post(f"/api/projects/{project_id}/artifacts", files=files)
    assert response.status_code == 415


def test_upload_artifact_empty_file(client):
    """Verify that zero-byte uploads are rejected with 400 Bad Request."""
    project_id = create_sample_project(client)
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    response = client.post(f"/api/projects/{project_id}/artifacts", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_artifact_missing_project(client):
    """Verify uploading to a non-existent project returns 404 Not Found."""
    random_id = uuid.uuid4()
    files = {"file": ("proposal.pdf", io.BytesIO(b"%PDF dummy"), "application/pdf")}
    response = client.post(f"/api/projects/{random_id}/artifacts", files=files)
    assert response.status_code == 404


def test_duplicate_filename_upload(client):
    """Verify uploading identical filenames creates distinct files on disk and unique DB records."""
    project_id = create_sample_project(client)
    file_content1 = b"version 1 content"
    file_content2 = b"version 2 content with modifications"

    # First upload
    res1 = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("report.pdf", io.BytesIO(file_content1), "application/pdf")},
    )
    assert res1.status_code == 201
    art1 = res1.json()

    # Second upload with same name
    res2 = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("report.pdf", io.BytesIO(file_content2), "application/pdf")},
    )
    assert res2.status_code == 201
    art2 = res2.json()

    # DB IDs and stored filenames must be distinct
    assert art1["id"] != art2["id"]
    assert art1["stored_filename"] != art2["stored_filename"]


def test_download_artifact_success(client):
    """Verify artifact download streams the file with original filename."""
    project_id = create_sample_project(client)
    original_data = b"%PDF-1.4 file content to verify stream download"

    upload_res = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("downloadable.pdf", io.BytesIO(original_data), "application/pdf")},
    )
    assert upload_res.status_code == 201
    artifact_id = upload_res.json()["id"]

    download_res = client.get(f"/api/projects/{project_id}/artifacts/{artifact_id}/download")
    assert download_res.status_code == 200
    assert download_res.content == original_data
    assert 'filename="downloadable.pdf"' in download_res.headers.get("content-disposition", "")


def test_download_artifact_cross_project_isolation(client):
    """Verify Project B cannot download an artifact belonging to Project A (cross-project isolation)."""
    project_a = create_sample_project(client)
    project_b = create_sample_project(client)

    # Upload to Project A
    upload_res = client.post(
        f"/api/projects/{project_a}/artifacts",
        files={"file": ("project_a_secret.pdf", io.BytesIO(b"secret doc"), "application/pdf")},
    )
    artifact_id = upload_res.json()["id"]

    # Attempt to download via Project B URL
    attack_res = client.get(f"/api/projects/{project_b}/artifacts/{artifact_id}/download")
    assert attack_res.status_code == 404


def test_failed_upload_disk_cleanup(client, temp_storage):
    """Verify that if database persistence fails, the saved disk file is cleanly removed."""
    project_id = create_sample_project(client)
    content = b"content for transaction failure test"

    # Mock ProjectService.create_artifact to simulate a database failure
    with patch.object(
        ProjectService, "create_artifact", side_effect=RuntimeError("Simulated DB connection failure")
    ):
        response = client.post(
            f"/api/projects/{project_id}/artifacts",
            files={"file": ("fail_test.pdf", io.BytesIO(content), "application/pdf")},
        )
        assert response.status_code == 500

    # Verify no file remains in the project storage directory
    project_dir = temp_storage.get_project_dir(uuid.UUID(project_id))
    assert len(list(project_dir.iterdir())) == 0


def test_list_artifacts_success(client):
    """Verify listing all artifacts attached to a project."""
    project_id = create_sample_project(client)

    # Upload two artifacts
    client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("doc1.pdf", io.BytesIO(b"doc1"), "application/pdf")},
        data={"file_type": "proposal"},
    )
    client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("diagram.png", io.BytesIO(b"diagram"), "image/png")},
        data={"file_type": "architecture_diagram"},
    )

    list_res = client.get(f"/api/projects/{project_id}/artifacts")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 2
    filenames = {i["original_filename"] for i in items}
    assert filenames == {"doc1.pdf", "diagram.png"}
