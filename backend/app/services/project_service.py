import uuid
from typing import List, Optional, Tuple
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.project import Project
from app.models.artifact import Artifact
from app.schemas.project import ProjectCreate
from app.services.storage_service import storage_service, StoredFileInfo


class ProjectService:
    """Service layer handling database operations for projects and artifacts."""

    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate) -> Project:
        """Create and persist a new project."""
        db_project = Project(
            title=project_in.title,
            problem_statement=project_in.problem_statement,
            description=project_in.description,
            requirements=project_in.requirements,
            tech_stack=project_in.tech_stack or [],
            architecture_summary=project_in.architecture_summary,
            github_repo_url=project_in.github_repo_url,
            status="created",
        )
        db.add(db_project)
        try:
            db.commit()
            db.refresh(db_project)
        except Exception:
            db.rollback()
            raise
        return db_project

    @staticmethod
    def get_project(db: Session, project_id: uuid.UUID) -> Optional[Project]:
        """Fetch a project by UUID, including its artifacts."""
        stmt = sa.select(Project).where(Project.id == project_id)
        return db.scalars(stmt).first()

    @staticmethod
    def list_projects(
        db: Session, skip: int = 0, limit: int = 20
    ) -> Tuple[List[dict], int]:
        """Return paginated projects with artifact counts and total count."""
        # Total count query
        total_stmt = sa.select(func.count(Project.id))
        total = db.scalar(total_stmt) or 0

        # Query projects with artifact count via subquery/join
        artifact_count_subquery = (
            sa.select(
                Artifact.project_id,
                func.count(Artifact.id).label("artifact_count"),
            )
            .group_by(Artifact.project_id)
            .subquery()
        )

        stmt = (
            sa.select(
                Project,
                func.coalesce(artifact_count_subquery.c.artifact_count, 0).label("artifact_count"),
            )
            .outerjoin(
                artifact_count_subquery,
                Project.id == artifact_count_subquery.c.project_id,
            )
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        results = db.execute(stmt).all()
        items = []
        for project, art_count in results:
            items.append(
                {
                    "id": project.id,
                    "title": project.title,
                    "status": project.status,
                    "artifact_count": art_count,
                    "created_at": project.created_at,
                    "updated_at": project.updated_at,
                }
            )

        return items, total

    @staticmethod
    def create_artifact(
        db: Session,
        project_id: uuid.UUID,
        file_info: StoredFileInfo,
        file_type: str,
    ) -> Artifact:
        """Create and persist an artifact record attached to a project."""
        db_artifact = Artifact(
            id=file_info.artifact_id,
            project_id=project_id,
            original_filename=file_info.original_filename,
            stored_filename=file_info.stored_filename,
            storage_path=file_info.storage_path,
            file_type=file_type,
            mime_type=file_info.mime_type,
            file_size_bytes=file_info.file_size_bytes,
            status="uploaded",
        )
        db.add(db_artifact)
        try:
            db.commit()
            db.refresh(db_artifact)
        except Exception:
            db.rollback()
            raise
        return db_artifact

    @staticmethod
    def get_artifact(
        db: Session, project_id: uuid.UUID, artifact_id: uuid.UUID
    ) -> Optional[Artifact]:
        """Fetch an artifact enforcing project ownership."""
        stmt = sa.select(Artifact).where(
            Artifact.id == artifact_id,
            Artifact.project_id == project_id,
        )
        return db.scalars(stmt).first()

    @staticmethod
    def list_artifacts(db: Session, project_id: uuid.UUID) -> List[Artifact]:
        """List all artifacts for a project ordered by creation date."""
        stmt = (
            sa.select(Artifact)
            .where(Artifact.project_id == project_id)
            .order_by(Artifact.created_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def delete_artifact(
        db: Session, project_id: uuid.UUID, artifact_id: uuid.UUID
    ) -> bool:
        """Delete an artifact from database and remove its raw & processed disk files."""
        artifact = ProjectService.get_artifact(db, project_id, artifact_id)
        if not artifact:
            return False

        # 1. Clean up physical disk files (raw upload and any processed text)
        storage_service.delete_artifact_files(
            project_id=project_id,
            stored_filename=artifact.stored_filename,
            artifact_id=artifact.id,
        )

        # 2. Delete artifact record (DB cascade deletes document_extractions)
        db.delete(artifact)
        try:
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def delete_project(db: Session, project_id: uuid.UUID) -> bool:
        """Delete a project from database and remove its entire physical storage directory."""
        project = ProjectService.get_project(db, project_id)
        if not project:
            return False

        # 1. Clean up all physical storage (raw uploads and processed texts)
        storage_service.delete_project_storage(project_id)

        # 2. Delete project from DB (cascade deletes artifacts, extractions, understanding)
        db.delete(project)
        try:
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise
