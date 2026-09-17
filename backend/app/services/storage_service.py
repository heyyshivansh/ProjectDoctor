import os
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from fastapi import UploadFile

from app.core.config import settings
from app.core.security import (
    sanitize_filename,
    validate_file_extension,
    validate_path_boundary,
    PathTraversalError,
)

CHUNK_SIZE = 1024 * 1024  # 1 MB chunk


class StorageError(Exception):
    """Base exception for storage errors."""

    pass


class FileTooLargeError(StorageError):
    """Raised when an uploaded file exceeds the size quota."""

    pass


class EmptyFileError(StorageError):
    """Raised when an uploaded file is 0 bytes."""

    pass


class UnsupportedFileTypeError(StorageError):
    """Raised when a file extension is not permitted."""

    pass


@dataclass
class StoredFileInfo:
    """Metadata resulting from a successful file write to storage."""

    artifact_id: uuid.UUID
    original_filename: str
    stored_filename: str
    storage_path: str
    file_size_bytes: int
    mime_type: str


class LocalStorageService:
    """Manages secure local storage for project artifacts.

    Note on Starlette/FastAPI multipart handling:
    Starlette's python-multipart parser streams incoming request bodies into a
    SpooledTemporaryFile(max_size=1MB). Content exceeding 1MB is automatically spooled
    to an OS temporary file on disk by Starlette before the endpoint handler is invoked.
    Our chunked copy from file.file to the target path ensures the application layer
    never loads the entire payload into memory, and actively enforces the 25 MB application
    quota, deleting any partial file immediately if the threshold is breached.
    """

    def __init__(self, base_storage_dir: Optional[str] = None):
        self.base_dir = Path(base_storage_dir or settings.STORAGE_LOCAL_DIR).resolve()
        self.max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    def get_project_dir(self, project_id: uuid.UUID) -> Path:
        """Get or create the dedicated storage directory for a specific project."""
        project_dir = self.base_dir / str(project_id)
        # Ensure path stays within base_dir
        validate_path_boundary(self.base_dir, project_dir)
        project_dir.mkdir(parents=True, exist_ok=True)
        return project_dir

    def save_file(
        self,
        project_id: uuid.UUID,
        upload_file: UploadFile,
        original_filename: str,
    ) -> StoredFileInfo:
        """Validate and securely write an uploaded file to the project's directory.

        - Cross-platform sanitizes the filename.
        - Enforces strict extension whitelist.
        - Rejects zero-byte uploads.
        - Streams in 1MB bounded chunks up to MAX_UPLOAD_SIZE_MB.
        - Deletes partial file if size limit is exceeded.
        """
        # 1. Sanitize filename
        clean_filename = sanitize_filename(original_filename)

        # 2. Validate final extension
        try:
            validate_file_extension(clean_filename, settings.ALLOWED_UPLOAD_EXTENSIONS)
        except ValueError as e:
            raise UnsupportedFileTypeError(str(e)) from e

        # 3. Prepare target path
        project_dir = self.get_project_dir(project_id)
        artifact_id = uuid.uuid4()
        stored_filename = f"{artifact_id}_{clean_filename}"
        target_path = project_dir / stored_filename

        # Verify boundary
        validate_path_boundary(project_dir, target_path)

        # 4. Stream copy with byte counting and size boundary
        bytes_written = 0
        try:
            with open(target_path, "wb") as dest:
                while True:
                    chunk = upload_file.file.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    bytes_written += len(chunk)
                    if bytes_written > self.max_bytes:
                        dest.close()
                        self._safe_remove(target_path)
                        raise FileTooLargeError(
                            f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                        )
                    dest.write(chunk)

            # Check for zero-byte file
            if bytes_written == 0:
                self._safe_remove(target_path)
                raise EmptyFileError("Uploaded file is empty (0 bytes).")

        except Exception:
            self._safe_remove(target_path)
            raise

        # Determine relative storage path for DB reference
        relative_storage_path = str(target_path.relative_to(self.base_dir.parent)).replace("\\", "/")

        mime_type = upload_file.content_type or "application/octet-stream"

        return StoredFileInfo(
            artifact_id=artifact_id,
            original_filename=clean_filename,
            stored_filename=stored_filename,
            storage_path=relative_storage_path,
            file_size_bytes=bytes_written,
            mime_type=mime_type,
        )

    def get_file_path(self, project_id: uuid.UUID, stored_filename: str) -> Path:
        """Resolve and validate the canonical path to an existing stored artifact."""
        project_dir = self.get_project_dir(project_id)
        target_path = project_dir / stored_filename

        # Security check: ensure path does not escape project directory
        validated_path = validate_path_boundary(project_dir, target_path)

        if not validated_path.is_file():
            raise FileNotFoundError(f"Artifact file '{stored_filename}' not found on disk.")

        return validated_path

    def delete_file(self, project_id: uuid.UUID, stored_filename: str) -> bool:
        """Delete an artifact file from disk securely."""
        try:
            file_path = self.get_file_path(project_id, stored_filename)
            file_path.unlink(missing_ok=True)
            return True
        except (FileNotFoundError, PathTraversalError):
            return False

    def cleanup_stored_file(self, project_id: uuid.UUID, stored_filename: str) -> None:
        """Transactional cleanup helper when database persistence fails."""
        self.delete_file(project_id, stored_filename)

    def _safe_remove(self, path: Path) -> None:
        """Safely remove a file if it exists."""
        try:
            if path.exists() and path.is_file():
                path.unlink()
        except OSError:
            pass


# Global singleton storage service
storage_service = LocalStorageService()
