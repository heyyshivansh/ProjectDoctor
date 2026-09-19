import base64
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import httpx

from app.core.config import settings


class GitHubAPIError(Exception):
    """Base exception for GitHub API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class GitHubNotFoundError(GitHubAPIError):
    """Raised when a repository, branch, or commit is not found."""

    pass


class GitHubAuthenticationError(GitHubAPIError):
    """Raised when authentication credentials are invalid or missing for a private repo."""

    pass


class GitHubRateLimitError(GitHubAPIError):
    """Raised when GitHub API rate limits are reached."""

    pass


class GitHubRepositoryOversizedError(GitHubAPIError):
    """Raised when repository size exceeds configured limits."""

    pass


GITHUB_URL_PATTERN = re.compile(
    r"^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?\/?$"
)


def parse_github_url(url: str) -> Tuple[str, str]:
    """Parse and validate a GitHub repository URL.

    Returns:
        Tuple of (owner, repo_name)

    Raises:
        ValueError: If the URL is not a valid GitHub repository URL.
    """
    if not url:
        raise ValueError("GitHub repository URL is required.")

    clean_url = url.strip()
    match = GITHUB_URL_PATTERN.match(clean_url)
    if not match:
        raise ValueError(
            f"Invalid GitHub repository URL: '{url}'. Expected format: https://github.com/owner/repo"
        )

    owner = match.group(1)
    repo = match.group(2)
    return owner, repo


class GitHubClient:
    """Synchronous HTTP client for GitHub REST API v3 using httpx."""

    BASE_URL = "https://api.github.com"

    def __init__(self, access_token: Optional[str] = None, timeout_seconds: float = 20.0):
        self.token = access_token or settings.GITHUB_TOKEN
        self.timeout = timeout_seconds

        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ProjectDoctor-EvaluationPlatform",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token.strip()}"

        self.client = httpx.Client(
            base_url=self.BASE_URL,
            headers=headers,
            timeout=self.timeout,
            follow_redirects=True,
        )

    def close(self):
        """Close the underlying httpx client."""
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def _handle_response_error(self, response: httpx.Response, context: str):
        """Translate HTTP status codes to specific GitHub exceptions."""
        remaining = response.headers.get("x-ratelimit-remaining")
        if remaining == "0" or (
            response.status_code == 403 and "rate limit" in response.text.lower()
        ):
            reset_epoch = response.headers.get("x-ratelimit-reset")
            msg = "GitHub API rate limit exceeded."
            if reset_epoch:
                try:
                    reset_time = datetime.fromtimestamp(int(reset_epoch), tz=timezone.utc).isoformat()
                    msg += f" Resets at: {reset_time}"
                except (ValueError, TypeError):
                    pass
            raise GitHubRateLimitError(msg, status_code=429)

        if response.status_code == 404:
            raise GitHubNotFoundError(
                f"GitHub resource not found ({context}): {response.text}",
                status_code=404,
            )
        elif response.status_code in (401, 403):
            raise GitHubAuthenticationError(
                f"GitHub authentication failed or access denied ({context}): {response.text}",
                status_code=response.status_code,
            )
        else:
            raise GitHubAPIError(
                f"GitHub API error ({context}, HTTP {response.status_code}): {response.text}",
                status_code=response.status_code,
            )

    def get_repository_metadata(self, owner: str, repo: str) -> Dict:
        """Fetch repository identity, visibility, size, and default branch."""
        try:
            response = self.client.get(f"/repos/{owner}/{repo}")
        except httpx.RequestError as exc:
            raise GitHubAPIError(f"Network error communicating with GitHub: {str(exc)}") from exc

        if not response.is_success:
            self._handle_response_error(response, f"get_repository {owner}/{repo}")

        data = response.json()
        return {
            "github_id": data.get("id"),
            "owner": data.get("owner", {}).get("login", owner),
            "name": data.get("name", repo),
            "full_name": data.get("full_name", f"{owner}/{repo}"),
            "description": data.get("description"),
            "default_branch": data.get("default_branch", "main"),
            "is_private": data.get("private", False),
            "size_kb": data.get("size", 0),
            "stars_count": data.get("stargazers_count", 0),
            "forks_count": data.get("forks_count", 0),
            "open_issues_count": data.get("open_issues_count", 0),
        }

    def get_latest_commit(self, owner: str, repo: str, branch: str) -> Dict:
        """Fetch HEAD commit information for a specific branch."""
        try:
            response = self.client.get(f"/repos/{owner}/{repo}/commits/{branch}")
        except httpx.RequestError as exc:
            raise GitHubAPIError(f"Network error fetching commit for branch '{branch}': {str(exc)}") from exc

        if not response.is_success:
            self._handle_response_error(response, f"get_latest_commit {owner}/{repo}:{branch}")

        data = response.json()
        commit_data = data.get("commit", {})
        committer = commit_data.get("committer", {}) or commit_data.get("author", {})

        commit_date = None
        date_str = committer.get("date")
        if date_str:
            try:
                commit_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            except ValueError:
                pass

        return {
            "sha": data.get("sha"),
            "message": commit_data.get("message"),
            "author": committer.get("name") or data.get("author", {}).get("login") or "Unknown",
            "date": commit_date,
        }

    def get_tree(self, owner: str, repo: str, commit_sha: str) -> List[Dict]:
        """Fetch the full recursive git tree for a given commit SHA.

        Returns list of tree objects with keys: path, mode, type ('blob'|'tree'), sha, size.
        """
        try:
            response = self.client.get(
                f"/repos/{owner}/{repo}/git/trees/{commit_sha}",
                params={"recursive": "1"},
            )
        except httpx.RequestError as exc:
            raise GitHubAPIError(f"Network error fetching tree for commit '{commit_sha}': {str(exc)}") from exc

        if not response.is_success:
            self._handle_response_error(response, f"get_tree {owner}/{repo}:{commit_sha}")

        data = response.json()
        return data.get("tree", [])

    def get_blob_content(self, owner: str, repo: str, blob_sha: str) -> str:
        """Fetch and decode blob content from GitHub Blobs API."""
        try:
            response = self.client.get(f"/repos/{owner}/{repo}/git/blobs/{blob_sha}")
        except httpx.RequestError as exc:
            raise GitHubAPIError(f"Network error fetching blob '{blob_sha}': {str(exc)}") from exc

        if not response.is_success:
            self._handle_response_error(response, f"get_blob {owner}/{repo}:{blob_sha}")

        data = response.json()
        encoding = data.get("encoding")
        raw_content = data.get("content", "")

        if encoding == "base64":
            try:
                decoded_bytes = base64.b64decode(raw_content)
                return decoded_bytes.decode("utf-8", errors="replace")
            except Exception as e:
                return f"[Failed to decode base64 blob content: {str(e)}]"

        return raw_content
