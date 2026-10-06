import sqlalchemy as sa
from app.models.defend import DefendSession, DefendQuestion
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.analysis_run import AnalysisRun
from app.models.finding import Finding
from app.models.defend import DefendSession, DefendQuestion

@pytest.fixture
def project_with_analysis(db_session):
    project = Project(
        title="Defend Test Project",
        problem_statement="Problem",
        description="Desc",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # create completed analysis run
    run = AnalysisRun(
        project_id=project.id,
        input_fingerprint="test1234",
        deterministic_status="completed",
        ai_status="completed",
        snapshot_id=None
    )
    db_session.add(run)
    db_session.commit()
    return project, run

def test_defend_session_lifecycle(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis

    # Create a dummy finding so question generation works
    f = Finding(
        project_id=project.id,
        snapshot_id=test_analysis_run.snapshot_id,
        finding_type="architecture",
        severity="needs_attention",
        title="Test finding",
        summary="Test summary",
        why_it_matters="Test reason",
        finding_hash="hash123",
    )
    db_session.add(f)
    db_session.commit()

    monkeypatch.setattr("app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint", lambda *args: "test1234")
    
    class FakeAIProviderSuccess:
        def evaluate_defend_attempt(self, *args, **kwargs):
            return {"feedback": "Good job"}
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderSuccess())

    
    # 1. Start Defend Session
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert "session" in data
    session_id = data["session"]["id"]
    assert len(data["session"]["questions"]) > 0

    question_id = data["session"]["questions"][0]["id"]

    # 2. Get Defend Session
    resp2 = client.get(f"/api/projects/{project.id}/defend/sessions/{session_id}")
    assert resp2.status_code == 200
    assert resp2.json()["id"] == session_id

    # 3. Submit Attempt
    resp3 = client.post(
        f"/api/projects/{project.id}/defend/questions/{question_id}/attempts",
        json={"student_answer": "I fixed it by refactoring."}
    )
    assert resp3.status_code == 200
    attempt_data = resp3.json()
    assert attempt_data["student_answer"] == "I fixed it by refactoring."
    assert "ai_feedback" in attempt_data

def test_defend_session_no_completed_run(client: TestClient, db_session: Session):
    project = Project(
        title="Defend Test Project 2",
        problem_statement="Problem",
        description="Desc",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 400
    assert "No completed deterministic run" in resp.json()["detail"]


def test_defend_session_missing_evidence(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    monkeypatch.setattr("app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint", lambda *args: "test1234")
    # We do NOT create any findings here
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 400
    assert "No usable evidence" in resp.json()["detail"]

def test_defend_session_stale_analysis(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    # mock the fingerprint to simulate a change
    monkeypatch.setattr("app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint", lambda *args: "different_fingerprint_123")
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 409
    assert "changed" in resp.json()["detail"]

def test_defend_session_get_read_only(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    monkeypatch.setattr("app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint", lambda *args: "test1234")
    
    # We must have an active session for it to be retrieved
    session = DefendSession(
        project_id=project.id,
        analysis_run_id=test_analysis_run.id,
        status="active"
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    
    resp = client.get(f"/api/projects/{project.id}/defend/sessions/{session.id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(session.id)
    assert resp.json()["is_stale"] == False

    # if fingerprint is different, is_stale should be True
    # Let's change the fingerprint of the run
    test_analysis_run.input_fingerprint = "outdated_fingerprint"
    db_session.commit()
    
    resp2 = client.get(f"/api/projects/{project.id}/defend/sessions/{session.id}")
    assert resp2.status_code == 200
    assert resp2.json()["is_stale"] == True

def test_defend_session_retry_feedback(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    session = DefendSession(
        project_id=project.id,
        analysis_run_id=test_analysis_run.id,
        status="active"
    )
    db_session.add(session)
    db_session.commit()
    
    question = DefendQuestion(
        session_id=session.id,
        question_text="Why did you do this?",
        evidence_type="finding",
        evidence_id="123",
        evidence_context='{"title": "title", "summary": "sum"}',
        status="unanswered"
    )
    db_session.add(question)
    db_session.commit()
    
    # mock AI provider
    class FakeAIProvider:
        def evaluate_defend_attempt(self, *args, **kwargs):
            raise Exception("AI failed")
    
    fake_provider = FakeAIProvider()
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: fake_provider)
    
    resp = client.post(
        f"/api/projects/{project.id}/defend/questions/{question.id}/attempts",
        json={"student_answer": "My answer"}
    )
    assert resp.status_code == 200
    assert resp.json()["ai_feedback"] is None
    
    attempt_id = resp.json()["id"]
    
    # now let AI succeed
    class FakeAIProviderSuccess:
        def evaluate_defend_attempt(self, *args, **kwargs):
            return {"feedback": "Good job"}
    
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderSuccess())
    
    resp_retry = client.post(f"/api/projects/{project.id}/defend/attempts/{attempt_id}/retry")
    assert resp_retry.status_code == 200
    assert resp_retry.json()["ai_feedback"] == "Good job"

def test_defend_ownership(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    # different project
    p2 = Project(title="p2", problem_statement="p2", description="p2")
    db_session.add(p2)
    db_session.commit()
    db_session.refresh(p2)
    
    session = DefendSession(
        project_id=project.id,
        analysis_run_id=test_analysis_run.id,
        status="active"
    )
    db_session.add(session)
    db_session.commit()
    
    # accessing p1's session under p2's route
    resp = client.get(f"/api/projects/{p2.id}/defend/sessions/{session.id}")
    assert resp.status_code == 404

def test_defend_session_traceability_evidence(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    monkeypatch.setattr("app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint", lambda *args: "test1234")
    
    class FakeAIProviderSuccess:
        def evaluate_defend_attempt(self, *args, **kwargs):
            return {"feedback": "Good job"}
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderSuccess())

    from app.models.requirement import Requirement
    from app.models.traceability import RequirementSnapshotTraceability, RequirementTraceabilityLink
    import uuid

    req = Requirement(project_id=project.id, requirement_id="REQ-001", title="Req 1", description="desc", category="functional", status="extracted", content_hash="123")
    db_session.add(req)
    db_session.flush()

    from app.models.github_repository import GitHubRepository, RepositorySnapshot
    repo = GitHubRepository(project_id=project.id, repo_url="http://a.b", owner="a", repo_name="b", default_branch="main")
    db_session.add(repo)
    db_session.flush()

    snap = RepositorySnapshot(project_id=project.id, repository_id=repo.id, branch="main", commit_sha="abcd", is_current=True, total_files=1)
    db_session.add(snap)
    db_session.flush()

    trace = RequirementSnapshotTraceability(
        project_id=project.id,
        requirement_id=req.id,
        snapshot_id=snap.id,
        commit_sha="abcd"
    )
    db_session.add(trace)
    db_session.flush()

    link = RequirementTraceabilityLink(
        traceability_id=trace.id,
        project_id=project.id,
        requirement_id=req.id,
        snapshot_id=snap.id,
        commit_sha="abcd",
        file_path="src/index.ts",
        is_test_evidence=False,
        match_rationale="Looks good",
        code_snippet="console.log('hi')",
        link_hash="hash_link"
    )
    db_session.add(link)
    
    # mock the snapshot id in run
    test_analysis_run.snapshot_id = snap.id
    db_session.commit()

    # No findings, but we have traceability
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["session"]["questions"]) == 1
    assert data["session"]["questions"][0]["evidence_type"] == "requirement_trace"
    
    import json
    ctx = json.loads(data["session"]["questions"][0]["evidence_context"])
    assert len(ctx["links"]) == 1
    assert ctx["links"][0]["file_path"] == "src/index.ts"
    assert ctx["links"][0]["code_snippet"] == "console.log('hi')"
    assert "Explain how the supplied evidence relates to this requirement and what might remain uncertain" in data["session"]["questions"][0]["question_text"]

def test_defend_session_retry_when_already_successful(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    session = DefendSession(project_id=project.id, analysis_run_id=test_analysis_run.id, status="active")
    db_session.add(session)
    db_session.flush()
    
    question = DefendQuestion(
        session_id=session.id, question_text="Q", evidence_type="finding",
        evidence_id="123", evidence_context="{}", status="answered"
    )
    db_session.add(question)
    db_session.flush()

    from app.models.defend import DefendAttempt
    attempt = DefendAttempt(
        question_id=question.id, student_answer="A", ai_feedback="Good job", is_supported=None
    )
    db_session.add(attempt)
    db_session.commit()

    resp = client.post(f"/api/projects/{project.id}/defend/attempts/{attempt.id}/retry")
    assert resp.status_code == 400
    assert "already available" in resp.json()["detail"]

def test_defend_session_invalid_citation_validation(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    session = DefendSession(project_id=project.id, analysis_run_id=test_analysis_run.id, status="active")
    db_session.add(session)
    db_session.flush()
    
    question = DefendQuestion(
        session_id=session.id, question_text="Q", evidence_type="finding",
        evidence_id="123", evidence_context='{"type": "finding", "id": "valid-id"}', status="unanswered"
    )
    db_session.add(question)
    db_session.commit()
    
    class FakeAIProviderInvalidCitation:
        def evaluate_defend_attempt(self, *args, **kwargs):
            from app.services.ai.base import BaseAIProvider
            return {"feedback": BaseAIProvider.format_defend_feedback(
                {"what_explained_clearly": "exp", "flow_description": "exp", "technical_specificity": "exp", "evidence_support": "unc", "cited_evidence": ["invalid-id"], "next_step": "step"},
                kwargs["evidence_context"]
            )}
            
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderInvalidCitation())
    
    resp = client.post(
        f"/api/projects/{project.id}/defend/questions/{question.id}/attempts",
        json={"student_answer": "My answer"}
    )
    assert resp.status_code == 200
    # Because validation raises ValueError, it should be caught and ai_feedback set to None
    assert resp.json()["ai_feedback"] is None
    
    # Check question state is "answered"
    assert resp.json()["student_answer"] == "My answer"
    # To check question state, get session
    resp_sess = client.get(f"/api/projects/{project.id}/defend/sessions/{session.id}")
    assert resp_sess.json()["questions"][0]["status"] == "answered"

def test_defend_session_malformed_output(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    session = DefendSession(project_id=project.id, analysis_run_id=test_analysis_run.id, status="active")
    db_session.add(session)
    db_session.flush()
    
    question = DefendQuestion(
        session_id=session.id, question_text="Q", evidence_type="finding",
        evidence_id="123", evidence_context='{"type": "finding", "id": "valid-id"}', status="unanswered"
    )
    db_session.add(question)
    db_session.commit()
    
    class FakeAIProviderMalformed:
        def evaluate_defend_attempt(self, *args, **kwargs):
            from app.services.ai.base import BaseAIProvider
            # Missing fields to trigger Pydantic ValidationError
            return {"feedback": BaseAIProvider.format_defend_feedback(
                {"student_explanation": "exp"},
                kwargs["evidence_context"]
            )}
            
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderMalformed())
    
    resp = client.post(
        f"/api/projects/{project.id}/defend/questions/{question.id}/attempts",
        json={"student_answer": "My answer"}
    )
    assert resp.status_code == 200
    assert resp.json()["ai_feedback"] is None

def test_defend_session_neutral_question_phrasing(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    class FakeAIProviderFallback:
        def generate_defend_questions(self, *args, **kwargs):
            raise Exception("Force fallback")
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderFallback())
    
    f = Finding(
        project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture",
        severity="needs_attention", title="Neutral title test", summary="Test summary", why_it_matters="Test reason",
        finding_hash="hash_neutral", evidence_references=[{"file": "main.py"}]
    )
    db_session.add(f)
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    questions = resp.json()["session"]["questions"]
    assert len(questions) > 0
    q_text = questions[0]["question_text"]
    assert "Explain what this evidence shows about the project and what might remain unaddressed" in q_text
    import json
    ctx = json.loads(questions[0]["evidence_context"])
    assert "evidence_references" in ctx
    assert ctx["evidence_references"][0]["file"] == "main.py"

def test_defend_session_finding_citation_validation(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    session = DefendSession(project_id=project.id, analysis_run_id=test_analysis_run.id, status="active")
    db_session.add(session)
    db_session.flush()
    
    context = {
        "type": "finding", 
        "id": "finding-123",
        "evidence_references": [
            {"target_id": "target-456", "target_type": "requirement"}
        ]
    }
    question = DefendQuestion(
        session_id=session.id, question_text="Q", evidence_type="finding",
        evidence_id="finding-123", evidence_context=__import__('json').dumps(context), status="unanswered"
    )
    db_session.add(question)
    db_session.commit()
    
    class FakeAIProviderFindingCitation:
        def evaluate_defend_attempt(self, *args, **kwargs):
            from app.services.ai.base import BaseAIProvider
            # Valid citation using a target_id from evidence_references
            return {"feedback": BaseAIProvider.format_defend_feedback(
                {"what_explained_clearly": "exp", "flow_description": "exp", "technical_specificity": "exp", "evidence_support": "unc", "cited_evidence": ["target-456"], "next_step": "step"},
                kwargs["evidence_context"]
            )}
            
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderFindingCitation())
    
    resp = client.post(
        f"/api/projects/{project.id}/defend/questions/{question.id}/attempts",
        json={"student_answer": "My answer"}
    )
    assert resp.status_code == 200
    assert resp.json()["ai_feedback"] is not None
    assert "target-456" in resp.json()["ai_feedback"]

def test_defend_session_strict_schema_rejection(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    session = DefendSession(project_id=project.id, analysis_run_id=test_analysis_run.id, status="active")
    db_session.add(session)
    db_session.flush()
    
    context = {"type": "finding", "id": "finding-123"}
    question = DefendQuestion(
        session_id=session.id, question_text="Q", evidence_type="finding",
        evidence_id="finding-123", evidence_context=__import__('json').dumps(context), status="unanswered"
    )
    db_session.add(question)
    db_session.commit()
    
    class FakeAIProviderStrictReject:
        def evaluate_defend_attempt(self, *args, **kwargs):
            from app.services.ai.base import BaseAIProvider
            # Include an extra unallowed field
            return {"feedback": BaseAIProvider.format_defend_feedback(
                {"what_explained_clearly": "exp", "flow_description": "exp", "technical_specificity": "exp", "evidence_support": "unc", "cited_evidence": [], "next_step": "step", "extra_field": "bad"},
                kwargs["evidence_context"]
            )}
            
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderStrictReject())
    
    resp = client.post(
        f"/api/projects/{project.id}/defend/questions/{question.id}/attempts",
        json={"student_answer": "My answer"}
    )
    assert resp.status_code == 200
    assert resp.json()["ai_feedback"] is None

def test_defend_session_ai_question_generation_success(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    # Setup some findings and traces
    f = Finding(
        project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture",
        severity="needs_attention", title="Finding 1", summary="Test summary", why_it_matters="Test reason",
        finding_hash="hash_ai_q_1", evidence_references=[{"target_id": "ref-1", "target_type": "code"}]
    )
    db_session.add(f)
    db_session.commit()
    
    class FakeAIProviderSuccessQuestions:
        def evaluate_defend_attempt(self, *args, **kwargs):
            return {"feedback": "None"}
        def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
            from app.services.ai.base import BaseAIProvider
            return BaseAIProvider.parse_and_validate_defend_questions({
                "questions": [
                    {
                        "question_text": "AI Drafted Q1",
                        "evidence_type": "finding",
                        "evidence_id": str(f.id),
                        "cited_ids": ["ref-1"]
                    }
                ]
            }, evidence_package)
            
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderSuccessQuestions())
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["session"]["questions"]) >= 1
    assert any(q["question_text"] == "AI Drafted Q1" for q in data["session"]["questions"])
    
def test_defend_session_ai_question_generation_fallback(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    f = Finding(
        project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture",
        severity="needs_attention", title="Finding Fallback", summary="Test summary", why_it_matters="Test reason",
        finding_hash="hash_ai_q_fallback", evidence_references=[]
    )
    db_session.add(f)
    db_session.commit()
    
    class FakeAIProviderFailingQuestions:
        def evaluate_defend_attempt(self, *args, **kwargs):
            return {"feedback": "None"}
        def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
            # Trigger ValueError intentionally
            from app.services.ai.base import BaseAIProvider
            return BaseAIProvider.parse_and_validate_defend_questions({
                "questions": [
                    {
                        "question_text": "AI Drafted Q1",
                        "evidence_type": "finding",
                        "evidence_id": str(f.id),
                        "cited_ids": ["non-existent-id"]
                    }
                ]
            }, evidence_package)
            
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderFailingQuestions())
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["session"]["questions"]) >= 1
    assert any("The analysis observed 'Finding Fallback'." in q["question_text"] for q in data["session"]["questions"])

def test_defend_session_no_mutation_on_get(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: 'test1234')
    
    f = Finding(
        project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture",
        severity="needs_attention", title="Finding Get", summary="Test summary", why_it_matters="Test reason",
        finding_hash="hash_ai_q_get", evidence_references=[]
    )
    db_session.add(f)
    db_session.commit()
    
    class FakeAIProviderExplode:
        def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
            raise RuntimeError("Should not be called on GET")
    
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderExplode())
    
    # Initial generation via normal provider (we won't patch it for POST)
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    session_id = resp.json()["session"]["id"]

    
    # Now patch and test GET
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: FakeAIProviderExplode())
    resp_get = client.get(f"/api/projects/{project.id}/defend/sessions/{session_id}")
    assert resp_get.status_code == 200
    assert len(resp_get.json()["questions"]) > 0

def test_defend_session_complete_recap(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: test_analysis_run.input_fingerprint)
    
    # ensure no active sessions to avoid 409
    from app.models.finding import Finding
    f = Finding(project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture", severity="needs_attention", title="Test finding", summary="Test summary", why_it_matters="Test reason", finding_hash="hash123")
    db_session.add(f)
    db_session.commit()
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    q_id = resp.json()["session"]["questions"][0]["id"]
    
    client.post(f"/api/projects/{project.id}/defend/questions/{q_id}/attempts", json={"student_answer": "I did this"})
    
    from app.services.ai.mock_provider import MockAIProvider
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data, skipped_count=0):
            return {"project_understanding": "Good job on the recap!"}
    
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())
    
    comp = client.post(f"/api/projects/{project.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert data["status"] == "completed"
    assert "Good job" in data["session_recap"]

def test_defend_session_complete_unanswered(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: test_analysis_run.input_fingerprint)
    
    from app.models.finding import Finding
    f = Finding(project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture", severity="needs_attention", title="Test finding", summary="Test summary", why_it_matters="Test reason", finding_hash="hash123")
    db_session.add(f)
    db_session.commit()
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    
    comp = client.post(f"/api/projects/{project.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert ("An error occurred" in data["session_recap"] or "No questions were answered" in data["session_recap"])

def test_defend_session_skip_question(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: test_analysis_run.input_fingerprint)
    
    # ensure no active sessions to avoid 409
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    from app.models.finding import Finding
    f1 = Finding(project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture", severity="needs_attention", title="Test finding 1", summary="Test summary 1", why_it_matters="Test reason 1", finding_hash="hash1")
    f2 = Finding(project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture", severity="needs_attention", title="Test finding 2", summary="Test summary 2", why_it_matters="Test reason 2", finding_hash="hash2")
    db_session.add_all([f1, f2])
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    questions = resp.json()["session"]["questions"]
    assert len(questions) >= 2
    
    q_id = questions[0]["id"]
    skip_resp = client.post(f"/api/projects/{project.id}/defend/questions/{q_id}/skip")
    assert skip_resp.status_code == 200
    assert skip_resp.json()["status"] == "skipped"
    
    # Complete session
    comp_resp = client.post(f"/api/projects/{project.id}/defend/sessions/{session_id}/complete")
    assert comp_resp.status_code == 200
    recap = comp_resp.json()["session_recap"]
    assert recap is not None
    assert "skipped_count" in recap
    
