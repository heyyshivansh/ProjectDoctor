import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.github_repository import GitHubRepository, RepositorySnapshot
from app.services.github.client import (
    GitHubNotFoundError,
    GitHubAuthenticationError,
    GitHubRateLimitError,
    GitHubRepositoryOversizedError,
)


@pytest.fixture
def sample_project(db_session: Session) -> Project:
    project = Project(
        title="Test Doctor Repo Project",
        problem_statement="Testing GitHub repository integration",
        description="A project for validating Checkpoint 5 repository pipelines",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def second_project(db_session: Session) -> Project:
    project = Project(
        title="Second Isolated Project",
        problem_statement="Validating multi-project boundary isolation",
        description="Another project that should not access first project's repository",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def test_connect_repository_success(client: TestClient, sample_project: Project, monkeypatch):
    """Test connecting a valid GitHub repository."""
    def mock_get_metadata(self, owner, repo):
        return {
            "github_id": 123456,
            "owner": owner,
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "description": "Mocked test repo",
            "default_branch": "main",
            "is_private": False,
            "size_kb": 1024,
            "stars_count": 10,
            "forks_count": 2,
            "open_issues_count": 0,
        }

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)

    resp = client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={
            "repo_url": "https://github.com/test-owner/test-repo",
            "access_token": "ghp_secret_token_12345",
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["project_id"] == str(sample_project.id)
    assert data["owner"] == "test-owner"
    assert data["repo_name"] == "test-repo"
    assert data["default_branch"] == "main"
    assert data["status"] == "connected"
    assert data["has_token"] is True
    # Verify raw token is NEVER returned in response
    assert "access_token" not in data
    assert "ghp_secret_token_12345" not in str(data)


def test_connect_repository_invalid_url(client: TestClient, sample_project: Project):
    """Test rejection of malformed or non-GitHub URLs."""
    resp = client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={"repo_url": "https://gitlab.com/owner/repo"},
    )
    assert resp.status_code == 422


def test_connect_repository_not_found(client: TestClient, sample_project: Project, monkeypatch):
    """Test handling of 404 from GitHub."""
    def mock_get_metadata(self, owner, repo):
        raise GitHubNotFoundError("Repository not found on GitHub")

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)

    resp = client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={"repo_url": "https://github.com/nonexistent/repo"},
    )
    assert resp.status_code == 404


def test_connect_repository_unauthorized_private_repo(client: TestClient, sample_project: Project, monkeypatch):
    """Test handling of 401 when private repo token is missing."""
    def mock_get_metadata(self, owner, repo):
        raise GitHubAuthenticationError("Access denied to private repository")

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)

    resp = client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={"repo_url": "https://github.com/private/repo"},
    )
    assert resp.status_code == 401


def test_get_repository_not_connected(client: TestClient, sample_project: Project):
    """Test 404 when querying repository before connection."""
    resp = client.get(f"/api/projects/{sample_project.id}/repository")
    assert resp.status_code == 404


def test_sync_repository_success_and_idempotency(client: TestClient, sample_project: Project, monkeypatch):
    """Test full repository tree synchronization and idempotent re-sync."""
    def mock_get_metadata(self, owner, repo):
        return {
            "github_id": 999,
            "owner": owner,
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "description": "Test Repo",
            "default_branch": "main",
            "is_private": False,
            "size_kb": 2048,
        }

    def mock_get_latest_commit(self, owner, repo, branch):
        return {
            "sha": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
            "message": "Initial commit for evaluation",
            "author": "Test Author",
            "date": datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc),
        }

    def mock_get_tree(self, owner, repo, commit_sha):
        return [
            {"path": "package.json", "type": "blob", "sha": "blob_pkg_1", "size": 350},
            {"path": "Dockerfile", "type": "blob", "sha": "blob_docker_1", "size": 220},
            {"path": "src/index.ts", "type": "blob", "sha": "blob_index_1", "size": 450},
            {"path": "tests/app.spec.ts", "type": "blob", "sha": "blob_test_1", "size": 600},
            {"path": "README.md", "type": "blob", "sha": "blob_readme_1", "size": 800},
            {"path": "assets/logo.png", "type": "blob", "sha": "blob_img_1", "size": 15000},
            {"path": "node_modules/pkg/index.js", "type": "blob", "sha": "blob_vendor_1", "size": 120},
            {"path": ".env", "type": "blob", "sha": "blob_env_1", "size": 40},
            {"path": "src", "type": "tree", "sha": "tree_src_1"},
        ]

    def mock_get_blob_content(self, owner, repo, blob_sha):
        contents = {
            "blob_pkg_1": '{"name": "test-repo", "dependencies": {"react": "^19.0.0"}}',
            "blob_docker_1": "FROM node:20-alpine\nWORKDIR /app\nCMD [\"npm\", \"start\"]",
            "blob_index_1": "import React from 'react';\nconsole.log('Starting app');",
            "blob_test_1": "describe('App', () => { it('renders', () => {}); });",
            "blob_readme_1": "# Test Repo\nThis repository is evaluated by Project Doctor.",
        }
        return contents.get(blob_sha, "sample text content")

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_latest_commit", mock_get_latest_commit)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_tree", mock_get_tree)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_blob_content", mock_get_blob_content)

    # 1. Connect repo
    conn_resp = client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={"repo_url": "https://github.com/test-owner/test-repo"},
    )
    assert conn_resp.status_code == 200

    # 2. First Sync
    sync_resp = client.post(f"/api/projects/{sample_project.id}/repository/sync")
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["status"] == "synced"
    assert "a1b2c3d" in sync_data["message"]
    snapshot = sync_data["snapshot"]
    assert snapshot["commit_sha"] == "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
    assert snapshot["branch"] == "main"
    assert snapshot["is_current"] is True
    assert snapshot["total_files"] == 8  # 8 blobs (tree object excluded)
    assert "languages" in snapshot["structure_summary"]

    # 3. Idempotent Second Sync with same commit SHA
    resync_resp = client.post(f"/api/projects/{sample_project.id}/repository/sync")
    assert resync_resp.status_code == 200
    resync_data = resync_resp.json()
    assert resync_data["status"] == "up_to_date"
    assert resync_data["snapshot"]["id"] == snapshot["id"]

    # 4. Inspect File Tree
    tree_resp = client.get(f"/api/projects/{sample_project.id}/repository/tree")
    assert tree_resp.status_code == 200
    tree_files = tree_resp.json()
    # By default, include_ignored is False, so node_modules is filtered out
    file_paths = [f["file_path"] for f in tree_files]
    assert "package.json" in file_paths
    assert "Dockerfile" in file_paths
    assert "src/index.ts" in file_paths
    assert "node_modules/pkg/index.js" not in file_paths

    # Verify binary file status
    logo_file = next(f for f in tree_files if f["file_path"] == "assets/logo.png")
    assert logo_file["is_binary"] is True
    assert logo_file["content_status"] == "binary_skipped"

    # Verify sensitive file status
    env_file = next(f for f in tree_files if f["file_path"] == ".env")
    assert env_file["content_status"] == "security_omitted"

    # 5. Inspect Structured Evidence
    ev_resp = client.get(f"/api/projects/{sample_project.id}/repository/evidence")
    assert ev_resp.status_code == 200
    evidence_items = ev_resp.json()
    assert len(evidence_items) >= 4  # manifest, config, entrypoint, test_suite, doc
    types = {e["evidence_type"] for e in evidence_items}
    assert "manifest" in types
    assert "configuration" in types
    assert "entrypoint" in types
    assert "test_suite" in types
    assert "documentation" in types


def test_sync_failure_preserves_existing_snapshot(client: TestClient, sample_project: Project, monkeypatch):
    """Test that a sync failure rolls back and keeps previous valid snapshot intact."""
    pid = sample_project.id

    def mock_get_metadata(self, owner, repo):
        return {
            "github_id": 999,
            "owner": owner,
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "default_branch": "main",
            "is_private": False,
            "size_kb": 100,
        }

    def mock_get_latest_commit_valid(self, owner, repo, branch):
        return {
            "sha": "1111111111111111111111111111111111111111",
            "message": "Valid commit",
            "author": "Author",
            "date": datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc),
        }

    def mock_get_tree_valid(self, owner, repo, commit_sha):
        return [{"path": "README.md", "type": "blob", "sha": "blob_readme", "size": 100}]

    def mock_get_blob_content(self, owner, repo, blob_sha):
        return "# Sample Readme"

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_latest_commit", mock_get_latest_commit_valid)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_tree", mock_get_tree_valid)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_blob_content", mock_get_blob_content)

    # 1. Connect and successfully sync first commit
    client.post(
        f"/api/projects/{pid}/repository",
        json={"repo_url": "https://github.com/test-owner/test-repo"},
    )
    first_sync = client.post(f"/api/projects/{pid}/repository/sync")
    assert first_sync.status_code == 200
    first_snapshot_id = first_sync.json()["snapshot"]["id"]

    # 2. Simulate new commit arrival followed by GitHub rate limit error on tree retrieval
    def mock_get_latest_commit_new(self, owner, repo, branch):
        return {
            "sha": "2222222222222222222222222222222222222222",
            "message": "New commit",
            "author": "Author",
            "date": datetime(2026, 9, 19, 13, 0, tzinfo=timezone.utc),
        }

    def mock_get_tree_fail(self, owner, repo, commit_sha):
        raise GitHubRateLimitError("GitHub API rate limit reached.")

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_latest_commit", mock_get_latest_commit_new)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_tree", mock_get_tree_fail)

    # 3. Attempt sync - must return 429
    failed_sync = client.post(f"/api/projects/{pid}/repository/sync")
    assert failed_sync.status_code == 429

    # 4. Verify previous valid snapshot remains active and untouched!
    repo_resp = client.get(f"/api/projects/{pid}/repository")
    assert repo_resp.status_code == 200
    data = repo_resp.json()
    assert data["current_snapshot"]["id"] == first_snapshot_id
    assert data["current_snapshot"]["commit_sha"] == "1111111111111111111111111111111111111111"
    assert data["status"] == "error"
    assert "rate limit" in data["error_message"].lower()



def test_project_isolation(client: TestClient, sample_project: Project, second_project: Project, monkeypatch):
    """Test that Project B cannot access or modify Project A's repository."""
    def mock_get_metadata(self, owner, repo):
        return {
            "github_id": 123,
            "owner": owner,
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "default_branch": "main",
            "is_private": False,
            "size_kb": 50,
        }

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)

    # Connect repo for Project A
    client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={"repo_url": "https://github.com/owner-a/repo-a"},
    )

    # Query Project B repository - must be 404
    resp_b = client.get(f"/api/projects/{second_project.id}/repository")
    assert resp_b.status_code == 404


def test_disconnect_repository(client: TestClient, sample_project: Project, monkeypatch):
    """Test disconnecting repository and verifying cascade deletion."""
    def mock_get_metadata(self, owner, repo):
        return {
            "github_id": 123,
            "owner": owner,
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "default_branch": "main",
            "is_private": False,
            "size_kb": 50,
        }

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repository_metadata", mock_get_metadata)

    client.post(
        f"/api/projects/{sample_project.id}/repository",
        json={"repo_url": "https://github.com/owner/repo"},
    )

    del_resp = client.delete(f"/api/projects/{sample_project.id}/repository")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "disconnected"

    # Subsequent GET returns 404
    assert client.get(f"/api/projects/{sample_project.id}/repository").status_code == 404
