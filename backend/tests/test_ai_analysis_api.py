import hashlib
import uuid
import pytest
from app.models.project import Project
from app.models.requirement import Requirement
from app.services.ai.gemini_client import GeminiProvider
from app.api.routes.ai_analysis import get_ai_provider


@pytest.fixture
def project_with_requirements(db_session):
    project = Project(
        title="API Test Project",
        problem_statement="Automated technical analysis.",
        description="Testing AI Analysis API endpoints.",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    req = Requirement(
        project_id=project.id,
        requirement_id="REQ-001",
        title="Diagnostic Engine",
        description="Must provide evidence-backed evaluation.",
        category="functional",
        content_hash=hashlib.sha256(b"REQ-001 API content").hexdigest(),
    )
    db_session.add(req)
    db_session.commit()
    db_session.refresh(project)
    return project


def test_get_ai_analysis_read_only_before_generation(client, project_with_requirements):
    res = client.get(f"/api/projects/{project_with_requirements.id}/ai-analysis")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_analyzed"
    assert data["result"] is None


def test_generate_and_get_ai_analysis(client, project_with_requirements):
    p_id = project_with_requirements.id

    # POST generate
    gen_res = client.post(f"/api/projects/{p_id}/ai-analysis/generate")
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["status"] == "completed"
    assert gen_data["cached"] is False
    assert gen_data["analysis"]["result"] is not None
    analysis_id = gen_data["analysis"]["id"]

    # GET read-only
    get_res = client.get(f"/api/projects/{p_id}/ai-analysis")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == analysis_id
    assert get_data["status"] == "completed"
    assert len(get_data["result"]["observations"]) > 0

    # GET by ID
    get_id_res = client.get(f"/api/projects/{p_id}/ai-analysis/{analysis_id}")
    assert get_id_res.status_code == 200
    assert get_id_res.json()["id"] == analysis_id

    # GET history
    hist_res = client.get(f"/api/projects/{p_id}/ai-analysis/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert len(hist_data) >= 1
    assert hist_data[0]["id"] == analysis_id


def test_tenant_isolation(client, db_session, project_with_requirements):
    p1 = project_with_requirements

    # Create project 2
    p2 = Project(title="Project 2", problem_statement="Problem 2", description="Desc 2")
    db_session.add(p2)
    db_session.commit()
    db_session.refresh(p2)

    # Generate analysis for project 1
    gen_res = client.post(f"/api/projects/{p1.id}/ai-analysis/generate")
    analysis_id = gen_res.json()["analysis"]["id"]

    # Attempt to access project 1's analysis using project 2's ID -> 404
    cross_res = client.get(f"/api/projects/{p2.id}/ai-analysis/{analysis_id}")
    assert cross_res.status_code == 404


def test_missing_gemini_api_key_returns_400(client, project_with_requirements):
    # Override get_ai_provider with GeminiProvider with missing key
    from app.main import app
    app.dependency_overrides[get_ai_provider] = lambda: GeminiProvider(api_key=None)

    try:
        res = client.post(f"/api/projects/{project_with_requirements.id}/ai-analysis/generate")
        assert res.status_code == 400
        assert "Gemini API key is not configured" in res.json()["detail"]
    finally:
        # Restore mock override
        from app.services.ai.mock_provider import MockAIProvider
        app.dependency_overrides[get_ai_provider] = lambda: MockAIProvider()


def test_get_ai_analysis_not_enough_evidence_yet(client, db_session):
    """When a project lacks minimum evidence (no requirements or repo), return 200 with status=not_enough_evidence_yet."""
    bare_project = Project(
        title="Bare Project Without Evidence",
        problem_statement="No requirements or code connected yet.",
        description="Testing not_enough_evidence_yet status.",
    )
    db_session.add(bare_project)
    db_session.commit()
    db_session.refresh(bare_project)

    res = client.get(f"/api/projects/{bare_project.id}/ai-analysis")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_enough_evidence_yet"
    assert data["result"] is None
    assert "needs specifications and repository evidence" in data["analysis_summary"]


def test_get_ai_analysis_non_existent_project_returns_404(client):
    """When project does not exist, GET /ai-analysis must return 404."""
    random_id = uuid.uuid4()
    res = client.get(f"/api/projects/{random_id}/ai-analysis")
    assert res.status_code == 404
    assert f"Project with ID '{random_id}' not found" in res.json()["detail"]


def test_get_ai_analysis_by_id_not_found_returns_404(client, project_with_requirements):
    """When requested specific analysis ID does not exist, return 404."""
    random_id = uuid.uuid4()
    res = client.get(f"/api/projects/{project_with_requirements.id}/ai-analysis/{random_id}")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
