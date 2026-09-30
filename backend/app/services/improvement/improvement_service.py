import uuid
from datetime import datetime
from typing import List, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.models.ai_analysis import AIAnalysis
from app.models.finding import Finding
from app.models.improvement import ImprovementItem
from app.schemas.improvement import ImprovementPlanResponse, ImprovementItemResponse, ImprovementItemUpdate
from app.schemas.finding import FindingSummaryResponse
from app.services.analysis.diagnostic_service import DiagnosticService

SEVERITY_ORDER = {
    "critical": 1,
    "major": 2,
    "needs_attention": 3,
    "improvement": 4,
    "strength": 5,
}

class ImprovementService:
    @classmethod
    def get_improvement_plan(
        cls, db: Session, project_id: uuid.UUID
    ) -> ImprovementPlanResponse:
        project = db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Find latest completed analysis
        latest_analysis = db.scalars(
            sa.select(AIAnalysis)
            .where(
                AIAnalysis.project_id == project_id,
                AIAnalysis.status == "completed",
            )
            .order_by(AIAnalysis.created_at.desc())
            .limit(1)
        ).first()

        if not latest_analysis:
            # Return empty response for no completed analysis
            return ImprovementPlanResponse(
                project_id=project_id,
                analysis_id=None,
                items=[],
                is_empty=True,
                created_at=project.created_at
            )

        # Check existing improvement items for this analysis
        existing_items = list(
            db.scalars(
                sa.select(ImprovementItem)
                .where(
                    ImprovementItem.project_id == project_id,
                    ImprovementItem.analysis_id == latest_analysis.id,
                )
            ).all()
        )

        if existing_items:
            return cls._build_response(db, project_id, latest_analysis.id, existing_items)

        # If not populated for this analysis, build it from findings
        stmt = sa.select(Finding).where(
            Finding.project_id == project_id,
            Finding.suggested_action.isnot(None),
            Finding.suggested_action != "",
            Finding.severity != "strength"
        )
        if latest_analysis.snapshot_id:
            stmt = stmt.where(
                sa.or_(
                    Finding.snapshot_id == latest_analysis.snapshot_id,
                    Finding.snapshot_id.is_(None)
                )
            )
        else:
            stmt = stmt.where(Finding.snapshot_id.is_(None))

        findings = list(db.scalars(stmt).all())

        new_items = []
        for f in findings:
            item = ImprovementItem(
                project_id=project_id,
                analysis_id=latest_analysis.id,
                finding_id=f.id,
                status="not_started"
            )
            new_items.append(item)

        if new_items:
            try:
                db.add_all(new_items)
                db.commit()
                for item in new_items:
                    db.refresh(item)
                    # Need to load the relationship manually or it will trigger a query
                    item.finding = next((f for f in findings if f.id == item.finding_id), None)
                
                existing_items = new_items
            except sa.exc.IntegrityError:
                db.rollback()
                existing_items = list(
                    db.scalars(
                        sa.select(ImprovementItem)
                        .where(
                            ImprovementItem.project_id == project_id,
                            ImprovementItem.analysis_id == latest_analysis.id,
                        )
                    ).all()
                )

        return cls._build_response(db, project_id, latest_analysis.id, existing_items)


    @classmethod
    def _build_response(
        cls, db: Session, project_id: uuid.UUID, analysis_id: uuid.UUID, items: List[ImprovementItem]
    ) -> ImprovementPlanResponse:
        
        # Ensure finding relation is loaded if not already
        valid_items = [i for i in items if i.finding]
        
        # Sort items
        valid_items.sort(
            key=lambda i: (SEVERITY_ORDER.get(i.finding.severity, 99), i.finding.created_at)
        )

        response_items = []
        for item in valid_items:
            f = item.finding
            finding_detail = DiagnosticService.get_finding_detail(db=db, project_id=project_id, finding_id=f.id)
            response_items.append(
                ImprovementItemResponse(
                    id=item.id,
                    project_id=item.project_id,
                    analysis_id=item.analysis_id,
                    finding_id=item.finding_id,
                    status=item.status,
                    title=f.title,
                    severity=f.severity,
                    summary=f.summary,
                    why_it_matters=f.why_it_matters,
                    suggested_action=f.suggested_action or "",
                    evidence_references=finding_detail.evidence_references,
                    hydrated_evidence=finding_detail.hydrated_evidence,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                )
            )

        return ImprovementPlanResponse(
            project_id=project_id,
            analysis_id=analysis_id,
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

        f = item.finding
        finding_detail = DiagnosticService.get_finding_detail(db=db, project_id=project_id, finding_id=f.id)
        
        return ImprovementItemResponse(
            id=item.id,
            project_id=item.project_id,
            analysis_id=item.analysis_id,
            finding_id=item.finding_id,
            status=item.status,
            title=f.title,
            severity=f.severity,
            summary=f.summary,
            why_it_matters=f.why_it_matters,
            suggested_action=f.suggested_action or "",
            evidence_references=finding_detail.evidence_references,
            hydrated_evidence=finding_detail.hydrated_evidence,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
