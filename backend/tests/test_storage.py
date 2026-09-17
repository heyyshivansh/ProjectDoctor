import io
import os
import uuid
import pytest
from pathlib import Path
from fastapi import UploadFile

from app.core.security import (
    sanitize_filename,
    validate_file_extension,
    validate_path_boundary,
    PathTraversalError,
)
from app.services.storage_service import (
    LocalStorageService,
    EmptyFileError,
    FileTooLargeError,
    UnsupportedFileTypeError,
)
from app.core.config import settings


def test_sanitize_filename_cross_platform():
    """Verify filename sanitization strips traversal, null bytes, and unsafe characters."""
    # Unix traversal
    assert sanitize_filename("../../../etc/passwd.pdf") == "passwd.pdf"
    # Windows traversal
    assert sanitize_filename(r"..\..\..\Windows\System32\cmd.exe") == "cmd.exe"
    # Null bytes
    assert sanitize_filename("test\x00file.pdf") == "testfile.pdf"
    # Special characters
    assert sanitize_filename("my report (v1) [final]!.pdf") == "my_report__v1___final__.pdf"
    # Leading/trailing dots and underscores
    assert sanitize_filename("...my_doc.txt...") == "my_doc.txt"


def test_sanitize_empty_filename_fallback():
    """Verify that completely empty or stripped filenames fallback to unnamed_artifact."""
    assert sanitize_filename("") == "unnamed_artifact"
    assert sanitize_filename(".....") == "unnamed_artifact"
    assert sanitize_filename("____") == "unnamed_artifact"


def test_validate_file_extension():
    """Verify strict final-extension validation against whitelist."""
    # Allowed extensions
    for ext in [".pdf", ".png", ".jpg", ".jpeg", ".md", ".txt", ".docx", ".zip"]:
        assert validate_file_extension(f"document{ext}", settings.ALLOWED_UPLOAD_EXTENSIONS) == ext

    # Disallowed executable extensions
    for bad_file in ["script.exe", "install.bat", "run.sh", "exploit.php", "malware.py"]:
        with pytest.raises(ValueError, match="Unsupported file extension"):
            validate_file_extension(bad_file, settings.ALLOWED_UPLOAD_EXTENSIONS)

    # Double extension bypass attack
    with pytest.raises(ValueError, match="Unsupported file extension"):
        validate_file_extension("safe_name.pdf.exe", settings.ALLOWED_UPLOAD_EXTENSIONS)


def test_validate_path_boundary(tmp_path):
    """Verify canonical boundary enforcement prevents traversal out of base directory."""
    base_dir = tmp_path / "storage"
    base_dir.mkdir()

    safe_path = base_dir / "project1" / "file.txt"
    # Canonical validation
    assert validate_path_boundary(base_dir, safe_path) == safe_path.resolve()

    # Traversal attempt
    escape_path = base_dir / ".." / "other" / "secret.txt"
    with pytest.raises(PathTraversalError):
        validate_path_boundary(base_dir, escape_path)


def test_zero_byte_file_rejected(tmp_path):
    """Verify that uploading an empty 0-byte file is rejected and leaves no trace on disk."""
    storage = LocalStorageService(base_storage_dir=str(tmp_path))
    project_id = uuid.uuid4()

    empty_upload = UploadFile(
        file=io.BytesIO(b""),
        filename="empty.pdf",
        headers={"content-type": "application/pdf"},
    )

    with pytest.raises(EmptyFileError, match="empty"):
        storage.save_file(project_id, empty_upload, "empty.pdf")

    # Verify no file remains
    project_dir = tmp_path / str(project_id)
    if project_dir.exists():
        assert len(list(project_dir.iterdir())) == 0


def test_file_size_limit_and_partial_cleanup(tmp_path, monkeypatch):
    """Verify that exceeding size limit aborts and immediately unlinks partial file."""
    storage = LocalStorageService(base_storage_dir=str(tmp_path))
    project_id = uuid.uuid4()

    # Set artificial max limit of 100 bytes for testing
    storage.max_bytes = 100

    oversized_data = b"A" * 200
    oversized_upload = UploadFile(
        file=io.BytesIO(oversized_data),
        filename="oversized.pdf",
        headers={"content-type": "application/pdf"},
    )

    with pytest.raises(FileTooLargeError, match="exceeds limit"):
        storage.save_file(project_id, oversized_upload, "oversized.pdf")

    # Verify partial file is cleaned up and deleted
    project_dir = tmp_path / str(project_id)
    if project_dir.exists():
        assert len(list(project_dir.iterdir())) == 0
