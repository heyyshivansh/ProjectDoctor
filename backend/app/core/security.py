import os
import re
from pathlib import Path
from typing import Set


class PathTraversalError(ValueError):
    """Raised when a path traversal attempt is detected."""

    pass


def sanitize_filename(original_filename: str) -> str:
    """Sanitize user-provided filename across Windows and Unix platforms.

    - Normalizes both backslashes and forward slashes.
    - Strips null bytes and control characters.
    - Replaces non-alphanumeric characters (except safe punctuation: _ . -) with underscore.
    - Strips leading and trailing dots and underscores.
    - Returns 'unnamed_artifact' if the result is empty.
    """
    if not original_filename:
        return "unnamed_artifact"

    # Remove null bytes
    cleaned = original_filename.replace("\x00", "")

    # Normalize backslashes to forward slashes and extract basename
    base_name = cleaned.replace("\\", "/").split("/")[-1].strip()

    # Replace unsafe characters
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)

    # Strip leading/trailing dots and underscores
    safe_name = safe_name.strip("._")

    return safe_name if safe_name else "unnamed_artifact"


def validate_file_extension(filename: str, allowed_extensions: Set[str]) -> str:
    """Extract and validate the final file extension against a whitelist.

    Validates only the true final extension to protect against double-extension bypasses
    (e.g., 'report.pdf.exe').
    """
    clean = sanitize_filename(filename)
    _, ext = os.path.splitext(clean)
    ext_lower = ext.lower()

    if not ext_lower or ext_lower not in allowed_extensions:
        raise ValueError(
            f"Unsupported file extension '{ext_lower or 'none'}'. Allowed: {sorted(allowed_extensions)}"
        )

    return ext_lower


def validate_path_boundary(base_dir: Path | str, target_path: Path | str) -> Path:
    """Verify that target_path resides strictly within base_dir.

    Uses canonical paths to prevent directory traversal and symlink escapes.
    """
    canonical_base = os.path.realpath(str(base_dir))
    canonical_target = os.path.realpath(str(target_path))

    # Ensure canonical_base is the common prefix
    if os.path.commonpath([canonical_base, canonical_target]) != canonical_base:
        raise PathTraversalError(
            f"Access denied: target path '{canonical_target}' escapes base directory '{canonical_base}'."
        )

    return Path(canonical_target)
