import os
import uuid
from typing import Any, Dict, List, Optional, Set
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.artifact import Artifact
from app.models.project_understanding import ProjectUnderstanding
from app.models.requirement import Requirement
from app.models.github_repository import (
    GitHubRepository,
    RepositorySnapshot,
    RepositoryFile,
)
from app.models.traceability import (
    RequirementSnapshotTraceability,
    RequirementTraceabilityLink,
)
from app.models.finding import Finding
from app.services.github.service import is_sensitive_file
from app.schemas.ai_evidence import (
    AIEvidencePackage,
    AIEvidenceRequirementItem,
    AIEvidenceFindingItem,
    AIEvidenceFileItem,
    AIEvidenceTraceabilityItem,
    AIEvidenceArtifactItem,
)

MAX_SNIPPET_LENGTH = 300
MAX_SNIPPETS_TOTAL = 15
MAX_REQUIREMENTS_COUNT = 25
MAX_TREE_PATHS = 30


class AIEvidencePackageBuilder:
    """Constructs a bounded, structured evidence package from deterministic database records."""

    @classmethod
    def resolve_snapshot(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> Optional[RepositorySnapshot]:
        """Resolve target snapshot (specified or latest current snapshot)."""
        if snapshot_id:
            return db.get(RepositorySnapshot, snapshot_id)

        stmt = (
            sa.select(RepositorySnapshot)
            .where(
                RepositorySnapshot.project_id == project_id,
                RepositorySnapshot.is_current.is_(True),
            )
            .order_by(RepositorySnapshot.created_at.desc())
        )
        return db.scalars(stmt).first()

    @classmethod
    def build_package(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> AIEvidencePackage:
        """
        Assemble a canonical, strictly bounded AIEvidencePackage.

        Sensitive files are guaranteed to have zero code snippet contents sent.
        Snippets are bounded to <= 300 chars, with maximum 15 snippets total.
        """
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        snapshot = cls.resolve_snapshot(db, project_id, snapshot_id)

        # 1. Project Context
        project_context: Dict[str, Any] = {
            "title": (project.title or "").strip(),
            "problem_statement": (project.problem_statement or "").strip()[:1000],
            "description": (project.description or "").strip()[:1500],
            "tech_stack": project.tech_stack or [],
            "architecture_summary": (project.architecture_summary or "").strip()[:1000],
            "declared_requirements": (project.requirements or "").strip()[:1000],
        }

        # 2. Artifacts
        artifact_stmt = (
            sa.select(Artifact)
            .where(Artifact.project_id == project_id)
            .order_by(Artifact.original_filename.asc())
        )
        artifacts_db = list(db.scalars(artifact_stmt).all())
        evidence_artifacts: List[AIEvidenceArtifactItem] = [
            AIEvidenceArtifactItem(
                id=a.id,
                filename=a.original_filename,
                artifact_type=a.file_type,
            )
            for a in artifacts_db
        ]

        # 3. Document Understanding (11 dimensions)
        doc_understanding: Optional[Dict[str, Any]] = None
        understanding_stmt = sa.select(ProjectUnderstanding).where(
            ProjectUnderstanding.project_id == project_id
        )
        u = db.scalars(understanding_stmt).first()
        if u and u.status == "completed":
            doc_understanding = {
                "problem": (u.problem or "")[:500],
                "target_users": u.target_users or [],
                "objectives": (u.objectives or [])[:5],
                "requirements_summary": (u.requirements_summary or "")[:500],
                "modules": (u.modules or [])[:8],
                "tech_stack": u.tech_stack or [],
                "architecture_overview": (u.architecture_overview or "")[:500],
                "dependencies": (u.dependencies or [])[:10],
                "expected_scale": (u.expected_scale or "")[:200],
                "deployment": (u.deployment or "")[:200],
                "team": (u.team or [])[:5],
                "source_artifact_ids": u.source_artifact_ids or [],
            }

        # 4. Traceability Records Map
        trace_by_req_id: Dict[uuid.UUID, RequirementSnapshotTraceability] = {}
        trace_items: List[AIEvidenceTraceabilityItem] = []
        snippets_collected: List[Dict[str, Any]] = []

        if snapshot:
            trace_stmt = (
                sa.select(RequirementSnapshotTraceability)
                .where(
                    RequirementSnapshotTraceability.snapshot_id == snapshot.id,
                    RequirementSnapshotTraceability.project_id == project_id,
                )
                .order_by(RequirementSnapshotTraceability.created_at.asc())
            )
            traces = list(db.scalars(trace_stmt).all())

            for tr in traces:
                trace_by_req_id[tr.requirement_id] = tr
                candidate_paths = [link.file_path for link in tr.links[:3]]
                trace_items.append(
                    AIEvidenceTraceabilityItem(
                        id=tr.id,
                        requirement_id="",  # Populated after requirement join
                        status=tr.status,
                        implementation_count=tr.implementation_count,
                        test_count=tr.test_count,
                        candidate_files=candidate_paths,
                    )
                )

                # Bounded snippet collection from non-sensitive candidate links
                for link in tr.links:
                    if len(snippets_collected) >= MAX_SNIPPETS_TOTAL:
                        break
                    if not link.code_snippet:
                        continue

                    # Check sensitivity
                    if is_sensitive_file(link.file_path):
                        continue

                    snippets_collected.append(
                        {
                            "traceability_id": str(tr.id),
                            "file_path": link.file_path,
                            "line_start": link.line_start,
                            "line_end": link.line_end,
                            "snippet": link.code_snippet.strip()[:MAX_SNIPPET_LENGTH],
                            "evidence_type": link.evidence_type,
                            "match_confidence": round(link.match_confidence, 2),
                        }
                    )

        # 5. Requirements
        req_stmt = (
            sa.select(Requirement)
            .where(Requirement.project_id == project_id)
            .order_by(Requirement.requirement_id.asc())
            .limit(MAX_REQUIREMENTS_COUNT)
        )
        requirements_db = list(db.scalars(req_stmt).all())
        evidence_requirements: List[AIEvidenceRequirementItem] = []

        # Populate requirement_id in trace items
        req_map_by_id = {r.id: r for r in requirements_db}
        for ti in trace_items:
            # Find requirement
            for tr_req_id, tr_obj in trace_by_req_id.items():
                if tr_obj.id == ti.id and tr_req_id in req_map_by_id:
                    ti.requirement_id = req_map_by_id[tr_req_id].requirement_id
                    break

        for r in requirements_db:
            tr = trace_by_req_id.get(r.id)
            candidate_files: List[str] = []
            status = "not_evaluated"
            impl_count = 0
            test_count = 0

            if tr:
                status = tr.status
                impl_count = tr.implementation_count
                test_count = tr.test_count
                candidate_files = [link.file_path for link in tr.links[:3]]

            evidence_requirements.append(
                AIEvidenceRequirementItem(
                    id=r.id,
                    requirement_id=r.requirement_id,
                    title=r.title.strip(),
                    category=r.category,
                    is_ambiguous=r.is_ambiguous,
                    conflict_summary=(r.conflict_summary or "").strip() or None,
                    traceability_status=status,
                    implementation_count=impl_count,
                    test_count=test_count,
                    candidate_files=candidate_files,
                )
            )

        # 6. Repository Summary & Indexed Files
        repo_summary: Optional[Dict[str, Any]] = None
        if snapshot:
            file_stmt = (
                sa.select(RepositoryFile)
                .where(RepositoryFile.snapshot_id == snapshot.id)
                .order_by(RepositoryFile.file_path.asc())
            )
            all_files = list(db.scalars(file_stmt).all())

            indexed_file_items: List[AIEvidenceFileItem] = []
            manifest_paths: List[str] = []
            entrypoint_paths: List[str] = []
            sensitive_paths_detected: List[str] = []
            tree_paths: List[str] = []

            for f in all_files:
                indexed_file_items.append(
                    AIEvidenceFileItem(
                        id=f.id,
                        file_path=f.file_path,
                        evidence_type=f.content_status,
                    )
                )
                tree_paths.append(f.file_path)

                # Check sensitivity
                if is_sensitive_file(f.file_path) or f.content_status == "security_omitted":
                    sensitive_paths_detected.append(f.file_path)
                    continue

                base = os.path.basename(f.file_path).lower()
                if base in {"package.json", "requirements.txt", "pyproject.toml", "cargo.toml", "go.mod"}:
                    manifest_paths.append(f.file_path)
                if base in {"main.py", "app.py", "index.ts", "index.js", "app.tsx", "server.js"}:
                    entrypoint_paths.append(f.file_path)

            structure_summary = snapshot.structure_summary or {}
            evidence_counts = structure_summary.get("evidence_counts", {})

            # Filter directory tree to top levels
            rep_tree = tree_paths[:MAX_TREE_PATHS]

            repo_summary = {
                "snapshot_id": str(snapshot.id),
                "commit_sha": snapshot.commit_sha,
                "branch": snapshot.branch,
                "total_files": snapshot.total_files,
                "total_size_bytes": snapshot.total_size_bytes,
                "evidence_counts": evidence_counts,
                "manifests": manifest_paths,
                "entrypoints": entrypoint_paths,
                "directory_tree": rep_tree,
                "sensitive_files_omitted_count": len(sensitive_paths_detected),
                "sensitive_file_paths": sensitive_paths_detected,
                "all_indexed_files": [
                    item.model_dump(mode="json") for item in indexed_file_items
                ],
            }

        # 7. Traceability Summary Object
        trace_summary: Optional[Dict[str, Any]] = None
        if snapshot and trace_items:
            matched = sum(1 for t in trace_items if "candidate" in t.status)
            unmatched = sum(1 for t in trace_items if t.status == "unmatched")
            ambiguous = sum(1 for t in trace_items if t.status == "ambiguous")

            trace_summary = {
                "total_records": len(trace_items),
                "matched_count": matched,
                "unmatched_count": unmatched,
                "ambiguous_count": ambiguous,
                "items": [t.model_dump(mode="json") for t in trace_items],
                "candidate_snippets": snippets_collected,
            }

        # 8. Diagnostic Findings (CP7)
        finding_stmt = sa.select(Finding).where(Finding.project_id == project_id)
        if snapshot:
            finding_stmt = finding_stmt.where(
                sa.or_(Finding.snapshot_id == snapshot.id, Finding.snapshot_id.is_(None))
            )
        else:
            finding_stmt = finding_stmt.where(Finding.snapshot_id.is_(None))
        finding_stmt = finding_stmt.order_by(Finding.created_at.asc())

        findings_db = list(db.scalars(finding_stmt).all())
        evidence_findings: List[AIEvidenceFindingItem] = [
            AIEvidenceFindingItem(
                finding_id=f.id,
                finding_hash=f.finding_hash,
                finding_type=f.finding_type,
                severity=f.severity,
                title=f.title.strip(),
                summary=f.summary.strip(),
                why_it_matters=f.why_it_matters.strip(),
                suggested_action=f.suggested_action.strip() if f.suggested_action else None,
                evidence_references=f.evidence_references or [],
            )
            for f in findings_db
        ]

        evidence_counts_summary = {
            "requirements_count": len(evidence_requirements),
            "artifacts_count": len(evidence_artifacts),
            "findings_count": len(evidence_findings),
            "total_files": snapshot.total_files if snapshot else 0,
            "has_repository": 1 if snapshot else 0,
        }

        return AIEvidencePackage(
            project_id=project.id,
            project_title=project.title,
            snapshot_id=snapshot.id if snapshot else None,
            commit_sha=snapshot.commit_sha if snapshot else None,
            project_context=project_context,
            document_understanding=doc_understanding,
            artifacts=evidence_artifacts,
            requirements=evidence_requirements,
            repository_summary=repo_summary,
            traceability_summary=trace_summary,
            diagnostic_findings=evidence_findings,
            evidence_counts=evidence_counts_summary,
        )
