import threading
import uuid
from typing import List, Optional, Set, Tuple
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.project import Project
from app.models.github_repository import GitHubRepository, RepositorySnapshot
from app.models.requirement import Requirement
from app.models.finding import Finding
from app.models.ai_analysis import AIAnalysis
from app.schemas.ai_analysis import (
    AIAnalysisResult,
    AIAnalysisResponse,
    AIAnalysisSummaryItem,
)
from app.services.analysis.ai_evidence_builder import AIEvidencePackageBuilder
from app.services.analysis.ai_evidence_selector import AIEvidenceSelector
from app.services.analysis.evidence_hasher import compute_evidence_hash
from app.services.analysis.citation_validator import CitationValidator
from app.services.ai.base import BaseAIProvider
from app.services.ai.gemini_client import GeminiProvider, PROMPT_VERSION_V1
from app.services.ai.factory import get_configured_ai_provider


class AIAnalysisService:
    """Orchestrates evidence packaging, canonical hashing, caching, reasoning, and persistence."""

    _ACTIVE_RETRIES: Set[uuid.UUID] = set()
    _RETRY_LOCK = threading.Lock()

    @classmethod
    def get_analysis(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> AIAnalysisResponse:
        """Retrieve the latest persisted AI analysis for a project and snapshot (strictly read-only)."""
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        snapshot = AIEvidencePackageBuilder.resolve_snapshot(db, project_id, snapshot_id)

        stmt = (
            sa.select(AIAnalysis)
            .where(
                AIAnalysis.project_id == project_id,
                AIAnalysis.status == "completed",
            )
        )
        if snapshot_id:
            if not snapshot:
                raise ValueError(f"Snapshot '{snapshot_id}' not found for project '{project_id}'.")
            stmt = stmt.where(AIAnalysis.snapshot_id == snapshot.id)
        elif snapshot:
            stmt = stmt.where(
                sa.or_(AIAnalysis.snapshot_id == snapshot.id, AIAnalysis.snapshot_id.is_(None))
            )

        stmt = stmt.order_by(AIAnalysis.created_at.desc())
        analysis = db.scalars(stmt).first()

        if analysis:
            result_obj = None
            if analysis.structured_result:
                result_obj = AIAnalysisResult.model_validate(analysis.structured_result)

            return AIAnalysisResponse(
                id=analysis.id,
                project_id=analysis.project_id,
                snapshot_id=analysis.snapshot_id,
                commit_sha=analysis.commit_sha,
                status=analysis.status,
                model_provider=analysis.model_provider,
                model_name=analysis.model_name,
                prompt_version=analysis.prompt_version,
                evidence_hash=analysis.evidence_hash,
                analysis_summary=analysis.analysis_summary,
                result=result_obj,
                error_message=analysis.error_message,
                created_at=analysis.created_at,
                updated_at=analysis.updated_at,
            )

        # No analysis completed yet — check if evidence exists
        has_requirements = (
            db.scalar(
                sa.select(sa.func.count(Requirement.id)).where(
                    Requirement.project_id == project_id
                )
            )
            > 0
        )
        has_repo = (
            db.scalar(
                sa.select(sa.func.count(GitHubRepository.id)).where(
                    GitHubRepository.project_id == project_id
                )
            )
            > 0
        )

        if not has_requirements and not has_repo:
            return AIAnalysisResponse(
                project_id=project.id,
                snapshot_id=snapshot.id if snapshot else None,
                commit_sha=snapshot.commit_sha if snapshot else None,
                status="not_enough_evidence_yet",
                analysis_summary=(
                    "Project Doctor needs specifications and repository evidence before performing AI evaluation. "
                    "Upload project documents, extract requirements, or connect a GitHub repository."
                ),
            )

        return AIAnalysisResponse(
            project_id=project.id,
            snapshot_id=snapshot.id if snapshot else None,
            commit_sha=snapshot.commit_sha if snapshot else None,
            status="not_analyzed",
            analysis_summary=(
                "AI reasoning has not been generated for this project yet. "
                "Trigger generation via POST /ai-analysis/generate."
            ),
        )

    @classmethod
    def generate_analysis(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
        force: bool = False,
        provider: Optional[BaseAIProvider] = None,
        prompt_version: str = PROMPT_VERSION_V1,
    ) -> Tuple[AIAnalysisResponse, bool]:
        """
        Explicitly generate or retrieve cached AI project evaluation.

        Returns (AIAnalysisResponse, is_cached: bool).
        """
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        snapshot = AIEvidencePackageBuilder.resolve_snapshot(db, project_id, snapshot_id)

        # 1. Pre-flight evidence check
        has_requirements = (
            db.scalar(
                sa.select(sa.func.count(Requirement.id)).where(
                    Requirement.project_id == project_id
                )
            )
            > 0
        )
        has_repo = (
            db.scalar(
                sa.select(sa.func.count(GitHubRepository.id)).where(
                    GitHubRepository.project_id == project_id
                )
            )
            > 0
        )

        if not has_requirements and not has_repo:
            return (
                AIAnalysisResponse(
                    project_id=project.id,
                    snapshot_id=snapshot.id if snapshot else None,
                    commit_sha=snapshot.commit_sha if snapshot else None,
                    status="not_enough_evidence_yet",
                    analysis_summary=(
                        "Insufficient project evidence to run AI reasoning. "
                        "Upload requirements or connect a repository first."
                    ),
                ),
                False,
            )

        # 2. Build canonical evidence package
        evidence_package = AIEvidencePackageBuilder.build_package(
            db, project_id, snapshot.id if snapshot else None
        )

        # 3. Compute deterministic evidence hash
        ev_hash = compute_evidence_hash(evidence_package, prompt_version)

        # 4. Check cache if force=False
        if not force:
            cache_stmt = (
                sa.select(AIAnalysis)
                .where(
                    AIAnalysis.project_id == project_id,
                    AIAnalysis.evidence_hash == ev_hash,
                    AIAnalysis.prompt_version == prompt_version,
                    AIAnalysis.status == "completed",
                )
            )
            if snapshot:
                cache_stmt = cache_stmt.where(AIAnalysis.snapshot_id == snapshot.id)
            else:
                cache_stmt = cache_stmt.where(AIAnalysis.snapshot_id.is_(None))

            cached_analysis = db.scalars(cache_stmt).first()
            if cached_analysis:
                result_obj = None
                if cached_analysis.structured_result:
                    result_obj = AIAnalysisResult.model_validate(
                        cached_analysis.structured_result
                    )
                return (
                    AIAnalysisResponse(
                        id=cached_analysis.id,
                        project_id=cached_analysis.project_id,
                        snapshot_id=cached_analysis.snapshot_id,
                        commit_sha=cached_analysis.commit_sha,
                        status=cached_analysis.status,
                        model_provider=cached_analysis.model_provider,
                        model_name=cached_analysis.model_name,
                        prompt_version=cached_analysis.prompt_version,
                        evidence_hash=cached_analysis.evidence_hash,
                        analysis_summary=cached_analysis.analysis_summary,
                        result=result_obj,
                        error_message=cached_analysis.error_message,
                        created_at=cached_analysis.created_at,
                        updated_at=cached_analysis.updated_at,
                    ),
                    True,
                )

        # 5. Bound evidence package within configured AI input budget
        bounded_evidence = AIEvidenceSelector.select_bounded_evidence(
            evidence=evidence_package,
            max_input_tokens=settings.AI_INPUT_MAX_TOKENS,
        )

        # 6. Invoke provider reasoning with bounded evidence
        active_provider = provider or get_configured_ai_provider()
        ai_result = active_provider.analyze_project(
            evidence=bounded_evidence,
            prompt_version=prompt_version,
        )

        # 7. Validate citation integrity against the actual bounded evidence package
        CitationValidator.validate_citation_integrity(ai_result, bounded_evidence)

        succeeded_model = (
            getattr(active_provider, "last_succeeded_model", None)
            or getattr(active_provider, "model_name", None)
            or "unknown"
        )

        new_analysis = AIAnalysis(
            project_id=project_id,
            snapshot_id=snapshot.id if snapshot else None,
            commit_sha=snapshot.commit_sha if snapshot else None,
            status="completed",
            model_provider=getattr(active_provider, "provider_name", "gemini"),
            model_name=succeeded_model,
            prompt_version=prompt_version,
            evidence_hash=ev_hash,
            analysis_summary=ai_result.analysis_summary,
            structured_result=ai_result.model_dump(mode="json"),
            error_message=None,
        )

        db.add(new_analysis)
        db.commit()
        db.refresh(new_analysis)

        return (
            AIAnalysisResponse(
                id=new_analysis.id,
                project_id=new_analysis.project_id,
                snapshot_id=new_analysis.snapshot_id,
                commit_sha=new_analysis.commit_sha,
                status=new_analysis.status,
                model_provider=new_analysis.model_provider,
                model_name=new_analysis.model_name,
                prompt_version=new_analysis.prompt_version,
                evidence_hash=new_analysis.evidence_hash,
                analysis_summary=new_analysis.analysis_summary,
                result=ai_result,
                created_at=new_analysis.created_at,
                updated_at=new_analysis.updated_at,
            ),
            False,
        )

    @classmethod
    def get_analysis_by_id(
        cls,
        db: Session,
        project_id: uuid.UUID,
        analysis_id: uuid.UUID,
    ) -> AIAnalysisResponse:
        """Fetch a specific historical analysis run with strict project boundary checks."""
        stmt = sa.select(AIAnalysis).where(
            AIAnalysis.id == analysis_id,
            AIAnalysis.project_id == project_id,
        )
        analysis = db.scalars(stmt).first()
        if not analysis:
            raise ValueError(
                f"AI analysis '{analysis_id}' not found for project '{project_id}'."
            )

        result_obj = None
        if analysis.structured_result:
            result_obj = AIAnalysisResult.model_validate(analysis.structured_result)

        return AIAnalysisResponse(
            id=analysis.id,
            project_id=analysis.project_id,
            snapshot_id=analysis.snapshot_id,
            commit_sha=analysis.commit_sha,
            status=analysis.status,
            model_provider=analysis.model_provider,
            model_name=analysis.model_name,
            prompt_version=analysis.prompt_version,
            evidence_hash=analysis.evidence_hash,
            analysis_summary=analysis.analysis_summary,
            result=result_obj,
            error_message=analysis.error_message,
            created_at=analysis.created_at,
            updated_at=analysis.updated_at,
        )

    @classmethod
    def list_history(
        cls,
        db: Session,
        project_id: uuid.UUID,
    ) -> List[AIAnalysisSummaryItem]:
        """List past analysis runs for the project."""
        stmt = (
            sa.select(AIAnalysis)
            .where(AIAnalysis.project_id == project_id)
            .order_by(AIAnalysis.created_at.desc())
        )
        records = list(db.scalars(stmt).all())
        return [
            AIAnalysisSummaryItem(
                id=a.id,
                project_id=a.project_id,
                snapshot_id=a.snapshot_id,
                commit_sha=a.commit_sha,
                status=a.status,
                model_name=a.model_name,
                prompt_version=a.prompt_version,
                created_at=a.created_at,
            )
            for a in records
        ]

    @classmethod
    def retry_analysis(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
        provider: Optional[BaseAIProvider] = None,
        prompt_version: str = PROMPT_VERSION_V1,
    ) -> Tuple[AIAnalysisResponse, bool]:
        """
        Explicitly retry only the AI evaluation stage over existing deterministic evidence.
        Prevents duplicate concurrent retries for the same project.
        """
        with cls._RETRY_LOCK:
            if project_id in cls._ACTIVE_RETRIES:
                raise ValueError("An AI evaluation is already actively running for this project.")
            cls._ACTIVE_RETRIES.add(project_id)

        try:
            project = db.get(Project, project_id)
            if not project:
                raise ValueError(f"Project '{project_id}' not found.")

            has_findings = (
                db.scalar(
                    sa.select(sa.func.count(Finding.id)).where(Finding.project_id == project_id)
                )
                > 0
            )
            if not has_findings:
                raise ValueError(
                    "Project Doctor requires deterministic diagnosis findings before running deeper AI evaluation. "
                    "Please run full project analysis first."
                )

            analysis_resp, was_cached = cls.generate_analysis(
                db=db,
                project_id=project_id,
                snapshot_id=snapshot_id,
                force=True,
                provider=provider,
                prompt_version=prompt_version,
            )

            # Update in-memory orchestrator active run if tracked
            from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
            with ProjectAnalysisOrchestrator._LOCK:
                run = ProjectAnalysisOrchestrator._ACTIVE_ANALYSES.get(project_id)
                if run:
                    run["ai_status"] = "completed"

            return analysis_resp, was_cached

        except Exception as exc:
            from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
            with ProjectAnalysisOrchestrator._LOCK:
                run = ProjectAnalysisOrchestrator._ACTIVE_ANALYSES.get(project_id)
                if run:
                    run["ai_status"] = "unavailable"
            raise
        finally:
            with cls._RETRY_LOCK:
                cls._ACTIVE_RETRIES.discard(project_id)
