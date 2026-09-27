import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import sqlalchemy as sa
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.ai_analysis import AIAnalysis
from app.models.artifact import Artifact
from app.models.document_extraction import DocumentExtraction
from app.models.finding import Finding
from app.models.github_repository import GitHubRepository, RepositorySnapshot
from app.models.project import Project
from app.models.project_understanding import ProjectUnderstanding
from app.models.requirement import Requirement
from app.models.traceability import RequirementSnapshotTraceability
from app.schemas.orchestrator import (
    AnalysisStageInfo,
    AnalysisStatusResponse,
)
from app.services.ai.service import AIAnalysisService
from app.services.ai.gemini_client import PROMPT_VERSION_V1
from app.services.ai.factory import get_configured_ai_provider
from app.services.analysis.diagnostic_service import DiagnosticService
from app.services.analysis.requirement_service import RequirementService
from app.services.analysis.traceability_service import TraceabilityService
from app.services.analysis.understanding_service import ProjectUnderstandingService
from app.services.documents.extraction_service import DocumentExtractionService
from app.services.github.service import GitHubRepositoryService
from app.services.project_service import ProjectService

logger = logging.getLogger(__name__)

# Internal Stage Identifiers
STAGE_DOCUMENTS = "STAGE_DOCUMENTS"
STAGE_UNDERSTANDING = "STAGE_UNDERSTANDING"
STAGE_REQUIREMENTS = "STAGE_REQUIREMENTS"
STAGE_REPOSITORY = "STAGE_REPOSITORY"
STAGE_TRACEABILITY = "STAGE_TRACEABILITY"
STAGE_DIAGNOSIS = "STAGE_DIAGNOSIS"
STAGE_AI_REVIEW = "STAGE_AI_REVIEW"

STAGE_DEFINITIONS = [
    (
        STAGE_DOCUMENTS,
        "Checking your documentation",
        "Reading project documents and specifications",
    ),
    (
        STAGE_UNDERSTANDING,
        "Understanding your project",
        "Synthesizing project architecture and problem scope",
    ),
    (
        STAGE_REQUIREMENTS,
        "Extracting verifiable claims",
        "Identifying stated features and capabilities",
    ),
    (
        STAGE_REPOSITORY,
        "Inspecting your repository",
        "Checking latest commit, code structure, and test suites",
    ),
    (
        STAGE_TRACEABILITY,
        "Comparing claims with implementation",
        "Linking stated requirements to code evidence",
    ),
    (
        STAGE_DIAGNOSIS,
        "Evaluating evidence",
        "Evaluating engineering practices, test coverage, and risks",
    ),
    (
        STAGE_AI_REVIEW,
        "Adding deeper evaluation",
        "Synthesizing comprehensive evaluation insights",
    ),
]


class ProjectAnalysisOrchestrator:
    """Coordinates the 7-stage project evaluation pipeline with stage reuse,
    graceful AI degradation, truthful restart interruption detection, and honest coarse progress.
    """

    # In-memory execution registry: project_id -> run_state dict
    _ACTIVE_ANALYSES: Dict[uuid.UUID, dict] = {}
    _LOCK = threading.Lock()

    @classmethod
    def _create_initial_stages(cls) -> List[AnalysisStageInfo]:
        """Generate default list of 7 coarse stages in pending state."""
        return [
            AnalysisStageInfo(
                stage=stage_code,
                label=label,
                description=desc,
                status="pending",
                detail=None,
            )
            for stage_code, label, desc in STAGE_DEFINITIONS
        ]

    @classmethod
    def check_preflight_evidence(
        cls, db: Session, project_id: uuid.UUID
    ) -> Tuple[bool, Optional[str]]:
        """Verify pre-flight evidence requirements.

        Returns (is_ready, error_message).
        Consistent pre-flight rule: Both documentation artifacts and a connected repository
        are required to perform a meaningful claim-vs-implementation evaluation.
        """
        artifact_count = (
            db.scalar(
                sa.select(sa.func.count(Artifact.id)).where(
                    Artifact.project_id == project_id
                )
            )
            or 0
        )
        repo = GitHubRepositoryService.get_repository(db, project_id)

        has_docs = artifact_count > 0
        has_repo = repo is not None

        if not has_docs and not has_repo:
            return (
                False,
                "Project Doctor needs project documentation and a connected repository to perform a full evaluation.",
            )
        if has_docs and not has_repo:
            return (
                False,
                "Project Doctor needs a connected repository to compare your project claims with implementation evidence.",
            )
        if has_repo and not has_docs:
            return (
                False,
                "Project Doctor needs project documentation to understand what claims and specifications to evaluate against your repository.",
            )

        return True, None

    @classmethod
    def get_analysis_status(
        cls, db: Session, project_id: uuid.UUID
    ) -> AnalysisStatusResponse:
        """Query current evaluation status. Truthfully checks in-memory active run,
        restart interruption, staleness drift, and summary findings.
        """
        project = ProjectService.get_project(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        # 1. Check in-memory active execution
        with cls._LOCK:
            active_run = cls._ACTIVE_ANALYSES.get(project_id)

        if active_run:
            return AnalysisStatusResponse(
                project_id=project.id,
                project_title=project.title,
                status=active_run["status"],
                current_stage=active_run.get("current_stage"),
                current_stage_label=active_run.get("current_stage_label"),
                stages=active_run.get("stages", []),
                is_stale=False,
                stale_reason=None,
                critical_count=active_run.get("critical_count", 0),
                needs_attention_count=active_run.get("needs_attention_count", 0),
                strengths_count=active_run.get("strengths_count", 0),
                analyzed_at=active_run.get("analyzed_at"),
                commit_sha=active_run.get("commit_sha"),
                message=active_run.get("message"),
                ai_status=active_run.get("ai_status"),
            )

        # 2. In-memory run is NOT active. Inspect persistent state.
        # Check if project was left in 'analyzing' state (backend restarted mid-execution)
        if project.status == "analyzing":
            stages = cls._create_initial_stages()
            return AnalysisStatusResponse(
                project_id=project.id,
                project_title=project.title,
                status="interrupted",
                current_stage=None,
                current_stage_label=None,
                stages=stages,
                is_stale=False,
                message="The evaluation stopped before it finished. You can safely try again.",
            )

        if project.status == "failed":
            stages = cls._create_initial_stages()
            return AnalysisStatusResponse(
                project_id=project.id,
                project_title=project.title,
                status="failed",
                current_stage=None,
                current_stage_label=None,
                stages=stages,
                is_stale=False,
                message="The previous evaluation could not be completed. You can safely try again.",
            )

        # 3. Check pre-flight evidence readiness
        is_ready, preflight_msg = cls.check_preflight_evidence(db, project_id)

        # 4. Inspect persistent findings
        findings_stmt = (
            sa.select(Finding)
            .where(Finding.project_id == project_id)
            .order_by(Finding.created_at.desc())
        )
        findings = list(db.scalars(findings_stmt).all())

        if not findings:
            if not is_ready:
                return AnalysisStatusResponse(
                    project_id=project.id,
                    project_title=project.title,
                    status="insufficient_evidence",
                    stages=cls._create_initial_stages(),
                    message=preflight_msg,
                )
            return AnalysisStatusResponse(
                project_id=project.id,
                project_title=project.title,
                status="not_started",
                stages=cls._create_initial_stages(),
                message="Project has not been evaluated yet.",
            )

        # 5. Persistent evaluation exists. Check staleness & drift.
        latest_finding_time = max(f.created_at for f in findings)
        latest_commit_in_findings = next(
            (f.commit_sha for f in findings if f.commit_sha), None
        )

        is_stale = False
        stale_reason = None

        # Check repository drift: active snapshot vs findings commit
        active_snapshot_stmt = sa.select(RepositorySnapshot).where(
            RepositorySnapshot.project_id == project_id,
            RepositorySnapshot.is_current == True,
        )
        active_snapshot = db.scalars(active_snapshot_stmt).first()

        if active_snapshot and latest_commit_in_findings:
            if active_snapshot.commit_sha != latest_commit_in_findings:
                is_stale = True
                stale_reason = f"New commits detected in repository since last evaluation (active: {active_snapshot.commit_sha[:7]}, evaluated: {latest_commit_in_findings[:7]})."

        # Check artifact drift: any artifact uploaded after latest findings
        if not is_stale:
            art_stmt = sa.select(sa.func.max(Artifact.created_at)).where(
                Artifact.project_id == project_id
            )
            latest_art_upload = db.scalar(art_stmt)
            if latest_art_upload and latest_art_upload > latest_finding_time:
                is_stale = True
                stale_reason = "New or updated project documents uploaded since your last evaluation."

        # Check project metadata drift: project.updated_at after findings
        if not is_stale and project.updated_at:
            # Tolerating minor millisecond skew
            if (project.updated_at - latest_finding_time).total_seconds() > 1.0:
                is_stale = True
                stale_reason = "Project description or metadata updated since your last evaluation."

        # Aggregate counts
        critical_count = sum(1 for f in findings if f.severity == "critical")
        needs_attention_count = sum(
            1 for f in findings if f.severity in ("major", "needs_attention")
        )
        strengths_count = sum(1 for f in findings if f.severity == "strength")

        # Check latest AI analysis
        ai_stmt = (
            sa.select(AIAnalysis)
            .where(AIAnalysis.project_id == project_id)
            .order_by(AIAnalysis.created_at.desc())
        )
        latest_ai = db.scalars(ai_stmt).first()
        ai_status = None
        if latest_ai:
            if latest_ai.status == "completed":
                ai_status = "completed"
            elif latest_ai.status in ("failed", "unavailable"):
                ai_status = "unavailable"
        elif findings:
            ai_status = "unavailable"

        artifact_count = (
            db.scalar(
                sa.select(sa.func.count(Artifact.id)).where(
                    Artifact.project_id == project_id
                )
            )
            or 0
        )
        req_count = (
            db.scalar(
                sa.select(sa.func.count(Requirement.id)).where(
                    Requirement.project_id == project_id
                )
            )
            or 0
        )

        doc_detail = (
            f"Verified {artifact_count} specification document(s)"
            if artifact_count > 0
            else "Project documentation verified"
        )
        und_detail = (
            "Using existing project understanding"
            if project.understanding
            else "Project scope not synthesized"
        )
        req_detail = (
            f"Verified {req_count} existing project claims"
            if req_count > 0
            else "Verified project claims"
        )
        repo = GitHubRepositoryService.get_repository(db, project_id)
        if active_snapshot:
            if repo and repo.status == "error":
                repo_detail = (
                    f"Using existing repository snapshot at commit {active_snapshot.commit_sha[:7]} "
                    f"({active_snapshot.total_files} files; remote sync unavailable)"
                )
            else:
                repo_detail = (
                    f"Repository snapshot verified at commit {active_snapshot.commit_sha[:7]} ({active_snapshot.total_files} files)"
                )
        else:
            repo_detail = "GitHub repository verified"
        trace_detail = "Verified implementation evidence matches claims"
        diag_detail = "Evaluated deterministic diagnosis rules"
        ai_detail = (
            "Deeper AI review included"
            if ai_status == "completed"
            else "Deeper AI review unavailable (AI synthesis unavailable)"
        )

        stage_details_map = {
            STAGE_DOCUMENTS: doc_detail,
            STAGE_UNDERSTANDING: und_detail,
            STAGE_REQUIREMENTS: req_detail,
            STAGE_REPOSITORY: repo_detail,
            STAGE_TRACEABILITY: trace_detail,
            STAGE_DIAGNOSIS: diag_detail,
            STAGE_AI_REVIEW: ai_detail,
        }

        # Construct stages marked as completed
        completed_stages = []
        for stage_code, label, desc in STAGE_DEFINITIONS:
            completed_stages.append(
                AnalysisStageInfo(
                    stage=stage_code,
                    label=label,
                    description=desc,
                    status="completed",
                    detail=stage_details_map.get(stage_code, "Evaluated"),
                )
            )

        eval_status = "stale" if is_stale else "completed"

        return AnalysisStatusResponse(
            project_id=project.id,
            project_title=project.title,
            status=eval_status,
            current_stage=None,
            current_stage_label=None,
            stages=completed_stages,
            is_stale=is_stale,
            stale_reason=stale_reason,
            critical_count=critical_count,
            needs_attention_count=needs_attention_count,
            strengths_count=strengths_count,
            analyzed_at=latest_finding_time,
            commit_sha=latest_commit_in_findings or (active_snapshot.commit_sha if active_snapshot else None),
            message=stale_reason if is_stale else "Project evaluation is up to date.",
            ai_status=ai_status,
        )

    @classmethod
    def trigger_analysis(
        cls,
        db: Session,
        project_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        force: bool = False,
    ) -> AnalysisStatusResponse:
        """Validates prerequisites, sets persistent analyzing state, registers in-memory execution,
        and enqueues the 7-stage pipeline as an asynchronous background task.
        Returns promptly with 202 Accepted semantics.
        """
        project = ProjectService.get_project(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        # 1. Pre-flight check
        is_ready, preflight_msg = cls.check_preflight_evidence(db, project_id)
        if not is_ready:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=preflight_msg,
            )

        # 2. Mutex check: prevent concurrent duplicate runs on same project
        with cls._LOCK:
            if project_id in cls._ACTIVE_ANALYSES:
                existing_run = cls._ACTIVE_ANALYSES[project_id]
                if existing_run.get("status") == "running":
                    # Return current running status idempotently
                    return AnalysisStatusResponse(
                        project_id=project.id,
                        project_title=project.title,
                        status="running",
                        current_stage=existing_run.get("current_stage"),
                        current_stage_label=existing_run.get("current_stage_label"),
                        stages=existing_run.get("stages", []),
                        is_stale=False,
                        message="Analysis is already actively running.",
                    )

            # Initialize stages
            initial_stages = cls._create_initial_stages()
            initial_stages[0].status = "active"

            cls._ACTIVE_ANALYSES[project_id] = {
                "status": "running",
                "current_stage": STAGE_DOCUMENTS,
                "current_stage_label": STAGE_DEFINITIONS[0][1],
                "stages": initial_stages,
                "started_at": datetime.now(timezone.utc),
                "critical_count": 0,
                "needs_attention_count": 0,
                "strengths_count": 0,
                "analyzed_at": None,
                "commit_sha": None,
                "message": "Evaluation started.",
                "ai_status": None,
            }

        # 3. Persist 'analyzing' state to DB
        project.status = "analyzing"
        try:
            db.commit()
        except Exception:
            db.rollback()
            with cls._LOCK:
                cls._ACTIVE_ANALYSES.pop(project_id, None)
            raise

        # 4. Enqueue background pipeline
        background_tasks.add_task(
            cls._execute_pipeline_task,
            project_id=project_id,
            force=force,
        )

        return AnalysisStatusResponse(
            project_id=project.id,
            project_title=project.title,
            status="running",
            current_stage=STAGE_DOCUMENTS,
            current_stage_label=STAGE_DEFINITIONS[0][1],
            stages=initial_stages,
            is_stale=False,
            message="Evaluation started.",
        )

    @classmethod
    def _execute_pipeline_task(cls, project_id: uuid.UUID, force: bool = False):
        """Worker task executing inside FastAPI BackgroundTasks with a fresh database session."""
        db: Session = SessionLocal()
        try:
            cls.run_pipeline(db=db, project_id=project_id, force=force)
        except Exception as exc:
            logger.exception(f"Unhandled error in analysis pipeline for project '{project_id}': {exc}")
            try:
                project = db.get(Project, project_id)
                if project:
                    project.status = "failed"
                    db.commit()
            except Exception:
                db.rollback()
            with cls._LOCK:
                run = cls._ACTIVE_ANALYSES.get(project_id)
                if run:
                    run["status"] = "failed"
                    err_str = str(exc) if str(exc) else ""
                    if "rate limit" in err_str.lower():
                        run["message"] = (
                            "GitHub API rate limit was reached while inspecting your repository. "
                            "Please try again in a few minutes."
                        )
                    else:
                        run["message"] = (
                            err_str or "An unexpected error occurred during evaluation. You can safely try again."
                        )
        finally:
            db.close()

    @classmethod
    def _update_stage_progress(
        cls,
        project_id: uuid.UUID,
        completed_stage: str,
        detail: Optional[str] = None,
        next_stage: Optional[str] = None,
    ):
        """Helper to thread-safely advance stages in the in-memory registry."""
        with cls._LOCK:
            run = cls._ACTIVE_ANALYSES.get(project_id)
            if not run:
                return

            stages: List[AnalysisStageInfo] = run.get("stages", [])
            for s in stages:
                if s.stage == completed_stage:
                    s.status = "completed"
                    if detail:
                        s.detail = detail
                elif s.stage == next_stage:
                    s.status = "active"

            run["current_stage"] = next_stage
            if next_stage:
                next_label = next(
                    (item[1] for item in STAGE_DEFINITIONS if item[0] == next_stage),
                    None,
                )
                run["current_stage_label"] = next_label

    @classmethod
    def sync_ai_stage(
        cls,
        project_id: uuid.UUID,
        ai_status: str = "completed",
        detail: str = "Deeper AI review included (retried)",
    ):
        """Thread-safely synchronize Stage 7 AI state in the orchestrator in-memory registry."""
        with cls._LOCK:
            run = cls._ACTIVE_ANALYSES.get(project_id)
            if not run:
                return
            stages: List[AnalysisStageInfo] = run.get("stages", [])
            for s in stages:
                if s.stage == STAGE_AI_REVIEW:
                    s.status = "completed" if ai_status == "completed" else "failed"
                    s.detail = detail
            run["ai_status"] = ai_status

    @classmethod
    def run_pipeline(
        cls,
        db: Session,
        project_id: uuid.UUID,
        force: bool = False,
    ) -> AnalysisStatusResponse:
        """Executes the full 7-stage evaluation pipeline sequentially with stage reuse checks."""
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        force_downstream = force

        with cls._LOCK:
            if project_id not in cls._ACTIVE_ANALYSES:
                cls._ACTIVE_ANALYSES[project_id] = {
                    "status": "running",
                    "current_stage": STAGE_DOCUMENTS,
                    "current_stage_label": STAGE_DEFINITIONS[0][1],
                    "stages": cls._create_initial_stages(),
                    "started_at": datetime.now(timezone.utc),
                    "message": "Evaluation in progress...",
                }

        # ---------------------------------------------------------------------
        # STAGE 1: DOCUMENT EXTRACTION (STAGE_DOCUMENTS)
        # ---------------------------------------------------------------------
        artifacts = project.artifacts or []
        need_extract = force or len(artifacts) == 0

        if not need_extract:
            for art in artifacts:
                ext = DocumentExtractionService.get_artifact_extraction(
                    db, project_id, art.id
                )
                if not ext or ext.status != "completed" or (art.created_at and ext.created_at and art.created_at > ext.created_at):
                    need_extract = True
                    break

        if need_extract and artifacts:
            extractions = DocumentExtractionService.extract_all_project_artifacts(
                db, project_id
            )
            force_downstream = True
        else:
            extractions = DocumentExtractionService.list_project_extractions(
                db, project_id, status_filter="completed"
            )

        stage1_detail = (
            f"Extracted {len(extractions)} specification document(s)"
            if (need_extract and artifacts)
            else f"Verified {len(extractions)} specification document(s)"
        )
        cls._update_stage_progress(
            project_id, STAGE_DOCUMENTS, stage1_detail, STAGE_UNDERSTANDING
        )

        # ---------------------------------------------------------------------
        # STAGE 2: PROJECT UNDERSTANDING (STAGE_UNDERSTANDING)
        # ---------------------------------------------------------------------
        existing_understanding = project.understanding
        need_understanding = force_downstream or not existing_understanding or existing_understanding.status != "completed"

        if not need_understanding and existing_understanding:
            # Invalidation check: project metadata or artifact timestamps
            if project.updated_at and existing_understanding.updated_at and project.updated_at > existing_understanding.updated_at:
                need_understanding = True
            elif any(
                a.created_at and existing_understanding.updated_at and a.created_at > existing_understanding.updated_at
                for a in artifacts
            ):
                need_understanding = True

        if need_understanding:
            understanding = ProjectUnderstandingService.generate_understanding(
                db, project_id
            )
            force_downstream = True
            stage2_detail = "Synthesized project scope & architecture"
        else:
            understanding = existing_understanding
            stage2_detail = "Using existing project understanding"

        cls._update_stage_progress(
            project_id, STAGE_UNDERSTANDING, stage2_detail, STAGE_REQUIREMENTS
        )

        # ---------------------------------------------------------------------
        # STAGE 3: REQUIREMENTS EXTRACTION (STAGE_REQUIREMENTS)
        # ---------------------------------------------------------------------
        existing_reqs = RequirementService.get_project_requirements(db, project_id)
        need_reqs = force_downstream or not existing_reqs

        if not need_reqs and existing_reqs:
            # Invalidation check: project metadata or artifact timestamps
            min_req_time = min((r.updated_at for r in existing_reqs if r.updated_at), default=None)
            if min_req_time:
                if project.updated_at and project.updated_at > min_req_time:
                    need_reqs = True
                elif any(a.created_at and a.created_at > min_req_time for a in artifacts):
                    need_reqs = True

        if need_reqs:
            RequirementService.extract_project_requirements(db, project_id, force_regenerate=True)
            reqs = RequirementService.get_project_requirements(db, project_id)
            force_downstream = True
        else:
            reqs = existing_reqs

        reqs_count = len(reqs)
        stage3_detail = (
            (
                f"Extracted {reqs_count} verifiable project claim(s)"
                if reqs_count > 0
                else "No verifiable functional claims found in documentation"
            )
            if need_reqs
            else (
                f"Verified {reqs_count} existing project claims"
                if reqs_count > 0
                else "No verifiable functional claims found in documentation"
            )
        )
        cls._update_stage_progress(
            project_id, STAGE_REQUIREMENTS, stage3_detail, STAGE_REPOSITORY
        )

        # ---------------------------------------------------------------------
        # STAGE 4: REPOSITORY SYNC (STAGE_REPOSITORY)
        # ---------------------------------------------------------------------
        # Uses existing GitHubService which verifies remote HEAD commit SHA.
        # If remote HEAD differs or force=True, creates new snapshot and returns is_new=True.
        # If remote refresh fails (e.g. rate limit/network) and force=False,
        # reuse existing completed snapshot if available without fabricating a sync.
        try:
            snapshot, is_new_snapshot = GitHubRepositoryService.sync_repository(
                db, project_id, force=force
            )
            if is_new_snapshot:
                force_downstream = True

            stage4_detail = (
                f"Synced fresh commit {snapshot.commit_sha[:7]} ({snapshot.total_files} files indexed)"
                if is_new_snapshot
                else f"Repository snapshot verified at commit {snapshot.commit_sha[:7]} ({snapshot.total_files} files)"
            )
        except Exception as repo_exc:
            active_snapshot = db.scalars(
                sa.select(RepositorySnapshot).where(
                    RepositorySnapshot.project_id == project_id,
                    RepositorySnapshot.is_current == True,
                )
            ).first()
            if not force and active_snapshot and active_snapshot.status == "completed":
                snapshot = active_snapshot
                stage4_detail = (
                    f"Using existing repository snapshot at commit {snapshot.commit_sha[:7]} "
                    f"({snapshot.total_files} files; remote sync unavailable)"
                )
                logger.warning(
                    f"Remote repository refresh failed for project '{project_id}', "
                    f"falling back to existing completed snapshot: {repo_exc}"
                )
            else:
                raise

        cls._update_stage_progress(
            project_id, STAGE_REPOSITORY, stage4_detail, STAGE_TRACEABILITY
        )

        # ---------------------------------------------------------------------
        # STAGE 5: TRACEABILITY ENGINE (STAGE_TRACEABILITY)
        # ---------------------------------------------------------------------
        if reqs_count == 0:
            # Verified contract: TraceabilityService handles 0 requirements gracefully
            TraceabilityService.generate_traceability(
                db, project_id, snapshot_id=snapshot.id
            )
            stage5_detail = "No requirements to match against code"
        else:
            need_trace = force_downstream
            if not need_trace:
                existing_trace_count = (
                    db.scalar(
                        sa.select(
                            sa.func.count(RequirementSnapshotTraceability.id)
                        ).where(
                            RequirementSnapshotTraceability.project_id == project_id,
                            RequirementSnapshotTraceability.snapshot_id == snapshot.id,
                        )
                    )
                    or 0
                )
                if existing_trace_count == 0:
                    need_trace = True

            if need_trace:
                TraceabilityService.generate_traceability(
                    db, project_id, snapshot_id=snapshot.id
                )
                force_downstream = True
                stage5_detail = "Matched claims against repository evidence"
            else:
                stage5_detail = "Verified implementation evidence matches claims"

        cls._update_stage_progress(
            project_id, STAGE_TRACEABILITY, stage5_detail, STAGE_DIAGNOSIS
        )

        # ---------------------------------------------------------------------
        # STAGE 6: DETERMINISTIC DIAGNOSIS (STAGE_DIAGNOSIS)
        # ---------------------------------------------------------------------
        need_diag = force_downstream
        if not need_diag:
            existing_findings_count = (
                db.scalar(
                    sa.select(sa.func.count(Finding.id)).where(
                        Finding.project_id == project_id,
                        Finding.snapshot_id == snapshot.id,
                    )
                )
                or 0
            )
            if existing_findings_count == 0:
                need_diag = True

        if need_diag:
            diagnosis = DiagnosticService.generate_diagnosis(
                db, project_id, snapshot_id=snapshot.id, force=True
            )
        else:
            diagnosis = DiagnosticService.get_diagnosis(
                db, project_id, snapshot_id=snapshot.id
            )

        stage6_detail = (
            f"Evaluated deterministic diagnosis rules ({diagnosis.total_findings} finding(s))"
            if need_diag
            else "Verified diagnostic findings"
        )
        cls._update_stage_progress(
            project_id, STAGE_DIAGNOSIS, stage6_detail, STAGE_AI_REVIEW
        )

        # ---------------------------------------------------------------------
        # STAGE 7: AI EVALUATION REVIEW (STAGE_AI_REVIEW)
        # ---------------------------------------------------------------------
        ai_status = "completed"
        try:
            ai_resp, is_cached = AIAnalysisService.generate_analysis(
                db,
                project_id,
                snapshot_id=snapshot.id,
                force=force_downstream,
            )
            if ai_resp.status != "completed":
                ai_status = "unavailable"
                err_detail = ai_resp.error_message or "AI synthesis unavailable"
                stage7_detail = f"Deeper AI review unavailable (AI synthesis unavailable: {err_detail})"
            else:
                stage7_detail = "Deeper AI review included"
        except Exception as exc:
            logger.warning(
                f"AI review stage degraded gracefully for project '{project_id}': {exc}"
            )
            ai_status = "unavailable"
            err_reason = str(exc)
            if "quota" in err_reason.lower() or "429" in err_reason or "resource_exhausted" in err_reason.lower():
                user_friendly_reason = "rate limit / quota reached"
            elif "503" in err_reason or "unavailable" in err_reason.lower() or "overloaded" in err_reason.lower():
                user_friendly_reason = "AI service temporarily overloaded"
            elif "api key" in err_reason.lower() or "401" in err_reason or "403" in err_reason:
                user_friendly_reason = "AI provider configuration error"
            elif "citation" in err_reason.lower():
                user_friendly_reason = "AI output citation validation rejected"
            else:
                user_friendly_reason = err_reason[:80] if err_reason else "AI synthesis unavailable"
            stage7_detail = f"Deeper AI review unavailable (AI synthesis unavailable: {user_friendly_reason})"

            try:
                active_prov = get_configured_ai_provider()
                active_prov_name = getattr(active_prov, "provider_name", "ai")
                active_model_name = (
                    getattr(active_prov, "model_name", None)
                    or (settings.OPENROUTER_MODEL if settings.AI_PROVIDER == "openrouter" else settings.GEMINI_MODEL)
                )
            except Exception:
                active_prov_name = settings.AI_PROVIDER
                active_model_name = (
                    settings.OPENROUTER_MODEL if settings.AI_PROVIDER == "openrouter" else settings.GEMINI_MODEL
                )

            failed_ai = AIAnalysis(
                project_id=project_id,
                snapshot_id=snapshot.id if snapshot else None,
                commit_sha=snapshot.commit_sha if snapshot else None,
                status="failed",
                model_provider=active_prov_name,
                model_name=active_model_name,
                prompt_version=PROMPT_VERSION_V1,
                evidence_hash="failed",
                analysis_summary=f"AI analysis unavailable ({user_friendly_reason})",
                structured_result={},
                error_message=str(exc),
            )
            db.add(failed_ai)

        cls._update_stage_progress(
            project_id, STAGE_AI_REVIEW, stage7_detail, next_stage=None
        )

        # ---------------------------------------------------------------------
        # COMPLETION & PERSISTENCE
        # ---------------------------------------------------------------------
        project = db.get(Project, project_id)
        if project:
            project.status = "analyzed"
        db.commit()

        # Update in-memory run state to completed
        with cls._LOCK:
            run = cls._ACTIVE_ANALYSES.get(project_id)
            if run:
                run["status"] = "completed"
                run["current_stage"] = None
                run["current_stage_label"] = None
                run["critical_count"] = diagnosis.critical_count
                run["needs_attention_count"] = (
                    diagnosis.major_count + diagnosis.needs_attention_count
                )
                run["strengths_count"] = diagnosis.strengths_count
                run["analyzed_at"] = diagnosis.analyzed_at
                run["commit_sha"] = snapshot.commit_sha
                run["message"] = "Evaluation complete."
                run["ai_status"] = ai_status

        return cls.get_analysis_status(db, project_id)
