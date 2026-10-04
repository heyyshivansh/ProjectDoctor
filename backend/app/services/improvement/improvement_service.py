import json
import uuid
import logging
from datetime import datetime
from typing import List, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.models.analysis_run import AnalysisRun
from app.models.finding import Finding
from app.models.improvement import ImprovementItem
from app.models.traceability import RequirementSnapshotTraceability
from app.models.requirement import Requirement
from app.schemas.improvement import ImprovementPlanResponse, ImprovementItemResponse, ImprovementItemUpdate
from app.schemas.finding import FindingSummaryResponse
from app.services.analysis.diagnostic_service import DiagnosticService

logger = logging.getLogger(__name__)

SEVERITY_ORDER = {
    "critical": 1,
    "major": 2,
    "needs_attention": 3,
    "improvement": 4,
    "strength": 5,
}

class ImprovementService:
    @classmethod
    def reconcile_improvements(cls, db: Session, project_id: uuid.UUID, run_id: uuid.UUID) -> None:
        """Reconciles findings from a completed deterministic analysis run into improvement items."""
        run = db.get(AnalysisRun, run_id)
        if not run or run.project_id != project_id:
            logger.error(f"Run {run_id} not found for project {project_id}.")
            return
            
        if run.deterministic_status != "completed":
            logger.error(f"Cannot reconcile run {run_id} with deterministic_status {run.deterministic_status}")
            return

        try:
            # 1. Fetch current active items (exclude completed ones that are resolved, wait we fetch all)
            existing_items = list(
                db.scalars(
                    sa.select(ImprovementItem)
                    .where(ImprovementItem.project_id == project_id)
                ).all()
            )
            item_map = {item.stable_identity: item for item in existing_items}

            # 2. Fetch current findings from this snapshot (and project level findings)
            stmt_all = sa.select(Finding).where(Finding.project_id == project_id)
            if run.snapshot_id:
                stmt_all = stmt_all.where(
                    sa.or_(
                        Finding.snapshot_id == run.snapshot_id,
                        Finding.snapshot_id.is_(None)
                    )
                )
            else:
                stmt_all = stmt_all.where(Finding.snapshot_id.is_(None))
                
            all_findings = list(db.scalars(stmt_all).all())
            
            current_actionable_findings = [f for f in all_findings if f.severity != "strength" and f.suggested_action and f.suggested_action != ""]
            
            current_finding_map = {}
            for f in current_actionable_findings:
                td = json.loads(f.technical_details) if isinstance(f.technical_details, str) else f.technical_details
                rule_code = td.get("rule_code", "UNKNOWN")
                entity_id = td.get("requirement_id") or td.get("file_path") or "repo"
                sid = f"{rule_code}:{entity_id}"
                current_finding_map[sid] = f

            # Track which items were seen
            seen_sids = set()

            for sid, finding in current_finding_map.items():
                seen_sids.add(sid)
                if sid in item_map:
                    # Still detected
                    item = item_map[sid]
                    item.verification_status = "still_detected"
                    item.verification_detail = None
                    item.latest_verification_run_id = run.id
                    item.latest_matching_finding_id = finding.id
                    
                    item.title = finding.title
                    item.severity = finding.severity
                    item.summary = finding.summary
                    item.why_it_matters = finding.why_it_matters
                    item.suggested_action = finding.suggested_action
                else:
                    # New item
                    new_item = ImprovementItem(
                        project_id=project_id,
                        original_run_id=run.id,
                        finding_id=finding.id,
                        stable_identity=sid,
                        latest_verification_run_id=run.id,
                        latest_matching_finding_id=finding.id,
                        status="not_started",
                        verification_status="still_detected",
                        title=finding.title,
                        severity=finding.severity,
                        summary=finding.summary,
                        why_it_matters=finding.why_it_matters,
                        suggested_action=finding.suggested_action
                    )
                    db.add(new_item)

            # 3. Handle items no longer detected
            for sid, item in item_map.items():
                if sid in seen_sids:
                    continue
                if item.verification_status == "verified_resolved":
                    # Already resolved, don't change it unless we want to do checks.
                    # Actually, if it's resolved, it stays resolved unless it regresses (which is handled above).
                    # But wait, if it's missing, it's fine.
                    continue
                    
                item.latest_verification_run_id = run.id
                
                # Determine resolution vs missing
                rule_code, entity_id = sid.split(":", 1)
                
                if rule_code == "RULE_01_UNMATCHED_REQUIREMENT":
                    trace = cls._get_traceability(db, project_id, run.snapshot_id, entity_id)
                    if trace:
                        if trace.status in ("candidate", "candidate_with_tests"):
                            item.verification_status = "verified_resolved"
                            item.verification_detail = "Verified resolved (implementation found)"
                        else:
                            item.verification_status = "no_longer_detected"
                            item.verification_detail = f"Requirement {entity_id} status changed unexpectedly."
                    else:
                        item.verification_status = "no_longer_detected"
                        item.verification_detail = "No longer detected (requirement removed or renamed)"
                        
                elif rule_code == "RULE_02_AMBIGUOUS_CANDIDATES":
                    trace = cls._get_traceability(db, project_id, run.snapshot_id, entity_id)
                    if trace:
                        if trace.status in ("candidate", "candidate_with_tests"):
                            item.verification_status = "verified_resolved"
                            item.verification_detail = "Verified resolved (ambiguity cleared)"
                        elif trace.status == "unmatched":
                            item.verification_status = "no_longer_detected"
                            item.verification_detail = "Ambiguity no longer detected; implementation evidence is still missing."
                        else:
                            item.verification_status = "no_longer_detected"
                            item.verification_detail = "Ambiguity no longer detected."
                    else:
                        item.verification_status = "no_longer_detected"
                        item.verification_detail = "No longer detected (requirement removed or renamed)"

                elif rule_code == "RULE_03_IMPL_WITHOUT_TESTS":
                    trace = cls._get_traceability(db, project_id, run.snapshot_id, entity_id)
                    if trace:
                        if trace.status == "candidate_with_tests":
                            item.verification_status = "verified_resolved"
                            item.verification_detail = "Verified resolved (tests found)"
                        elif trace.status in ("unmatched", "ambiguous"):
                            item.verification_status = "no_longer_detected"
                            item.verification_detail = "Test gap no longer detected; implementation itself is missing or ambiguous."
                        else:
                            item.verification_status = "no_longer_detected"
                            item.verification_detail = "Test gap no longer detected."
                    else:
                        item.verification_status = "no_longer_detected"
                        item.verification_detail = "No longer detected (requirement removed or renamed)"

                elif rule_code == "RULE_04_SECURITY_OMITTED":
                    item.verification_status = "no_longer_detected"
                    item.verification_detail = "No longer detected (file removed or renamed)"

                elif rule_code == "RULE_05_NO_TEST_SUITE":
                    def get_rule(f):
                        td = f.technical_details
                        return (json.loads(td) if isinstance(td, str) else td).get("rule_code")
                        
                    rule9_exists = any(get_rule(f) == "RULE_09_TEST_SUITE_PRESENT" for f in all_findings)
                    if rule9_exists:
                        item.verification_status = "verified_resolved"
                        item.verification_detail = "Verified resolved (test suite found)"
                    else:
                        item.verification_status = "no_longer_detected"
                        item.verification_detail = "Test suite absence no longer detected."

                elif rule_code == "RULE_06_SPEC_AMBIGUITY":
                    req = db.scalars(sa.select(Requirement).where(
                        Requirement.project_id == project_id,
                        Requirement.requirement_id == entity_id
                    )).first()
                    if req:
                        if not req.is_ambiguous and not req.conflict_summary:
                            item.verification_status = "verified_resolved"
                            item.verification_detail = "Verified resolved (ambiguity cleared)"
                        else:
                            item.verification_status = "still_detected" # Should have been caught by seen_sids, but fallback
                    else:
                        item.verification_status = "no_longer_detected"
                        item.verification_detail = "No longer detected (requirement removed)"

                elif rule_code == "RULE_07_NO_DOCUMENTATION":
                    def get_rule(f):
                        td = f.technical_details
                        return (json.loads(td) if isinstance(td, str) else td).get("rule_code")
                        
                    rule10_exists = any(get_rule(f) == "RULE_10_DOCUMENTATION_PRESENT" for f in all_findings)
                    if rule10_exists:
                        item.verification_status = "verified_resolved"
                        item.verification_detail = "Verified resolved (documentation found)"
                    else:
                        item.verification_status = "no_longer_detected"
                        item.verification_detail = "Documentation absence no longer detected."
                        
                else:
                    item.verification_status = "no_longer_detected"
                    item.verification_detail = "No longer detected"

            db.commit()
            
        except Exception as e:
            db.rollback()
            logger.exception(f"Error reconciling improvements for run {run_id}: {e}")
            raise

    @classmethod
    def _get_traceability(cls, db: Session, project_id: uuid.UUID, snapshot_id: uuid.UUID, requirement_business_key: str) -> Optional[RequirementSnapshotTraceability]:
        if not snapshot_id or not requirement_business_key:
            return None
            
        return db.scalars(
            sa.select(RequirementSnapshotTraceability)
            .join(Requirement, Requirement.id == RequirementSnapshotTraceability.requirement_id)
            .where(
                RequirementSnapshotTraceability.project_id == project_id,
                RequirementSnapshotTraceability.snapshot_id == snapshot_id,
                Requirement.requirement_id == requirement_business_key
            )
        ).first()

    @classmethod
    def get_improvement_plan(
        cls, db: Session, project_id: uuid.UUID
    ) -> ImprovementPlanResponse:
        project = db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Find latest completed analysis run
        latest_run = db.scalars(
            sa.select(AnalysisRun)
            .where(
                AnalysisRun.project_id == project_id,
                AnalysisRun.deterministic_status == "completed",
            )
            .order_by(AnalysisRun.created_at.desc())
            .limit(1)
        ).first()

        items = list(
            db.scalars(
                sa.select(ImprovementItem)
                .where(ImprovementItem.project_id == project_id)
            ).all()
        )

        return cls._build_response(db, project_id, latest_run.id if latest_run else None, items)


    @classmethod
    def _build_response(
        cls, db: Session, project_id: uuid.UUID, run_id: Optional[uuid.UUID], items: List[ImprovementItem]
    ) -> ImprovementPlanResponse:
        
        # Sort items
        sorted_items = sorted(
            items,
            key=lambda item: (SEVERITY_ORDER.get(item.severity, 99) if item.severity else 99, item.created_at)
        )

        response_items = []
        for item in sorted_items:
            f_id = item.latest_matching_finding_id or item.finding_id
            finding_detail = None
            if f_id:
                finding_detail = DiagnosticService.get_finding_detail(db=db, project_id=project_id, finding_id=f_id)
                
            response_items.append(
                ImprovementItemResponse(
                    id=item.id,
                    project_id=item.project_id,
                    original_run_id=item.original_run_id,
                    latest_verification_run_id=item.latest_verification_run_id,
                    finding_id=f_id,
                    status=item.status,
                    verification_status=item.verification_status,
                    verification_detail=item.verification_detail,
                    title=item.title,
                    severity=item.severity,
                    summary=item.summary,
                    why_it_matters=item.why_it_matters,
                    suggested_action=item.suggested_action or "",
                    evidence_references=finding_detail.evidence_references if finding_detail else [],
                    hydrated_evidence=finding_detail.hydrated_evidence if finding_detail else [],
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                )
            )

        return ImprovementPlanResponse(
            project_id=project_id,
            latest_verification_run_id=run_id,
            items=response_items,
            is_empty=len(response_items) == 0,
            created_at=items[0].created_at if items else datetime.now()
        )

    @classmethod
    def update_item_status(
        cls, db: Session, project_id: uuid.UUID, item_id: uuid.UUID, update_data: ImprovementItemUpdate
    ) -> ImprovementItemResponse:
        item = db.get(ImprovementItem, item_id)
        if not item or item.project_id != project_id:
            raise HTTPException(status_code=404, detail="Improvement item not found")

        valid_statuses = {"not_started", "in_progress", "completed"}
        if update_data.status not in valid_statuses:
            raise HTTPException(status_code=422, detail="Invalid status")

        item.status = update_data.status
        db.commit()
        db.refresh(item)

        f = None
        f_id = item.latest_matching_finding_id or item.finding_id
        if f_id:
            f = db.get(Finding, f_id)
            
        finding_detail = None
        if f:
            finding_detail = DiagnosticService.get_finding_detail(db=db, project_id=project_id, finding_id=f.id)
        
        return ImprovementItemResponse(
            id=item.id,
            project_id=item.project_id,
            original_run_id=item.original_run_id,
            latest_verification_run_id=item.latest_verification_run_id,
            finding_id=f_id,
            status=item.status,
            verification_status=item.verification_status,
            verification_detail=item.verification_detail,
            title=item.title,
            severity=item.severity,
            summary=item.summary,
            why_it_matters=item.why_it_matters,
            suggested_action=item.suggested_action or "",
            evidence_references=finding_detail.evidence_references if finding_detail else [],
            hydrated_evidence=finding_detail.hydrated_evidence if finding_detail else [],
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
