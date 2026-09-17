import os
import re
import uuid
from typing import Dict, List, Optional, Tuple, Any
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.document_extraction import DocumentExtraction
from app.models.project_understanding import ProjectUnderstanding
from app.services.storage_service import storage_service


class ProjectUnderstandingService:
    """Synthesizes a deterministic project understanding representation across 11 dimensions.
    
    STRICT NO-INVENTION RULE:
    A field may only be populated when supported by explicit project metadata or explicit
    extracted document evidence. Missing information must remain null or [].
    """

    HEADING_KEYWORDS = {
        "problem": ["problem", "problem statement", "background"],
        "target_users": ["target users", "target audience", "user personas", "stakeholders"],
        "objectives": ["objectives", "project objectives", "goals", "scope"],
        "requirements_summary": ["requirements", "system requirements", "functional requirements"],
        "modules": ["modules", "components", "system modules", "functional decomposition"],
        "tech_stack": ["technology stack", "tech stack", "tools used", "technologies"],
        "architecture_overview": ["architecture", "system architecture", "design overview", "technical architecture"],
        "dependencies": ["dependencies", "third-party services", "external apis", "prerequisites"],
        "expected_scale": ["scale", "expected scale", "capacity", "scalability targets", "load expectations"],
        "deployment": ["deployment", "hosting", "infrastructure", "devops"],
        "team": ["team", "team members", "contributors", "authors"],
    }

    @classmethod
    def generate_understanding(
        cls,
        db: Session,
        project_id: uuid.UUID,
    ) -> Optional[ProjectUnderstanding]:
        """Generate and persist the deterministic structured representation for a project."""
        # 1. Fetch project
        stmt = sa.select(Project).where(Project.id == project_id)
        project = db.scalars(stmt).first()
        if not project:
            return None

        # 2. Fetch all completed extractions
        ext_stmt = (
            sa.select(DocumentExtraction)
            .where(
                DocumentExtraction.project_id == project_id,
                DocumentExtraction.status == "completed",
            )
            .order_by(DocumentExtraction.created_at.asc())
        )
        extractions = list(db.scalars(ext_stmt).all())

        # 3. Read extracted text content and map sections from artifacts
        source_artifact_ids: List[str] = []
        total_words_analyzed: int = 0
        extracted_sections_count: int = 0

        # Map of dimension -> list of (content_str, provenance_dict)
        doc_evidence: Dict[str, List[Tuple[str, Dict[str, Any]]]] = {
            dim: [] for dim in cls.HEADING_KEYWORDS
        }

        for ext in extractions:
            source_artifact_ids.append(str(ext.artifact_id))
            total_words_analyzed += ext.word_count or 0

            # Read raw text from disk if file exists
            full_text = ""
            if ext.text_storage_path:
                try:
                    file_path = storage_service.get_processed_text_path(project_id, ext.artifact_id)
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        full_text = f.read()
                except Exception:
                    full_text = ext.text_preview or ""

            sections = ext.sections or []
            extracted_sections_count += len(sections)

            # Match sections to dimensions
            for i, sec in enumerate(sections):
                title = sec.get("title", "").strip().lower()
                clean_title = re.sub(r"^[#\s\d.-]+", "", title).strip()

                start_char = sec.get("start_char", 0)
                end_char = sec.get("end_char", len(full_text))

                # Extract slice from full text
                if full_text and start_char < len(full_text):
                    # Next section start_char or current end_char
                    next_start = sections[i + 1].get("start_char") if i + 1 < len(sections) else len(full_text)
                    section_content = full_text[start_char:next_start].strip()
                else:
                    section_content = sec.get("text_preview", "").strip()

                # Check keyword match
                for dim, keywords in cls.HEADING_KEYWORDS.items():
                    for kw in keywords:
                        if kw in clean_title:
                            prov = {
                                "source_type": "artifact",
                                "artifact_id": str(ext.artifact_id),
                                "section": sec.get("title", ""),
                            }
                            doc_evidence[dim].append((section_content, prov))
                            break

        # 4. Synthesize the 11 dimensions with STRICT NO-INVENTION rules
        provenance: Dict[str, Any] = {}

        # 4.1 Problem
        problem_val: Optional[str] = None
        if project.problem_statement and project.problem_statement.strip():
            problem_val = project.problem_statement.strip()
            provenance["problem"] = {
                "source_type": "project_metadata",
                "field": "problem_statement",
            }
        elif doc_evidence["problem"]:
            problem_val = doc_evidence["problem"][0][0]
            provenance["problem"] = doc_evidence["problem"][0][1]

        # 4.2 Target Users
        target_users_val: List[str] = []
        if doc_evidence["target_users"]:
            target_users_val = cls._extract_list_items(doc_evidence["target_users"][0][0])
            provenance["target_users"] = [
                {
                    "value": item,
                    **doc_evidence["target_users"][0][1],
                }
                for item in target_users_val
            ]

        # 4.3 Objectives
        objectives_val: List[str] = []
        if doc_evidence["objectives"]:
            objectives_val = cls._extract_list_items(doc_evidence["objectives"][0][0])
            provenance["objectives"] = [
                {
                    "value": item,
                    **doc_evidence["objectives"][0][1],
                }
                for item in objectives_val
            ]

        # 4.4 Requirements Summary (Checkpoint 3: Raw Text Only, No R1/RN decomposition)
        requirements_summary_val: Optional[str] = None
        if project.requirements and project.requirements.strip():
            requirements_summary_val = project.requirements.strip()
            provenance["requirements_summary"] = {
                "source_type": "project_metadata",
                "field": "requirements",
            }
        elif doc_evidence["requirements_summary"]:
            requirements_summary_val = doc_evidence["requirements_summary"][0][0]
            provenance["requirements_summary"] = doc_evidence["requirements_summary"][0][1]

        # 4.5 Modules
        modules_val: List[str] = []
        if doc_evidence["modules"]:
            modules_val = cls._extract_list_items(doc_evidence["modules"][0][0])
            provenance["modules"] = [
                {
                    "value": item,
                    **doc_evidence["modules"][0][1],
                }
                for item in modules_val
            ]

        # 4.6 Tech Stack
        tech_stack_set: List[str] = []
        tech_prov: List[Dict[str, Any]] = []

        # From declared metadata
        if project.tech_stack and isinstance(project.tech_stack, list):
            for t in project.tech_stack:
                clean_t = str(t).strip()
                if clean_t and clean_t not in tech_stack_set:
                    tech_stack_set.append(clean_t)
                    tech_prov.append({
                        "value": clean_t,
                        "source_type": "project_metadata",
                        "field": "tech_stack",
                    })

        # From documents
        for doc_text, prov_item in doc_evidence["tech_stack"]:
            doc_items = cls._extract_list_items(doc_text)
            for item in doc_items:
                if item and item not in tech_stack_set:
                    tech_stack_set.append(item)
                    tech_prov.append({
                        "value": item,
                        **prov_item,
                    })

        tech_stack_val = tech_stack_set
        if tech_prov:
            provenance["tech_stack"] = tech_prov

        # 4.7 Architecture Overview
        architecture_overview_val: Optional[str] = None
        if project.architecture_summary and project.architecture_summary.strip():
            architecture_overview_val = project.architecture_summary.strip()
            provenance["architecture_overview"] = {
                "source_type": "project_metadata",
                "field": "architecture_summary",
            }
        elif doc_evidence["architecture_overview"]:
            architecture_overview_val = doc_evidence["architecture_overview"][0][0]
            provenance["architecture_overview"] = doc_evidence["architecture_overview"][0][1]

        # 4.8 Dependencies
        dependencies_val: List[str] = []
        if doc_evidence["dependencies"]:
            dependencies_val = cls._extract_list_items(doc_evidence["dependencies"][0][0])
            provenance["dependencies"] = [
                {
                    "value": item,
                    **doc_evidence["dependencies"][0][1],
                }
                for item in dependencies_val
            ]

        # 4.9 Expected Scale (Strictly null if no explicit statement)
        expected_scale_val: Optional[str] = None
        if doc_evidence["expected_scale"]:
            expected_scale_val = doc_evidence["expected_scale"][0][0]
            provenance["expected_scale"] = doc_evidence["expected_scale"][0][1]

        # 4.10 Deployment (Strictly null if no explicit statement)
        deployment_val: Optional[str] = None
        if doc_evidence["deployment"]:
            deployment_val = doc_evidence["deployment"][0][0]
            provenance["deployment"] = doc_evidence["deployment"][0][1]

        # 4.11 Team (Strictly [] if no explicit statement)
        team_val: List[Dict[str, Any]] = []
        if doc_evidence["team"]:
            raw_team_items = cls._extract_list_items(doc_evidence["team"][0][0])
            for item in raw_team_items:
                # Basic parsing for "Name - Role" or "Name (Role)" or just "Name"
                if " - " in item:
                    parts = item.split(" - ", 1)
                    team_val.append({"name": parts[0].strip(), "role": parts[1].strip()})
                elif "(" in item and item.endswith(")"):
                    name_part, role_part = item[:-1].split("(", 1)
                    team_val.append({"name": name_part.strip(), "role": role_part.strip()})
                else:
                    team_val.append({"name": item.strip(), "role": None})

            provenance["team"] = [
                {
                    "value": m["name"],
                    **doc_evidence["team"][0][1],
                }
                for m in team_val
            ]

        # 5. Persist or update ProjectUnderstanding record
        stmt_lookup = sa.select(ProjectUnderstanding).where(
            ProjectUnderstanding.project_id == project_id
        )
        db_understanding = db.scalars(stmt_lookup).first()

        if not db_understanding:
            db_understanding = ProjectUnderstanding(
                project_id=project_id,
                status="completed",
                problem=problem_val,
                target_users=target_users_val,
                objectives=objectives_val,
                requirements_summary=requirements_summary_val,
                modules=modules_val,
                tech_stack=tech_stack_val,
                architecture_overview=architecture_overview_val,
                dependencies=dependencies_val,
                expected_scale=expected_scale_val,
                deployment=deployment_val,
                team=team_val,
                provenance=provenance,
                source_artifact_ids=source_artifact_ids,
                extracted_sections_count=extracted_sections_count,
                total_words_analyzed=total_words_analyzed,
            )
            db.add(db_understanding)
        else:
            db_understanding.status = "completed"
            db_understanding.problem = problem_val
            db_understanding.target_users = target_users_val
            db_understanding.objectives = objectives_val
            db_understanding.requirements_summary = requirements_summary_val
            db_understanding.modules = modules_val
            db_understanding.tech_stack = tech_stack_val
            db_understanding.architecture_overview = architecture_overview_val
            db_understanding.dependencies = dependencies_val
            db_understanding.expected_scale = expected_scale_val
            db_understanding.deployment = deployment_val
            db_understanding.team = team_val
            db_understanding.provenance = provenance
            db_understanding.source_artifact_ids = source_artifact_ids
            db_understanding.extracted_sections_count = extracted_sections_count
            db_understanding.total_words_analyzed = total_words_analyzed

        try:
            db.commit()
            db.refresh(db_understanding)
        except Exception:
            db.rollback()
            raise

        return db_understanding

    @staticmethod
    def get_understanding(
        db: Session,
        project_id: uuid.UUID,
    ) -> Optional[ProjectUnderstanding]:
        """Fetch the current structured project understanding for a project."""
        stmt = sa.select(ProjectUnderstanding).where(
            ProjectUnderstanding.project_id == project_id
        )
        return db.scalars(stmt).first()

    @staticmethod
    def _extract_list_items(text: str) -> List[str]:
        """Parse structured items from a section of text (bullet points or non-empty lines)."""
        if not text:
            return []

        items: List[str] = []
        for line in text.splitlines():
            line_clean = line.strip()
            # Strip heading if present on first line
            if line_clean.startswith("#"):
                continue
            # Strip bullet markers: -, *, +, numbers
            line_clean = re.sub(r"^[-*+•]\s+", "", line_clean)
            line_clean = re.sub(r"^\d+[\.\)]\s+", "", line_clean)
            line_clean = line_clean.strip()

            if line_clean and len(line_clean) > 1 and line_clean not in items:
                items.append(line_clean)

        return items
