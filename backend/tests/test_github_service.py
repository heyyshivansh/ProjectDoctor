import pytest
from app.services.github.client import parse_github_url
from app.services.github.service import (
    detect_language,
    is_binary_file,
    is_ignored_path,
    is_sensitive_file,
    classify_evidence_type,
)


def test_parse_github_url_valid():
    cases = [
        ("https://github.com/owner/repo", ("owner", "repo")),
        ("https://github.com/owner/repo.git", ("owner", "repo")),
        ("https://github.com/owner/repo/", ("owner", "repo")),
        ("https://github.com/facebook/react.git/", ("facebook", "react")),
        ("https://github.com/google-deepmind/antigravity", ("google-deepmind", "antigravity")),
        ("https://github.com/user.name/repo-123_456", ("user.name", "repo-123_456")),
    ]
    for url, expected in cases:
        assert parse_github_url(url) == expected


def test_parse_github_url_invalid():
    invalid_urls = [
        "",
        "   ",
        "https://gitlab.com/owner/repo",
        "https://github.com/owner",
        "https://github.com/owner/repo/pulls",
        "ftp://github.com/owner/repo",
        "not_a_url",
    ]
    for url in invalid_urls:
        with pytest.raises(ValueError):
            parse_github_url(url)


def test_detect_language():
    assert detect_language("backend/app/main.py") == "Python"
    assert detect_language("frontend/src/App.tsx") == "TypeScript"
    assert detect_language("frontend/src/index.ts") == "TypeScript"
    assert detect_language("src/index.js") == "JavaScript"
    assert detect_language("Cargo.toml") == "TOML"
    assert detect_language("Dockerfile") == "Dockerfile"
    assert detect_language("deploy/Dockerfile") == "Dockerfile"
    assert detect_language("Makefile") == "Makefile"
    assert detect_language("README.md") == "Markdown"
    assert detect_language("schema.sql") == "SQL"
    assert detect_language("unknown_binary.xyz123") is None


def test_is_binary_file():
    assert is_binary_file("assets/logo.png") is True
    assert is_binary_file("docs/spec.pdf") is True
    assert is_binary_file("data/archive.zip") is True
    assert is_binary_file("dist/app.exe") is True
    assert is_binary_file("src/main.py") is False
    assert is_binary_file("README.md") is False


def test_is_ignored_path():
    assert is_ignored_path(".git/HEAD") is True
    assert is_ignored_path("node_modules/react/index.js") is True
    assert is_ignored_path(".venv/lib/python3.14/site-packages/os.py") is True
    assert is_ignored_path("dist/bundle.js") is True
    assert is_ignored_path(".idea/workspace.xml") is True
    assert is_ignored_path("backend/app/models.py") is False
    assert is_ignored_path("src/components/Header.tsx") is False


def test_is_sensitive_file():
    assert is_sensitive_file(".env") is True
    assert is_sensitive_file(".env.local") is True
    assert is_sensitive_file("config/.env.production") is True
    assert is_sensitive_file("secrets/id_rsa") is True
    assert is_sensitive_file("cert.pem") is True
    assert is_sensitive_file("server.key") is True
    assert is_sensitive_file("credentials.json") is True
    assert is_sensitive_file("package.json") is False
    assert is_sensitive_file("app.py") is False


def test_classify_evidence_type():
    assert classify_evidence_type("package.json") == "manifest"
    assert classify_evidence_type("backend/requirements.txt") == "manifest"
    assert classify_evidence_type("pyproject.toml") == "manifest"
    assert classify_evidence_type("Cargo.toml") == "manifest"
    assert classify_evidence_type("Dockerfile") == "configuration"
    assert classify_evidence_type("docker-compose.yml") == "configuration"
    assert classify_evidence_type("tsconfig.json") == "configuration"
    assert classify_evidence_type("backend/app/main.py") == "entrypoint"
    assert classify_evidence_type("frontend/src/App.tsx") == "entrypoint"
    assert classify_evidence_type("tests/test_api.py") == "test_suite"
    assert classify_evidence_type("src/utils_test.py") == "test_suite"
    assert classify_evidence_type("src/app.spec.ts") == "test_suite"
    assert classify_evidence_type("README.md") == "documentation"
    assert classify_evidence_type("docs/architecture.md") == "documentation"
    assert classify_evidence_type("src/components/UserCard.tsx") is None
