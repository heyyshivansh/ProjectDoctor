import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.requirement import Requirement, RequirementEvidence
from app.models.github_repository import (
    GitHubRepository,
    RepositorySnapshot,
    RepositoryFile,
    RepositoryEvidence,
)
from app.models.traceability import (
    RequirementSnapshotTraceability,
    RequirementTraceabilityLink,
)
from app.models.finding import Finding
from app.schemas.finding import (
    FindingEvidenceReference,
    HydratedEvidenceItem,
    FindingSummaryResponse,
    FindingDetailResponse,
    ProjectDiagnosisResponse,
)

SEVERITY_ORDER = {
    "critical": 0,
    "major": 1,
    "needs_attention": 2,
    "improvement": 3,
    "strength": 4,
}


class DiagnosticService:
    """Deterministic, evidence-backed diagnostic engine for college project evaluation."""

    @classmethod
    def get_diagnosis(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> ProjectDiagnosisResponse:
        """Retrieve the current project diagnosis and prioritized findings (read-only)."""
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        # Determine target snapshot
        snapshot = cls._resolve_snapshot(db, project_id, snapshot_id)

        # Check existing findings
        stmt = sa.select(Finding).where(Finding.project_id == project_id)
        if snapshot:
            stmt = stmt.where(
                sa.or_(Finding.snapshot_id == snapshot.id, Finding.snapshot_id.is_(None))
            )
        else:
            stmt = stmt.where(Finding.snapshot_id.is_(None))

        all_findings = list(db.scalars(stmt).all())

        # Check repository and requirement state
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

        has_traceability = False
        if snapshot:
            has_traceability = (
                db.scalar(
                    sa.select(sa.func.count(RequirementSnapshotTraceability.id)).where(
                        RequirementSnapshotTraceability.snapshot_id == snapshot.id
                    )
                )
                > 0
            )

        # If no findings generated yet, return informative state without mutating
        if not all_findings:
            if not has_repo or not has_requirements:
                return ProjectDiagnosisResponse(
                    project_id=project.id,
                    project_title=project.title,
                    status="not_enough_evidence_yet",
                    status_label="Not Enough Evidence Yet",
                    summary=(
                        "Project Doctor needs project specifications and repository evidence before evaluating health. "
                        "Upload documentation, extract requirements, and connect a GitHub repository to get started."
                    ),
                    snapshot_id=snapshot.id if snapshot else None,
                    commit_sha=snapshot.commit_sha if snapshot else None,
                    analyzed_at=None,
                    total_findings=0,
                    critical_count=0,
                    major_count=0,
                    needs_attention_count=0,
                    improvements_count=0,
                    strengths_count=0,
                    top_findings=[],
                    strengths=[],
                )
            if snapshot and not has_traceability:
                return ProjectDiagnosisResponse(
                    project_id=project.id,
                    project_title=project.title,
                    status="not_enough_evidence_yet",
                    status_label="Traceability Analysis Pending",
                    summary=(
                        f"Repository snapshot at commit {snapshot.commit_sha[:7]} is synced, but requirement traceability "
                        "has not been run yet. Run traceability analysis to generate code evidence before diagnosis."
                    ),
                    snapshot_id=snapshot.id,
                    commit_sha=snapshot.commit_sha,
                    analyzed_at=None,
                    total_findings=0,
                    critical_count=0,
                    major_count=0,
                    needs_attention_count=0,
                    improvements_count=0,
                    strengths_count=0,
                    top_findings=[],
                    strengths=[],
                )

            return ProjectDiagnosisResponse(
                project_id=project.id,
                project_title=project.title,
                status="not_analyzed",
                status_label="Diagnosis Not Generated",
                summary=(
                    "Project Doctor has not diagnosed this project yet. "
                    "Trigger diagnosis generation to evaluate requirements, repository evidence, and code alignment."
                ),
                snapshot_id=snapshot.id if snapshot else None,
                commit_sha=snapshot.commit_sha if snapshot else None,
                analyzed_at=None,
                total_findings=0,
                critical_count=0,
                major_count=0,
                needs_attention_count=0,
                improvements_count=0,
                strengths_count=0,
                top_findings=[],
                strengths=[],
            )

        # Sort findings by severity
        findings_sorted = sorted(
            all_findings,
            key=lambda f: (SEVERITY_ORDER.get(f.severity, 99), f.created_at),
        )

        critical_count = sum(1 for f in all_findings if f.severity == "critical")
        major_count = sum(1 for f in all_findings if f.severity == "major")
        needs_attention_count = sum(1 for f in all_findings if f.severity == "needs_attention")
        improvements_count = sum(1 for f in all_findings if f.severity == "improvement")
        strengths_count = sum(1 for f in all_findings if f.severity == "strength")

        # Determine qualitative status
        if critical_count > 0:
            status = "significant_concern"
            status_label = "Significant Concern"
        elif major_count > 0 or needs_attention_count > 0:
            status = "needs_attention"
            status_label = "Needs Attention"
        else:
            status = "looks_solid"
            status_label = "Looks Solid"

        # Formulate plain-language diagnostic summary
        summary_parts = []
        if snapshot:
            summary_parts.append(
                f"Project Doctor evaluated this project against repository snapshot at commit {snapshot.commit_sha[:7]}."
            )
        else:
            summary_parts.append("Project Doctor evaluated available project specifications.")

        if critical_count > 0:
            summary_parts.append(
                f"Detected {critical_count} critical item(s) that should be addressed immediately before evaluation."
            )
        elif major_count > 0 or needs_attention_count > 0:
            concerns_total = major_count + needs_attention_count
            summary_parts.append(
                f"Identified {concerns_total} issue(s) requiring attention, including requirement or verification gaps."
            )
        else:
            summary_parts.append("Current evidence is consistent with good engineering practices.")

        if strengths_count > 0:
            summary_parts.append(f"Found {strengths_count} positive technical strength(s).")

        summary_text = " ".join(summary_parts)

        latest_analyzed = max((f.updated_at for f in all_findings), default=datetime.now(timezone.utc))

        top_findings_list = [
            FindingSummaryResponse.model_validate(f)
            for f in findings_sorted
            if f.severity != "strength"
        ]
        strengths_list = [
            FindingSummaryResponse.model_validate(f)
            for f in findings_sorted
            if f.severity == "strength"
        ]

        return ProjectDiagnosisResponse(
            project_id=project.id,
            project_title=project.title,
            status=status,
            status_label=status_label,
            summary=summary_text,
            snapshot_id=snapshot.id if snapshot else None,
            commit_sha=snapshot.commit_sha if snapshot else None,
            analyzed_at=latest_analyzed,
            total_findings=len(top_findings_list),
            critical_count=critical_count,
            major_count=major_count,
            needs_attention_count=needs_attention_count,
            improvements_count=improvements_count,
            strengths_count=strengths_count,
            top_findings=top_findings_list,
            strengths=strengths_list,
        )

    @classmethod
    def generate_diagnosis(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
        force: bool = False,
    ) -> ProjectDiagnosisResponse:
        """Run deterministic diagnostic rules over existing evidence and persist findings."""
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        snapshot = cls._resolve_snapshot(db, project_id, snapshot_id)

        # TRACEABILITY GATING:
        # Check if traceability records exist for this snapshot
        has_traceability = False
        traceabilities: List[RequirementSnapshotTraceability] = []
        if snapshot:
            trace_stmt = (
                sa.select(RequirementSnapshotTraceability)
                .where(
                    RequirementSnapshotTraceability.snapshot_id == snapshot.id,
                    RequirementSnapshotTraceability.project_id == project_id,
                )
                .order_by(RequirementSnapshotTraceability.created_at.asc())
            )
            traceabilities = list(db.scalars(trace_stmt).all())
            has_traceability = len(traceabilities) > 0

        # Fetch requirements
        req_stmt = (
            sa.select(Requirement)
            .where(Requirement.project_id == project_id)
            .order_by(Requirement.requirement_id.asc())
        )
        requirements = list(db.scalars(req_stmt).all())

        # Generate findings deterministically
        candidate_findings: List[Finding] = []

        # -------------------------------------------------------------
        # RULES GATED ON TRACEABILITY (RULE-01, RULE-02, RULE-03, RULE-08)
        # -------------------------------------------------------------
        if has_traceability and snapshot:
            req_by_id = {r.id: r for r in requirements}

            for trace in traceabilities:
                req = req_by_id.get(trace.requirement_id)
                if not req:
                    continue

                # RULE-01: Requirement without candidate implementation evidence
                if trace.status == "unmatched":
                    f_hash = hashlib.sha256(
                        f"{project_id}:{snapshot.id}:RULE_01_UNMATCHED:{req.id}".encode("utf-8")
                    ).hexdigest()
                    candidate_findings.append(
                        Finding(
                            project_id=project_id,
                            snapshot_id=snapshot.id,
                            commit_sha=snapshot.commit_sha,
                            finding_type="requirement_gap",
                            severity="major",
                            title=f"Requirement without clear implementation evidence ({req.title})",
                            summary=(
                                f"Project Doctor searched the repository snapshot at commit {snapshot.commit_sha[:7]} "
                                f"but could not locate candidate implementation evidence matching '{req.title}'."
                            ),
                            why_it_matters=(
                                "Why this matters for evaluation: Evaluators verify whether claimed project requirements "
                                "are present in code. Missing implementation evidence is a common issue during technical reviews."
                            ),
                            suggested_action=(
                                f"Review repository files to ensure the implementation for '{req.title}' is committed and clearly identifiable."
                            ),
                            evidence_references=[
                                {
                                    "target_type": "requirement",
                                    "target_id": str(req.id),
                                    "role": "specification",
                                },
                                {
                                    "target_type": "traceability",
                                    "target_id": str(trace.id),
                                    "role": "traceability_record",
                                },
                            ],
                            technical_details={
                                "rule_code": "RULE_01_UNMATCHED_REQUIREMENT",
                                "requirement_id": req.requirement_id,
                                "commit_sha": snapshot.commit_sha,
                                "traceability_status": trace.status,
                            },
                            finding_hash=f_hash,
                        )
                    )

                # RULE-02: Ambiguous implementation candidates
                elif trace.status == "ambiguous":
                    f_hash = hashlib.sha256(
                        f"{project_id}:{snapshot.id}:RULE_02_AMBIGUOUS:{req.id}".encode("utf-8")
                    ).hexdigest()
                    candidate_findings.append(
                        Finding(
                            project_id=project_id,
                            snapshot_id=snapshot.id,
                            commit_sha=snapshot.commit_sha,
                            finding_type="code_organization",
                            severity="needs_attention",
                            title=f"Multiple competing implementation files found for requirement ({req.title})",
                            summary=(
                                f"Multiple candidate implementation files were identified for '{req.title}'. "
                                "It is not clear which file represents the active implementation."
                            ),
                            why_it_matters=(
                                "Why this matters for evaluation: Competing or duplicate candidate files create confusion "
                                "during evaluation and can suggest incomplete refactoring."
                            ),
                            suggested_action=(
                                f"Consolidate the implementation into a single primary file or remove outdated candidate files for '{req.title}'."
                            ),
                            evidence_references=[
                                {
                                    "target_type": "requirement",
                                    "target_id": str(req.id),
                                    "role": "specification",
                                },
                                {
                                    "target_type": "traceability",
                                    "target_id": str(trace.id),
                                    "role": "traceability_record",
                                },
                            ],
                            technical_details={
                                "rule_code": "RULE_02_AMBIGUOUS_CANDIDATES",
                                "requirement_id": req.requirement_id,
                                "commit_sha": snapshot.commit_sha,
                                "traceability_status": trace.status,
                                "summary_notes": trace.summary_notes,
                            },
                            finding_hash=f_hash,
                        )
                    )

                # RULE-03: Candidate implementation without matching test evidence according to CP6
                elif trace.status == "candidate":
                    f_hash = hashlib.sha256(
                        f"{project_id}:{snapshot.id}:RULE_03_NO_TESTS:{req.id}".encode("utf-8")
                    ).hexdigest()
                    candidate_findings.append(
                        Finding(
                            project_id=project_id,
                            snapshot_id=snapshot.id,
                            commit_sha=snapshot.commit_sha,
                            finding_type="testing_gap",
                            severity="improvement",
                            title=f"Candidate implementation code found without associated tests ({req.title})",
                            summary=(
                                f"Candidate implementation code was located for '{req.title}', but associated test evidence "
                                "was not located in the repository according to traceability analysis."
                            ),
                            why_it_matters=(
                                "Why this matters for evaluation: Evaluators frequently ask how features were verified. "
                                "Automated tests provide reproducible evidence of correctness."
                            ),
                            suggested_action=(
                                f"Add an automated test suite or unit test verifying '{req.title}'."
                            ),
                            evidence_references=[
                                {
                                    "target_type": "requirement",
                                    "target_id": str(req.id),
                                    "role": "specification",
                                },
                                {
                                    "target_type": "traceability",
                                    "target_id": str(trace.id),
                                    "role": "traceability_record",
                                },
                            ],
                            technical_details={
                                "rule_code": "RULE_03_IMPL_WITHOUT_TESTS",
                                "requirement_id": req.requirement_id,
                                "commit_sha": snapshot.commit_sha,
                                "traceability_status": trace.status,
                                "implementation_count": trace.implementation_count,
                            },
                            finding_hash=f_hash,
                        )
                    )

                # RULE-08: Strength: Implementation accompanied by candidate test evidence
                elif trace.status == "candidate_with_tests":
                    f_hash = hashlib.sha256(
                        f"{project_id}:{snapshot.id}:RULE_08_STRENGTH_TESTS:{req.id}".encode("utf-8")
                    ).hexdigest()
                    candidate_findings.append(
                        Finding(
                            project_id=project_id,
                            snapshot_id=snapshot.id,
                            commit_sha=snapshot.commit_sha,
                            finding_type="strength",
                            severity="strength",
                            title=f"Implementation accompanied by candidate test evidence ({req.title})",
                            summary=(
                                f"Located candidate implementation code and potentially related test evidence for '{req.title}'."
                            ),
                            why_it_matters=(
                                "Why this matters for evaluation: Demonstrating automated tests alongside feature code "
                                "shows strong engineering discipline to evaluators."
                            ),
                            suggested_action=(
                                f"Ensure test coverage for '{req.title}' is actively executed in automated workflows or CI."
                            ),
                            evidence_references=[
                                {
                                    "target_type": "requirement",
                                    "target_id": str(req.id),
                                    "role": "specification",
                                },
                                {
                                    "target_type": "traceability",
                                    "target_id": str(trace.id),
                                    "role": "traceability_record",
                                },
                            ],
                            technical_details={
                                "rule_code": "RULE_08_IMPL_WITH_TESTS",
                                "requirement_id": req.requirement_id,
                                "commit_sha": snapshot.commit_sha,
                                "traceability_status": trace.status,
                                "test_count": trace.test_count,
                            },
                            finding_hash=f_hash,
                        )
                    )

        # -------------------------------------------------------------
        # REPOSITORY STRUCTURE RULES (RULE-04, RULE-05, RULE-07, RULE-09, RULE-10)
        # -------------------------------------------------------------
        if snapshot:
            # RULE-04: Potentially sensitive file detected
            sec_files_stmt = sa.select(RepositoryFile).where(
                RepositoryFile.snapshot_id == snapshot.id,
                RepositoryFile.content_status == "security_omitted",
            )
            sec_files = list(db.scalars(sec_files_stmt).all())
            for sf in sec_files:
                f_hash = hashlib.sha256(
                    f"{project_id}:{snapshot.id}:RULE_04_SECURITY:{sf.file_path}".encode("utf-8")
                ).hexdigest()
                candidate_findings.append(
                    Finding(
                        project_id=project_id,
                        snapshot_id=snapshot.id,
                        commit_sha=snapshot.commit_sha,
                        finding_type="security_risk",
                        severity="critical",
                        title="Potentially sensitive configuration file detected in repository",
                        summary=(
                            f"A potentially sensitive configuration file was detected in the repository ('{sf.file_path}'). "
                            "In accordance with security practices, its contents were omitted from ingestion."
                        ),
                        why_it_matters=(
                            "Why this matters for evaluation: Committing environment or credential files can inadvertently "
                            "expose private configuration to repository viewers and evaluators."
                        ),
                        suggested_action=(
                            f"Ensure '{sf.file_path}' contains no secrets, add it to .gitignore, and provide sample configuration via .env.example instead."
                        ),
                        evidence_references=[
                            {
                                "target_type": "repository_file",
                                "target_id": str(sf.id),
                                "role": "sensitive_file",
                            }
                        ],
                        technical_details={
                            "rule_code": "RULE_04_SECURITY_OMITTED",
                            "file_path": sf.file_path,
                            "commit_sha": snapshot.commit_sha,
                            "content_status": sf.content_status,
                        },
                        finding_hash=f_hash,
                    )
                )

            ev_counts = (snapshot.structure_summary or {}).get("evidence_counts", {})
            test_suite_count = ev_counts.get("test_suite", 0)
            doc_count = ev_counts.get("documentation", 0)

            # RULE-05: No automated test suite detected
            if test_suite_count == 0:
                f_hash = hashlib.sha256(
                    f"{project_id}:{snapshot.id}:RULE_05_NO_TESTS:repo".encode("utf-8")
                ).hexdigest()
                candidate_findings.append(
                    Finding(
                        project_id=project_id,
                        snapshot_id=snapshot.id,
                        commit_sha=snapshot.commit_sha,
                        finding_type="testing_gap",
                        severity="major",
                        title="No automated test suites detected in repository",
                        summary=(
                            f"The repository snapshot at commit {snapshot.commit_sha[:7]} does not contain automated test suites, "
                            "test directories, or test framework configurations."
                        ),
                        why_it_matters=(
                            "Why this matters for evaluation: Without automated tests, software quality and correctness cannot "
                            "be independently verified during technical evaluation."
                        ),
                        suggested_action=(
                            "Introduce automated test suites (e.g. pytest, vitest, jest) covering your primary features."
                        ),
                        evidence_references=[],
                        technical_details={
                            "rule_code": "RULE_05_NO_TEST_SUITE",
                            "commit_sha": snapshot.commit_sha,
                            "total_files": snapshot.total_files,
                        },
                        finding_hash=f_hash,
                    )
                )
            else:
                # RULE-09: Automated test suite present (Strength)
                f_hash = hashlib.sha256(
                    f"{project_id}:{snapshot.id}:RULE_09_TEST_SUITE_PRESENT:repo".encode("utf-8")
                ).hexdigest()
                candidate_findings.append(
                    Finding(
                        project_id=project_id,
                        snapshot_id=snapshot.id,
                        commit_sha=snapshot.commit_sha,
                        finding_type="strength",
                        severity="strength",
                        title="Automated test suite detected in repository",
                        summary=(
                            f"The repository snapshot at commit {snapshot.commit_sha[:7]} contains {test_suite_count} "
                            "automated test suite or verification file(s)."
                        ),
                        why_it_matters=(
                            "Why this matters for evaluation: Having structured test suites allows evaluators to verify "
                            "software correctness independently."
                        ),
                        suggested_action="Maintain test suite health and ensure test execution is documented for reviewers.",
                        evidence_references=[],
                        technical_details={
                            "rule_code": "RULE_09_TEST_SUITE_PRESENT",
                            "commit_sha": snapshot.commit_sha,
                            "test_suite_count": test_suite_count,
                        },
                        finding_hash=f_hash,
                    )
                )

            # Check for README presence according to repository file conventions
            has_readme = (
                db.scalar(
                    sa.select(sa.func.count(RepositoryFile.id)).where(
                        RepositoryFile.snapshot_id == snapshot.id,
                        sa.func.lower(RepositoryFile.file_name).like("readme%"),
                    )
                )
                > 0
            )

            # RULE-07: Missing repository documentation
            if doc_count == 0 and not has_readme:
                f_hash = hashlib.sha256(
                    f"{project_id}:{snapshot.id}:RULE_07_NO_DOCS:repo".encode("utf-8")
                ).hexdigest()
                candidate_findings.append(
                    Finding(
                        project_id=project_id,
                        snapshot_id=snapshot.id,
                        commit_sha=snapshot.commit_sha,
                        finding_type="documentation_gap",
                        severity="improvement",
                        title="Missing project documentation or README in repository",
                        summary=(
                            f"No standard README or architecture documentation files were located in the repository snapshot "
                            f"at commit {snapshot.commit_sha[:7]}."
                        ),
                        why_it_matters=(
                            "Why this matters for evaluation: Clear documentation is the first artifact evaluators inspect "
                            "to understand how to build, run, and assess the project."
                        ),
                        suggested_action=(
                            "Add a comprehensive README.md explaining project purpose, architecture, prerequisites, and setup instructions."
                        ),
                        evidence_references=[],
                        technical_details={
                            "rule_code": "RULE_07_NO_DOCUMENTATION",
                            "commit_sha": snapshot.commit_sha,
                        },
                        finding_hash=f_hash,
                    )
                )

            # RULE-10: Standard project documentation present (Strength)
            if doc_count > 0:
                f_hash = hashlib.sha256(
                    f"{project_id}:{snapshot.id}:RULE_10_DOC_PRESENT:repo".encode("utf-8")
                ).hexdigest()
                candidate_findings.append(
                    Finding(
                        project_id=project_id,
                        snapshot_id=snapshot.id,
                        commit_sha=snapshot.commit_sha,
                        finding_type="strength",
                        severity="strength",
                        title="Standard project documentation detected in repository",
                        summary=(
                            f"Standard documentation artifact(s) ({doc_count} detected) were located in the repository snapshot "
                            f"at commit {snapshot.commit_sha[:7]}."
                        ),
                        why_it_matters=(
                            "Why this matters for evaluation: Comprehensive documentation helps evaluators understand design decisions, "
                            "setup instructions, and architecture."
                        ),
                        suggested_action="Keep documentation updated as implementation evolves.",
                        evidence_references=[],
                        technical_details={
                            "rule_code": "RULE_10_DOCUMENTATION_PRESENT",
                            "commit_sha": snapshot.commit_sha,
                            "doc_count": doc_count,
                        },
                        finding_hash=f_hash,
                    )
                )

        # -------------------------------------------------------------
        # PROJECT-LEVEL SPECIFICATION RULES (RULE-06)
        # -------------------------------------------------------------
        for req in requirements:
            if req.is_ambiguous or (req.conflict_summary is not None and req.conflict_summary.strip() != ""):
                f_hash = hashlib.sha256(
                    f"{project_id}:project:RULE_06_AMBIGUITY:{req.id}".encode("utf-8")
                ).hexdigest()
                candidate_findings.append(
                    Finding(
                        project_id=project_id,
                        snapshot_id=None,
                        commit_sha=None,
                        finding_type="specification_gap",
                        severity="needs_attention",
                        title=f"Specification conflict or ambiguity detected in project documentation ({req.title})",
                        summary=(
                            f"Requirement '{req.title}' contains internal ambiguity or conflicting specifications across project documentation: "
                            f"'{req.conflict_summary or 'Inconsistent requirement statements detected'}'."
                        ),
                        why_it_matters=(
                            "Why this matters for evaluation: Inconsistent or ambiguous specifications make it difficult "
                            "for evaluators to determine whether the project meets its stated objectives."
                        ),
                        suggested_action=(
                            f"Clarify the specification for '{req.title}' in your project documentation."
                        ),
                        evidence_references=[
                            {
                                "target_type": "requirement",
                                "target_id": str(req.id),
                                "role": "specification",
                            }
                        ],
                        technical_details={
                            "rule_code": "RULE_06_SPEC_AMBIGUITY",
                            "requirement_id": req.requirement_id,
                            "is_ambiguous": req.is_ambiguous,
                            "conflict_summary": req.conflict_summary,
                        },
                        finding_hash=f_hash,
                    )
                )

        # -------------------------------------------------------------
        # PERSISTENCE & IDEMPOTENT UPSERT
        # -------------------------------------------------------------
        with db.begin_nested():
            # Query existing findings for this project and active snapshot scope
            existing_stmt = sa.select(Finding).where(Finding.project_id == project_id)
            if snapshot:
                existing_stmt = existing_stmt.where(
                    sa.or_(Finding.snapshot_id == snapshot.id, Finding.snapshot_id.is_(None))
                )
            else:
                existing_stmt = existing_stmt.where(Finding.snapshot_id.is_(None))

            existing_findings_map: Dict[str, Finding] = {
                f.finding_hash: f for f in db.scalars(existing_stmt).all()
            }

            active_hashes: Set[str] = set()

            for cf in candidate_findings:
                active_hashes.add(cf.finding_hash)
                if cf.finding_hash in existing_findings_map:
                    existing = existing_findings_map[cf.finding_hash]
                    existing.title = cf.title
                    existing.summary = cf.summary
                    existing.why_it_matters = cf.why_it_matters
                    existing.suggested_action = cf.suggested_action
                    existing.severity = cf.severity
                    existing.finding_type = cf.finding_type
                    existing.evidence_references = cf.evidence_references
                    existing.technical_details = cf.technical_details
                    existing.commit_sha = cf.commit_sha
                    existing.updated_at = datetime.now(timezone.utc)
                else:
                    db.add(cf)

            # If force=True, delete findings in this scope that no longer trigger
            if force:
                for hash_val, old_finding in existing_findings_map.items():
                    if hash_val not in active_hashes:
                        db.delete(old_finding)

        db.commit()

        # Return updated read model
        return cls.get_diagnosis(db, project_id, snapshot_id=snapshot.id if snapshot else None)

    @classmethod
    def get_finding_detail(
        cls,
        db: Session,
        project_id: uuid.UUID,
        finding_id: uuid.UUID,
    ) -> FindingDetailResponse:
        """Fetch full finding detail with on-demand canonical evidence hydration."""
        stmt = sa.select(Finding).where(
            Finding.id == finding_id,
            Finding.project_id == project_id,
        )
        finding = db.scalars(stmt).first()
        if not finding:
            raise ValueError(f"Finding '{finding_id}' not found for project '{project_id}'.")

        # Hydrate canonical evidence
        hydrated_items: List[HydratedEvidenceItem] = []
        for ref in finding.evidence_references:
            target_type = ref.get("target_type")
            target_id_str = ref.get("target_id")
            role = ref.get("role")
            if not target_type or not target_id_str:
                continue

            try:
                target_uuid = uuid.UUID(target_id_str)
            except ValueError:
                continue

            if target_type == "requirement":
                req = db.get(Requirement, target_uuid)
                if req and req.project_id == project_id:
                    # Get primary specification evidence if exists
                    primary_ev = req.evidence[0] if req.evidence else None
                    hydrated_items.append(
                        HydratedEvidenceItem(
                            target_type="requirement",
                            target_id=req.id,
                            role=role or "specification",
                            title=f"{req.requirement_id}: {req.title}",
                            snippet=req.description,
                            page_number=primary_ev.page_number if primary_ev else None,
                            section_title=primary_ev.section_title if primary_ev else None,
                            evidence_type="specification_requirement",
                        )
                    )

            elif target_type == "traceability":
                trace = db.get(RequirementSnapshotTraceability, target_uuid)
                if trace and trace.project_id == project_id:
                    # Hydrate links
                    top_link = trace.links[0] if trace.links else None
                    hydrated_items.append(
                        HydratedEvidenceItem(
                            target_type="traceability",
                            target_id=trace.id,
                            role=role or "traceability_record",
                            title=f"Traceability status: {trace.status}",
                            file_path=top_link.file_path if top_link else None,
                            snippet=top_link.code_snippet if top_link else trace.summary_notes,
                            evidence_type=top_link.evidence_type if top_link else "traceability_summary",
                            match_confidence=top_link.match_confidence if top_link else None,
                            line_start=top_link.line_start if top_link else None,
                            line_end=top_link.line_end if top_link else None,
                        )
                    )

            elif target_type == "repository_file":
                rf = db.get(RepositoryFile, target_uuid)
                if rf and rf.project_id == project_id:
                    hydrated_items.append(
                        HydratedEvidenceItem(
                            target_type="repository_file",
                            target_id=rf.id,
                            role=role or "repository_file",
                            title=rf.file_name,
                            file_path=rf.file_path,
                            snippet=None,  # Never expose sensitive content
                            evidence_type=rf.content_status,
                        )
                    )

        parsed_references = [
            FindingEvidenceReference(
                target_type=ref.get("target_type", "unknown"),
                target_id=uuid.UUID(ref.get("target_id")),
                role=ref.get("role"),
            )
            for ref in finding.evidence_references
            if ref.get("target_id")
        ]

        return FindingDetailResponse(
            id=finding.id,
            project_id=finding.project_id,
            snapshot_id=finding.snapshot_id,
            commit_sha=finding.commit_sha,
            finding_type=finding.finding_type,
            severity=finding.severity,
            title=finding.title,
            summary=finding.summary,
            why_it_matters=finding.why_it_matters,
            suggested_action=finding.suggested_action,
            evidence_references=parsed_references,
            hydrated_evidence=hydrated_items,
            technical_details=finding.technical_details,
            finding_hash=finding.finding_hash,
            created_at=finding.created_at,
            updated_at=finding.updated_at,
        )

    @classmethod
    def list_findings(
        cls,
        db: Session,
        project_id: uuid.UUID,
        severity: Optional[str] = None,
        finding_type: Optional[str] = None,
        snapshot_id: Optional[uuid.UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[FindingSummaryResponse]:
        """List findings for a project with optional filters and pagination."""
        project = db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        stmt = sa.select(Finding).where(Finding.project_id == project_id)

        if severity:
            stmt = stmt.where(Finding.severity == severity.strip().lower())
        if finding_type:
            stmt = stmt.where(Finding.finding_type == finding_type.strip().lower())
        if snapshot_id:
            stmt = stmt.where(
                sa.or_(Finding.snapshot_id == snapshot_id, Finding.snapshot_id.is_(None))
            )

        stmt = stmt.order_by(Finding.created_at.desc()).offset(offset).limit(limit)
        findings = list(db.scalars(stmt).all())
        return [FindingSummaryResponse.model_validate(f) for f in findings]

    @classmethod
    def _resolve_snapshot(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> Optional[RepositorySnapshot]:
        """Locate specified snapshot or the active current snapshot for a project."""
        if snapshot_id:
            stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.project_id == project_id,
            )
            snap = db.scalars(stmt).first()
            if not snap:
                raise ValueError(f"Snapshot '{snapshot_id}' not found for project '{project_id}'.")
            return snap

        repo_stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
        repo = db.scalars(repo_stmt).first()
        if not repo:
            return None

        current_snap_stmt = sa.select(RepositorySnapshot).where(
            RepositorySnapshot.repository_id == repo.id,
            RepositorySnapshot.is_current == True,
        )
        return db.scalars(current_snap_stmt).first()
