import io
import uuid
import pytest
from app.services.project_service import ProjectService
from app.services.storage_service import storage_service


def test_extract_single_artifact_markdown_success(client, db_session):
    # 1. Create project
    proj_resp = client.post(
        "/api/projects",
        json={
            "title": "Doc Extraction Test",
            "problem_statement": "Need document understanding.",
            "description": "Extracting text from markdown and pdf.",
        },
    )
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # 2. Upload Markdown artifact
    md_content = b"# System Architecture\nBackend uses FastAPI and PostgreSQL.\n## Modules\n- Auth\n- Extraction"
    upload_resp = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("spec.md", io.BytesIO(md_content), "text/markdown")},
        data={"file_type": "requirement_doc"},
    )
    assert upload_resp.status_code == 201
    artifact_id = upload_resp.json()["id"]

    # 3. Trigger extraction
    extract_resp = client.post(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extraction"
    )
    assert extract_resp.status_code == 200
    data = extract_resp.json()
    assert data["status"] == "completed"
    assert data["extractor_name"] == "text_reader"
    assert data["word_count"] > 0
    assert len(data["sections"]) >= 2
    assert data["sha256_hash"] is not None

    # 4. Fetch extraction details
    get_resp = client.get(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extraction"
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "completed"

    # 5. Stream raw extracted text from disk
    text_resp = client.get(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extracted-text"
    )
    assert text_resp.status_code == 200
    assert "System Architecture" in text_resp.text
    assert "FastAPI and PostgreSQL" in text_resp.text


def test_extract_unsupported_type_skipped(client, db_session):
    # 1. Create project
    proj_resp = client.post(
        "/api/projects",
        json={
            "title": "Image Test",
            "problem_statement": "Testing image skip.",
            "description": "PNG should be skipped.",
        },
    )
    project_id = proj_resp.json()["id"]

    # 2. Upload fake PNG
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRfake png content"
    upload_resp = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("diagram.png", io.BytesIO(png_bytes), "image/png")},
        data={"file_type": "architecture_diagram"},
    )
    assert upload_resp.status_code == 201
    artifact_id = upload_resp.json()["id"]

    # 3. Trigger extraction
    extract_resp = client.post(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extraction"
    )
    assert extract_resp.status_code == 200
    data = extract_resp.json()
    assert data["status"] == "skipped_unsupported_type"
    assert data["word_count"] == 0
    assert "OCR and archive unpacking are intentionally not performed" in data["error_message"]

    # 4. Attempt to stream extracted text should return 400
    text_resp = client.get(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extracted-text"
    )
    assert text_resp.status_code == 400


def test_batch_extract_documents(client, db_session):
    # 1. Create project
    proj_resp = client.post(
        "/api/projects",
        json={
            "title": "Batch Project",
            "problem_statement": "Batch processing.",
            "description": "Multiple files.",
        },
    )
    project_id = proj_resp.json()["id"]

    # 2. Upload TXT, MD, and PNG
    client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("doc1.txt", io.BytesIO(b"Document 1 text content"), "text/plain")},
        data={"file_type": "report"},
    )
    client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("doc2.md", io.BytesIO(b"# Doc 2\nDocument 2 markdown"), "text/markdown")},
        data={"file_type": "report"},
    )
    client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("image.jpg", io.BytesIO(b"\xff\xd8\xfffake jpg"), "image/jpeg")},
        data={"file_type": "architecture_diagram"},
    )

    # 3. Run batch extraction
    batch_resp = client.post(f"/api/projects/{project_id}/documents/extract")
    assert batch_resp.status_code == 200
    batch_data = batch_resp.json()
    assert batch_data["total_processed"] == 3
    assert batch_data["completed_count"] == 2
    assert batch_data["skipped_count"] == 1
    assert batch_data["failed_count"] == 0

    # 4. List extractions
    list_resp = client.get(f"/api/projects/{project_id}/documents/extractions")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 3


def test_extraction_cross_project_isolation(client, db_session):
    # Project A
    p1 = client.post(
        "/api/projects",
        json={"title": "Project One", "problem_statement": "Problem 1 details here", "description": "Description 1 details here"},
    ).json()["id"]

    art1 = client.post(
        f"/api/projects/{p1}/artifacts",
        files={"file": ("p1.txt", io.BytesIO(b"P1 private text"), "text/plain")},
    ).json()["id"]

    # Project B
    p2 = client.post(
        "/api/projects",
        json={"title": "Project Two", "problem_statement": "Problem 2 details here", "description": "Description 2 details here"},
    ).json()["id"]

    # Attempt to extract P1's artifact via P2 endpoint
    bad_extract = client.post(f"/api/projects/{p2}/artifacts/{art1}/extraction")
    assert bad_extract.status_code == 404

    # Attempt to get P1's extraction via P2 endpoint
    bad_get = client.get(f"/api/projects/{p2}/artifacts/{art1}/extraction")
    assert bad_get.status_code == 404


def test_filesystem_lifecycle_on_deletion(client, db_session, temp_storage):
    """Verify that deleting an artifact or project physically removes both raw and processed disk files."""
    # 1. Create project & artifact
    proj_resp = client.post(
        "/api/projects",
        json={"title": "Lifecycle Test", "problem_statement": "Lifecycle testing problem", "description": "Lifecycle testing description"},
    )
    assert proj_resp.status_code == 201
    project_id = uuid.UUID(proj_resp.json()["id"])

    upload_resp = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("lifecycle.txt", io.BytesIO(b"Lifecycle text content"), "text/plain")},
    )
    artifact_id = uuid.UUID(upload_resp.json()["id"])
    stored_filename = upload_resp.json()["stored_filename"]

    # 2. Trigger extraction to create processed text file
    extract_resp = client.post(
        f"/api/projects/{project_id}/artifacts/{artifact_id}/extraction"
    )
    assert extract_resp.status_code == 200

    # Verify physical files exist on disk
    raw_path = temp_storage.get_file_path(project_id, stored_filename)
    proc_path = temp_storage.get_processed_text_path(project_id, artifact_id)
    assert raw_path.exists()
    assert proc_path.exists()

    # 3. Delete artifact via service
    del_success = ProjectService.delete_artifact(db_session, project_id, artifact_id)
    assert del_success is True

    # Verify raw and processed files are deleted from disk
    assert not raw_path.exists()
    assert not proc_path.exists()

    # 4. Now test project deletion
    # Upload another artifact and extract
    art2_resp = client.post(
        f"/api/projects/{project_id}/artifacts",
        files={"file": ("another.txt", io.BytesIO(b"Another text content"), "text/plain")},
    )
    art2_id = uuid.UUID(art2_resp.json()["id"])
    client.post(f"/api/projects/{project_id}/artifacts/{art2_id}/extraction")

    project_raw_dir = temp_storage.get_project_dir(project_id)
    project_proc_dir = temp_storage.get_processed_project_dir(project_id)
    assert project_raw_dir.exists()
    assert project_proc_dir.exists()

    # Delete project via service
    proj_del_success = ProjectService.delete_project(db_session, project_id)
    assert proj_del_success is True

    # Verify entire project directories are removed
    assert not project_raw_dir.exists()
    assert not project_proc_dir.exists()
