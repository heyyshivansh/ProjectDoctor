import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.github_repository import (
    GitHubRepository,
    RepositorySnapshot,
    RepositoryFile,
    RepositoryEvidence,
)
from app.services.github.client import (
    GitHubClient,
    GitHubAPIError,
    GitHubNotFoundError,
    GitHubAuthenticationError,
    GitHubRateLimitError,
    GitHubRepositoryOversizedError,
    parse_github_url,
)

EXTENSION_LANGUAGE_MAP: Dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".hpp": "C++",
    ".cc": "C++",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "SASS",
    ".less": "LESS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".md": "Markdown",
    ".sql": "SQL",
    ".sh": "Shell",
    ".bash": "Shell",
    ".dockerfile": "Dockerfile",
}

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".bmp", ".tiff", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm", ".pyc", ".o",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".flv",
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
}

IGNORED_DIR_PATTERNS = [
    ".git/", "node_modules/", "vendor/", "bower_components/", "pods/",
    ".venv/", "venv/", "env/", "__pycache__/", ".pytest_cache/", ".mypy_cache/",
    "dist/", "build/", "out/", "target/", ".next/", ".nuxt/", "bin/", "obj/",
    ".idea/", ".vscode/",
]

SENSITIVE_FILES = {
    ".env", ".env.local", ".env.production", ".env.development",
    "id_rsa", "id_ed25519", "credentials.json", "service_account.json",
}

MANIFEST_FILENAMES = {
    "package.json", "requirements.txt", "pyproject.toml", "pipfile",
    "cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts",
    "gemfile", "composer.json",
}

CONFIG_FILENAMES = {
    "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    "tsconfig.json", "webpack.config.js", "vite.config.ts", "vite.config.js",
    "alembic.ini", "next.config.js", ".eslintrc.json", ".eslintrc.js",
}

ENTRYPOINT_FILENAMES = {
    "main.py", "app.py", "index.ts", "index.js", "main.go", "main.rs",
    "app.tsx", "app.jsx", "server.js", "server.ts",
}

DOCUMENTATION_FILENAMES = {
    "readme.md", "readme", "contributing.md", "architecture.md", "license",
}

MAX_REPO_SIZE_KB = 200 * 1024  # 200 MB
MAX_TREE_FILES = 5000
MAX_EXTRACTED_FILE_BYTES = 100 * 1024  # 100 KB
MAX_CUMULATIVE_TEXT_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_SNIPPET_LENGTH = 4000


def detect_language(file_path: str) -> Optional[str]:
    """Deterministically detect file language from extension or special filename."""
    name = os.path.basename(file_path).lower()
    if name == "dockerfile":
        return "Dockerfile"
    if name == "makefile":
        return "Makefile"

    _, ext = os.path.splitext(name)
    return EXTENSION_LANGUAGE_MAP.get(ext)


def is_binary_file(file_path: str) -> bool:
    """Deterministically check if file is likely binary based on extension."""
    _, ext = os.path.splitext(file_path.lower())
    return ext in BINARY_EXTENSIONS


def is_ignored_path(file_path: str) -> bool:
    """Check if file resides inside an ignored directory pattern."""
    normalized = file_path.replace("\\", "/").lower()
    return any(pattern in normalized for pattern in IGNORED_DIR_PATTERNS)


def is_sensitive_file(file_path: str) -> bool:
    """Check if filename matches known sensitive credential patterns."""
    name = os.path.basename(file_path).lower()
    if name in SENSITIVE_FILES:
        return True
    if name.startswith(".env"):
        return True
    if name.endswith((".pem", ".key")):
        return True
    return False


def classify_evidence_type(file_path: str) -> Optional[str]:
    """Deterministically classify a file into structured evidence categories."""
    base_name = os.path.basename(file_path).lower()
    norm_path = file_path.replace("\\", "/").lower()

    if base_name in MANIFEST_FILENAMES:
        return "manifest"
    if base_name in CONFIG_FILENAMES:
        return "configuration"
    if base_name in ENTRYPOINT_FILENAMES:
        return "entrypoint"
    if base_name in DOCUMENTATION_FILENAMES or (norm_path.startswith("docs/") and norm_path.endswith(".md")):
        return "documentation"
    if "test_" in base_name or "_test." in base_name or ".spec." in base_name or ".test." in base_name or norm_path.startswith(("tests/", "test/")):
        return "test_suite"

    return None


class GitHubRepositoryService:
    """Service handling GitHub repository association, retrieval, and evidence extraction."""

    @staticmethod
    def connect_repository(
        db: Session,
        project_id: uuid.UUID,
        repo_url: str,
        access_token: Optional[str] = None,
    ) -> GitHubRepository:
        """Associate a GitHub repository with a project, verifying its existence and access."""
        owner, repo_name = parse_github_url(repo_url)

        with GitHubClient(access_token=access_token) as client:
            meta = client.get_repository_metadata(owner, repo_name)

        # Check existing connection
        stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
        repo_record = db.scalars(stmt).first()

        clean_token = access_token.strip() if access_token and access_token.strip() else None

        if repo_record:
            repo_record.repo_url = f"https://github.com/{meta['full_name']}"
            repo_record.owner = meta["owner"]
            repo_record.repo_name = meta["name"]
            repo_record.default_branch = meta["default_branch"]
            repo_record.is_private = meta["is_private"]
            if clean_token is not None:
                repo_record.access_token = clean_token
            repo_record.status = "connected"
            repo_record.error_message = None
        else:
            repo_record = GitHubRepository(
                project_id=project_id,
                repo_url=f"https://github.com/{meta['full_name']}",
                owner=meta["owner"],
                repo_name=meta["name"],
                default_branch=meta["default_branch"],
                is_private=meta["is_private"],
                access_token=clean_token,
                status="connected",
            )
            db.add(repo_record)

        try:
            db.commit()
            db.refresh(repo_record)
        except Exception:
            db.rollback()
            raise

        return repo_record

    @staticmethod
    def get_repository(db: Session, project_id: uuid.UUID) -> Optional[GitHubRepository]:
        """Fetch the connected GitHub repository for a project."""
        stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
        return db.scalars(stmt).first()

    @staticmethod
    def disconnect_repository(db: Session, project_id: uuid.UUID) -> bool:
        """Disconnect repository and cascade delete associated snapshots and evidence."""
        repo = GitHubRepositoryService.get_repository(db, project_id)
        if not repo:
            return False

        db.delete(repo)
        try:
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def sync_repository(
        db: Session,
        project_id: uuid.UUID,
        force: bool = False,
    ) -> Tuple[RepositorySnapshot, bool]:
        """Synchronize repository with remote GitHub state.

        Returns:
            Tuple of (snapshot, is_newly_created).
            If force=False and commit SHA matches active snapshot, is_newly_created=False.
        """
        repo = GitHubRepositoryService.get_repository(db, project_id)
        if not repo:
            raise ValueError(f"No GitHub repository connected for project '{project_id}'.")

        # Current active snapshot
        current_snapshot_stmt = (
            sa.select(RepositorySnapshot)
            .where(
                RepositorySnapshot.repository_id == repo.id,
                RepositorySnapshot.is_current == True,
            )
        )
        current_snapshot = db.scalars(current_snapshot_stmt).first()

        try:
            with GitHubClient(access_token=repo.access_token) as client:
                # 1. Check metadata and size limit
                meta = client.get_repository_metadata(repo.owner, repo.repo_name)
                if meta["size_kb"] > MAX_REPO_SIZE_KB:
                    raise GitHubRepositoryOversizedError(
                        f"Repository size ({meta['size_kb']} KB) exceeds maximum limit ({MAX_REPO_SIZE_KB} KB)."
                    )

                branch = meta["default_branch"]
                repo.default_branch = branch
                repo.is_private = meta["is_private"]

                # 2. Fetch HEAD commit
                commit_info = client.get_latest_commit(repo.owner, repo.repo_name, branch)
                latest_sha = commit_info["sha"]

                # 3. Check for idempotency
                if not force and current_snapshot and current_snapshot.commit_sha == latest_sha and current_snapshot.status == "completed":
                    repo.last_sync_at = datetime.now(timezone.utc)
                    repo.status = "synced"
                    repo.error_message = None
                    db.commit()
                    return current_snapshot, False

                # 4. Ingest new snapshot inside a savepoint
                with db.begin_nested():
                    tree_items = client.get_tree(repo.owner, repo.repo_name, latest_sha)

                    # 5. Create new snapshot entity
                    new_snapshot = RepositorySnapshot(
                        repository_id=repo.id,
                        project_id=project_id,
                        commit_sha=latest_sha,
                        commit_message=commit_info["message"],
                        commit_author=commit_info["author"],
                        commit_date=commit_info["date"],
                        branch=branch,
                        status="completed",
                        is_current=True,
                    )
                    db.add(new_snapshot)
                    db.flush()  # Obtain new_snapshot.id

                    # 6. Process tree nodes & synthesize evidence
                    total_files_count = 0
                    total_size_accumulated = 0
                    cumulative_text_bytes = 0
                    language_counts: Dict[str, int] = {}
                    evidence_items: List[RepositoryEvidence] = []
                    file_records: List[RepositoryFile] = []

                    # Limit tree processing to MAX_TREE_FILES
                    bounded_tree = tree_items[:MAX_TREE_FILES]

                    for item in bounded_tree:
                        if item.get("type") != "blob":
                            continue

                        total_files_count += 1
                        raw_path = item.get("path", "")
                        # Sanitize path to POSIX without ../
                        safe_path = raw_path.replace("\\", "/").strip("/")
                        if ".." in safe_path or safe_path.startswith("/"):
                            continue

                        file_name = os.path.basename(safe_path)
                        _, ext = os.path.splitext(file_name)
                        file_size = item.get("size", 0) or 0
                        total_size_accumulated += file_size
                        blob_sha = item.get("sha", "")

                        lang = detect_language(safe_path)
                        if lang:
                            language_counts[lang] = language_counts.get(lang, 0) + 1

                        is_bin = is_binary_file(safe_path)
                        is_ign = is_ignored_path(safe_path)
                        is_sec = is_sensitive_file(safe_path)

                        content_status = "indexed_metadata_only"
                        if is_sec:
                            content_status = "security_omitted"
                        elif is_bin:
                            content_status = "binary_skipped"
                        elif is_ign:
                            content_status = "ignored_directory"

                        file_rec = RepositoryFile(
                            snapshot_id=new_snapshot.id,
                            project_id=project_id,
                            file_path=safe_path,
                            file_name=file_name,
                            file_extension=ext.lower() if ext else None,
                            language=lang,
                            file_size_bytes=file_size,
                            blob_sha=blob_sha,
                            is_binary=is_bin,
                            is_ignored=is_ign,
                            content_status=content_status,
                        )
                        file_records.append(file_rec)

                        # Evidence Candidate Check
                        ev_type = classify_evidence_type(safe_path)
                        if (
                            ev_type
                            and not is_bin
                            and not is_ign
                            and not is_sec
                            and file_size <= MAX_EXTRACTED_FILE_BYTES
                            and cumulative_text_bytes + file_size <= MAX_CUMULATIVE_TEXT_BYTES
                        ):
                            try:
                                blob_content = client.get_blob_content(repo.owner, repo.repo_name, blob_sha)
                                snippet = blob_content[:MAX_SNIPPET_LENGTH] if blob_content else ""
                                cumulative_text_bytes += len(snippet.encode("utf-8"))

                                line_count = snippet.count("\n") + 1 if snippet else 1
                                evidence_hash = hashlib.sha256(
                                    f"{latest_sha}:{safe_path}:{snippet[:500]}".encode("utf-8")
                                ).hexdigest()

                                ev_record = RepositoryEvidence(
                                    snapshot_id=new_snapshot.id,
                                    project_id=project_id,
                                    commit_sha=latest_sha,
                                    file_path=safe_path,
                                    evidence_type=ev_type,
                                    language=lang,
                                    start_line=1,
                                    end_line=line_count,
                                    content_snippet=snippet,
                                    evidence_hash=evidence_hash,
                                    extraction_method="deterministic_blob_inspection",
                                )
                                evidence_items.append(ev_record)
                            except Exception:
                                # If blob extraction fails for single file, do not abort whole snapshot
                                pass

                    new_snapshot.total_files = total_files_count
                    new_snapshot.total_size_bytes = total_size_accumulated
                    new_snapshot.structure_summary = {
                        "total_files": total_files_count,
                        "total_size_bytes": total_size_accumulated,
                        "languages": language_counts,
                        "evidence_counts": {
                            ev: sum(1 for e in evidence_items if e.evidence_type == ev)
                            for ev in ["manifest", "configuration", "entrypoint", "test_suite", "documentation"]
                        },
                    }

                    # Add files and evidence
                    db.add_all(file_records)
                    db.add_all(evidence_items)

                    # Flip previous current snapshot
                    if current_snapshot:
                        current_snapshot.is_current = False

                repo.last_sync_at = datetime.now(timezone.utc)
                repo.status = "synced"
                repo.error_message = None

                db.commit()
                db.refresh(new_snapshot)
                return new_snapshot, True

        except Exception as exc:
            repo.status = "error"
            repo.error_message = str(exc)
            try:
                db.commit()
            except Exception:
                db.rollback()
            raise


    @staticmethod
    def get_snapshot_files(
        db: Session,
        snapshot_id: uuid.UUID,
        path_prefix: Optional[str] = None,
        extension: Optional[str] = None,
        include_ignored: bool = False,
    ) -> List[RepositoryFile]:
        """Fetch files for a repository snapshot with optional filters."""
        stmt = sa.select(RepositoryFile).where(RepositoryFile.snapshot_id == snapshot_id)

        if not include_ignored:
            stmt = stmt.where(RepositoryFile.is_ignored == False)

        if extension:
            ext = extension.strip().lower()
            if not ext.startswith("."):
                ext = f".{ext}"
            stmt = stmt.where(RepositoryFile.file_extension == ext)

        stmt = stmt.order_by(RepositoryFile.file_path.asc())
        files = list(db.scalars(stmt).all())

        if path_prefix:
            prefix = path_prefix.strip().replace("\\", "/").strip("/")
            files = [f for f in files if f.file_path.startswith(prefix)]

        return files

    @staticmethod
    def get_snapshot_evidence(
        db: Session,
        snapshot_id: uuid.UUID,
        evidence_type: Optional[str] = None,
    ) -> List[RepositoryEvidence]:
        """Fetch structured evidence records for a snapshot."""
        stmt = sa.select(RepositoryEvidence).where(RepositoryEvidence.snapshot_id == snapshot_id)

        if evidence_type:
            stmt = stmt.where(RepositoryEvidence.evidence_type == evidence_type.strip().lower())

        stmt = stmt.order_by(RepositoryEvidence.evidence_type.asc(), RepositoryEvidence.file_path.asc())
        return list(db.scalars(stmt).all())
