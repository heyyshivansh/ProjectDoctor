import hashlib
import os
import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.artifact import Artifact
from app.models.document_extraction import DocumentExtraction
from app.models.requirement import Requirement, RequirementEvidence
from app.services.storage_service import storage_service
from app.schemas.requirement import (
    RequirementResponse,
    RequirementExtractionSummaryResponse,
    RequirementMetricsResponse,
)


class CandidateRequirement:
    """Intermediate data container for candidate extracted requirement."""

    def __init__(
        self,
        title: str,
        description: str,
        category: str,
        source_type: str,
        artifact_id: Optional[uuid.UUID],
        artifact_name: Optional[str],
        page_number: Optional[int],
        section_title: Optional[str],
        exact_snippet: str,
        extraction_method: str,
        confidence: float = 1.0,
        priority: Optional[str] = None,
        actor: Optional[str] = None,
        is_ambiguous: bool = False,
        conflict_summary: Optional[str] = None,
        char_offset: int = 0,
    ):
        self.title = title
        self.description = description
        self.category = category
        self.source_type = source_type
        self.artifact_id = artifact_id
        self.artifact_name = artifact_name
        self.page_number = page_number
        self.section_title = section_title
        self.exact_snippet = exact_snippet
        self.extraction_method = extraction_method
        self.confidence = confidence
        self.priority = priority
        self.actor = actor
        self.is_ambiguous = is_ambiguous
        self.conflict_summary = conflict_summary
        self.char_offset = char_offset

        # Normalized fingerprint for stable identity
        self.content_hash = self.compute_hash(description)

    @staticmethod
    def compute_hash(text: str) -> str:
        """Compute deterministic SHA-256 fingerprint from normalized statement."""
        # Strip leading numbers/bullets
        cleaned = re.sub(r"^(?:REQ[-_ ]?)?\d+(?:\.\d+)*[\.\)\:\-]?\s*", "", text, flags=re.IGNORECASE)
        cleaned = re.sub(r"^[-*+•]\s*", "", cleaned)
        # Collapse whitespace and lowercase
        cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
        # Remove trailing punctuation
        cleaned = cleaned.rstrip(".;,")
        return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()


class RequirementService:
    """Deterministic extraction engine, identity manager, and provenance tracker for requirements."""

    REQUIREMENT_SECTION_KEYWORDS = [
        "requirement",
        "functional specification",
        "system requirements",
        "features",
        "capabilities",
        "user stories",
        "scope of work",
        "specifications",
    ]

    MODAL_VERB_REGEX = re.compile(
        r"\b(shall|must|is required to|needs to|will support|allows users to|enables|should)\b",
        re.IGNORECASE,
    )

    PRIORITY_TAG_REGEX = re.compile(
        r"\[(High|Medium|Low|P0|P1|P2|Must[- ]?have|Nice[- ]?to[- ]?have|Optional)\]|\bPriority:\s*(High|Medium|Low)\b",
        re.IGNORECASE,
    )

    USER_STORY_REGEX = re.compile(
        r"^(?:As a|As an)\s+([A-Za-z0-9_\- ]+?)\s*,?\s*I\s+(?:want|need|wish)\s+to\s+(.+?)(?:\s+so that\s+(.+))?$",
        re.IGNORECASE,
    )

    VAGUE_WORDS = [
        "seamless",
        "user-friendly",
        "fast and modern",
        "best in class",
        "intuitive",
        "state of the art",
    ]

    CATEGORY_KEYWORDS = {
        "security": [
            "authentication",
            "authorization",
            "jwt",
            "token",
            "encrypt",
            "password",
            "rbac",
            "cors",
            "permission",
            "credential",
            "oauth",
            "ssl",
            "tls",
        ],
        "performance": [
            "latency",
            "throughput",
            "response time",
            "concurrent",
            "scalability",
            "qps",
            "cache",
            "caching",
            "load balancing",
        ],
        "interface": [
            "ui",
            "dashboard",
            "rest api",
            "endpoint",
            "graphql",
            "cli",
            "frontend",
            "user interface",
        ],
    }

    # Technical conflict pairs for contradiction detection across documents
    CONFLICT_PAIRS = [
        (r"\bpostgresql\b", r"\bmongodb\b", "Relational PostgreSQL vs Document MongoDB storage"),
        (r"\bsqlite\b", r"\bpostgresql\b", "SQLite vs PostgreSQL database"),
        (r"\bgoogle oauth\b", r"\bemail/password\b", "Google OAuth vs email/password authentication"),
        (r"\bjwt\b", r"\bsession cookie\b", "Stateless JWT vs session cookies"),
        (r"\breact\b", r"\bvue\b", "React vs Vue frontend framework"),
    ]

    @classmethod
    def extract_project_requirements(
        cls,
        db: Session,
        project_id: uuid.UUID,
        force_regenerate: bool = False,
    ) -> RequirementExtractionSummaryResponse:
        """Extract requirements deterministically, assign stable identities, and link provenance."""
        # 1. Fetch project
        stmt = sa.select(Project).where(Project.id == project_id)
        project = db.scalars(stmt).first()
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        # 2. Fetch completed extractions and associated artifacts
        ext_stmt = (
            sa.select(DocumentExtraction, Artifact)
            .join(Artifact, DocumentExtraction.artifact_id == Artifact.id)
            .where(
                DocumentExtraction.project_id == project_id,
                DocumentExtraction.status == "completed",
            )
            .order_by(Artifact.created_at.asc())
        )
        extraction_records = list(db.execute(ext_stmt).all())

        raw_candidates: List[CandidateRequirement] = []

        # 3. Pass 1: Declared Project Metadata
        if project.requirements and project.requirements.strip():
            metadata_candidates = cls._extract_from_metadata(project.requirements.strip())
            raw_candidates.extend(metadata_candidates)

        # 4. Pass 2 & 3: Extracted Artifact Documents
        for ext, artifact in extraction_records:
            full_text = cls._read_artifact_text(project_id, ext)
            sections = ext.sections or []

            # Page boundaries index
            page_map = cls._build_page_map(full_text)

            # Pass 2: Section-scoped outline matching
            section_candidates = cls._extract_from_sections(
                full_text=full_text,
                sections=sections,
                artifact_id=artifact.id,
                artifact_name=artifact.original_filename,
                page_map=page_map,
            )
            raw_candidates.extend(section_candidates)

            # Pass 3: Modal verb extraction from un-matched prose sections
            prose_candidates = cls._extract_from_prose(
                full_text=full_text,
                sections=sections,
                artifact_id=artifact.id,
                artifact_name=artifact.original_filename,
                page_map=page_map,
            )
            raw_candidates.extend(prose_candidates)

        # 5. Deduplication & Near-duplicate grouping
        grouped_candidates = cls._group_duplicates(raw_candidates)

        # 6. Conflict Detection
        cls._detect_conflicts(grouped_candidates)

        # 7. Stable Identity Generation & Database Upsert
        persisted_requirements = cls._persist_requirements(
            db=db,
            project_id=project_id,
            grouped_candidates=grouped_candidates,
            force_regenerate=force_regenerate,
        )

        # 8. Compute Counts
        functional_count = sum(1 for r in persisted_requirements if r.category == "functional")
        non_functional_count = sum(
            1 for r in persisted_requirements if r.category in ("non_functional", "performance", "interface")
        )
        security_count = sum(1 for r in persisted_requirements if r.category == "security")
        ambiguous_count = sum(1 for r in persisted_requirements if r.is_ambiguous)
        conflicted_count = sum(1 for r in persisted_requirements if r.status == "conflicted")

        req_responses = [
            RequirementResponse(
                id=r.id,
                project_id=r.project_id,
                requirement_id=r.requirement_id,
                title=r.title,
                description=r.description,
                category=r.category,
                priority=r.priority,
                actor=r.actor,
                status=r.status,
                is_ambiguous=r.is_ambiguous,
                conflict_summary=r.conflict_summary,
                content_hash=r.content_hash,
                evidence_count=len(r.evidence) if hasattr(r, "evidence") and r.evidence else 0,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in persisted_requirements
        ]

        return RequirementExtractionSummaryResponse(
            total_extracted=len(persisted_requirements),
            functional_count=functional_count,
            non_functional_count=non_functional_count,
            security_count=security_count,
            ambiguous_count=ambiguous_count,
            conflicted_count=conflicted_count,
            requirements=req_responses,
        )

    @classmethod
    def get_project_requirements(
        cls,
        db: Session,
        project_id: uuid.UUID,
        category: Optional[str] = None,
        status: Optional[str] = None,
        is_ambiguous: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[Requirement]:
        """Fetch requirements for a project with optional filters."""
        stmt = (
            sa.select(Requirement)
            .where(Requirement.project_id == project_id)
            .order_by(Requirement.requirement_id.asc())
        )

        if category:
            stmt = stmt.where(Requirement.category == category)
        if status:
            stmt = stmt.where(Requirement.status == status)
        if is_ambiguous is not None:
            stmt = stmt.where(Requirement.is_ambiguous == is_ambiguous)
        if search and search.strip():
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                sa.or_(
                    Requirement.title.ilike(search_pattern),
                    Requirement.description.ilike(search_pattern),
                    Requirement.requirement_id.ilike(search_pattern),
                )
            )

        return list(db.scalars(stmt).all())

    @classmethod
    def get_requirement_detail(
        cls,
        db: Session,
        project_id: uuid.UUID,
        requirement_id: str,
    ) -> Optional[Requirement]:
        """Fetch requirement by UUID or human-readable code (e.g. REQ-001)."""
        stmt = sa.select(Requirement).where(Requirement.project_id == project_id)

        # Check if UUID or human-readable identifier
        try:
            req_uuid = uuid.UUID(requirement_id)
            stmt = stmt.where(Requirement.id == req_uuid)
        except ValueError:
            stmt = stmt.where(Requirement.requirement_id == requirement_id)

        return db.scalars(stmt).first()

    @classmethod
    def get_requirements_metrics(
        cls,
        db: Session,
        project_id: uuid.UUID,
    ) -> RequirementMetricsResponse:
        """Calculate aggregate metrics for requirements."""
        stmt = sa.select(Requirement).where(Requirement.project_id == project_id)
        requirements = list(db.scalars(stmt).all())

        by_category: Dict[str, int] = {}
        by_priority: Dict[str, int] = {}
        by_status: Dict[str, int] = {}
        ambiguous_count = 0
        conflict_count = 0

        for req in requirements:
            by_category[req.category] = by_category.get(req.category, 0) + 1
            priority_key = req.priority or "unspecified"
            by_priority[priority_key] = by_priority.get(priority_key, 0) + 1
            by_status[req.status] = by_status.get(req.status, 0) + 1
            if req.is_ambiguous:
                ambiguous_count += 1
            if req.status == "conflicted":
                conflict_count += 1

        return RequirementMetricsResponse(
            total=len(requirements),
            by_category=by_category,
            by_priority=by_priority,
            by_status=by_status,
            ambiguous_count=ambiguous_count,
            conflict_count=conflict_count,
        )

    # --------------------------------------------------------------------------
    # INTERNAL EXTRACTION PASSES
    # --------------------------------------------------------------------------

    @classmethod
    def _extract_from_metadata(cls, text: str) -> List[CandidateRequirement]:
        """Extract requirements from declared project metadata string."""
        candidates: List[CandidateRequirement] = []
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        for i, line in enumerate(lines):
            clean_text = line
            # Strip markdown list markers
            clean_text = re.sub(r"^[-*+•]\s*", "", clean_text)
            clean_text = re.sub(r"^(?:REQ[-_ ]?)?\d+(?:\.\d+)*[\.\)\:\-]?\s*", "", clean_text, flags=re.IGNORECASE)
            clean_text = clean_text.strip()

            if len(clean_text) < 5:
                continue

            priority = cls._extract_priority(line)
            actor = cls._extract_actor(line)
            category = cls._classify_category(clean_text, section_name="")
            title = cls._generate_title(clean_text)
            is_ambiguous = cls._check_ambiguity(clean_text)

            candidates.append(
                CandidateRequirement(
                    title=title,
                    description=clean_text,
                    category=category,
                    source_type="project_metadata",
                    artifact_id=None,
                    artifact_name="project_metadata",
                    page_number=None,
                    section_title="Declared Requirements",
                    exact_snippet=line[:500],
                    extraction_method="metadata_field",
                    confidence=1.0,
                    priority=priority,
                    actor=actor,
                    is_ambiguous=is_ambiguous,
                    char_offset=i,
                )
            )

        return candidates

    @classmethod
    def _extract_from_sections(
        cls,
        full_text: str,
        sections: List[dict],
        artifact_id: uuid.UUID,
        artifact_name: str,
        page_map: List[Tuple[int, int]],
    ) -> List[CandidateRequirement]:
        """Extract requirements from sections whose headers indicate requirements."""
        candidates: List[CandidateRequirement] = []

        for i, sec in enumerate(sections):
            title = sec.get("title", "").strip().lower()
            clean_title = re.sub(r"^[#\s\d.-]+", "", title).strip()

            is_req_section = any(kw in clean_title for kw in cls.REQUIREMENT_SECTION_KEYWORDS)
            if not is_req_section:
                continue

            start_char = sec.get("start_char", 0)
            next_start = sections[i + 1].get("start_char") if i + 1 < len(sections) else len(full_text)
            section_content = full_text[start_char:next_start] if full_text else sec.get("text_preview", "")

            # Parse lines in this section
            for line_idx, line in enumerate(section_content.splitlines()):
                line_str = line.strip()
                if not line_str or line_str.startswith("#"):
                    continue

                # Check for numbered list e.g. "1. User authentication..." or "REQ-01: ..."
                num_match = re.match(r"^(?:REQ[-_ ]?)?(\d+(?:\.\d+)*)[\.\)\:\-]\s*(.+)$", line_str, re.IGNORECASE)
                bullet_match = re.match(r"^[\*\-\+•]\s*(.+)$", line_str)
                user_story_match = cls.USER_STORY_REGEX.match(line_str)

                method = "heading_section"
                item_text = line_str

                if user_story_match:
                    method = "user_story"
                    item_text = line_str
                elif num_match:
                    method = "numbered_list"
                    item_text = num_match.group(2).strip()
                elif bullet_match:
                    method = "bullet_list"
                    item_text = bullet_match.group(1).strip()
                elif cls.MODAL_VERB_REGEX.search(line_str):
                    method = "modal_keyword"
                    item_text = line_str
                else:
                    continue

                if len(item_text) < 10:
                    continue

                char_pos = start_char + section_content.find(line_str)
                page_num = cls._resolve_page_number(char_pos, page_map)

                priority = cls._extract_priority(line_str)
                actor = cls._extract_actor(line_str)
                category = cls._classify_category(item_text, section_name=clean_title)
                title_text = cls._generate_title(item_text)
                is_ambiguous = cls._check_ambiguity(item_text)

                candidates.append(
                    CandidateRequirement(
                        title=title_text,
                        description=item_text,
                        category=category,
                        source_type="artifact",
                        artifact_id=artifact_id,
                        artifact_name=artifact_name,
                        page_number=page_num,
                        section_title=sec.get("title", ""),
                        exact_snippet=line_str[:500],
                        extraction_method=method,
                        confidence=1.0 if method != "modal_keyword" else 0.8,
                        priority=priority,
                        actor=actor,
                        is_ambiguous=is_ambiguous,
                        char_offset=char_pos,
                    )
                )

        return candidates

    @classmethod
    def _extract_from_prose(
        cls,
        full_text: str,
        sections: List[dict],
        artifact_id: uuid.UUID,
        artifact_name: str,
        page_map: List[Tuple[int, int]],
    ) -> List[CandidateRequirement]:
        """Extract requirements from prose outside explicit requirement sections using modal verbs."""
        candidates: List[CandidateRequirement] = []
        if not full_text:
            return candidates

        # Find spans covered by explicit requirement sections to avoid double extraction
        excluded_spans: List[Tuple[int, int]] = []
        for i, sec in enumerate(sections):
            clean_title = re.sub(r"^[#\s\d.-]+", "", sec.get("title", "").strip().lower()).strip()
            if any(kw in clean_title for kw in cls.REQUIREMENT_SECTION_KEYWORDS):
                start = sec.get("start_char", 0)
                end = sections[i + 1].get("start_char") if i + 1 < len(sections) else len(full_text)
                excluded_spans.append((start, end))

        # Sentence segmentation by punctuation + space
        sentences = re.split(r"(?<=[.!?])\s+", full_text)
        current_offset = 0

        for sentence in sentences:
            sentence_clean = sentence.strip()
            sent_len = len(sentence)
            start_offset = current_offset
            current_offset += sent_len + 1

            if len(sentence_clean) < 20 or len(sentence_clean) > 400:
                continue

            # Check if sentence is inside an excluded section
            in_excluded = any(s <= start_offset < e for s, e in excluded_spans)
            if in_excluded:
                continue

            # Check for modal verbs ("shall", "must", "needs to")
            if not cls.MODAL_VERB_REGEX.search(sentence_clean):
                continue

            # Filter out table of contents or question lines
            if re.search(r"\.{3,}\s*\d+$", sentence_clean) or sentence_clean.endswith("?"):
                continue

            page_num = cls._resolve_page_number(start_offset, page_map)
            sec_title = cls._resolve_section_title(start_offset, sections)

            priority = cls._extract_priority(sentence_clean)
            actor = cls._extract_actor(sentence_clean)
            category = cls._classify_category(sentence_clean, section_name=sec_title)
            title = cls._generate_title(sentence_clean)
            is_ambiguous = cls._check_ambiguity(sentence_clean)

            candidates.append(
                CandidateRequirement(
                    title=title,
                    description=sentence_clean,
                    category=category,
                    source_type="artifact",
                    artifact_id=artifact_id,
                    artifact_name=artifact_name,
                    page_number=page_num,
                    section_title=sec_title,
                    exact_snippet=sentence_clean[:500],
                    extraction_method="modal_keyword",
                    confidence=0.8,
                    priority=priority,
                    actor=actor,
                    is_ambiguous=is_ambiguous,
                    char_offset=start_offset,
                )
            )

        return candidates

    # --------------------------------------------------------------------------
    # DEDUPLICATION & CONFLICT ANALYSIS
    # --------------------------------------------------------------------------

    @classmethod
    def _group_duplicates(
        cls,
        candidates: List[CandidateRequirement],
    ) -> List[Tuple[CandidateRequirement, List[CandidateRequirement]]]:
        """Group exact duplicates and near-duplicates into canonical requirements + evidence list."""
        # 1. Exact hash grouping
        hash_map: Dict[str, List[CandidateRequirement]] = {}
        for c in candidates:
            hash_map.setdefault(c.content_hash, []).append(c)

        initial_groups: List[List[CandidateRequirement]] = list(hash_map.values())

        # 2. Near-duplicate merging via Jaccard token overlap
        final_groups: List[List[CandidateRequirement]] = []
        used_indices: Set[int] = set()

        for i in range(len(initial_groups)):
            if i in used_indices:
                continue
            primary_group = initial_groups[i]
            primary_item = primary_group[0]
            tokens_a = set(re.findall(r"\w+", primary_item.description.lower()))

            merged_group = list(primary_group)

            for j in range(i + 1, len(initial_groups)):
                if j in used_indices:
                    continue
                cand_item = initial_groups[j][0]
                if cand_item.category != primary_item.category:
                    continue

                tokens_b = set(re.findall(r"\w+", cand_item.description.lower()))
                if not tokens_a or not tokens_b:
                    continue

                jaccard = len(tokens_a & tokens_b) / len(tokens_a | tokens_b)
                if jaccard >= 0.80:
                    merged_group.extend(initial_groups[j])
                    used_indices.add(j)

            used_indices.add(i)
            final_groups.append(merged_group)

        # Select primary representative (prefer metadata or higher confidence)
        result: List[Tuple[CandidateRequirement, List[CandidateRequirement]]] = []
        for grp in final_groups:
            # Sort: metadata first, then highest confidence, then shortest description
            sorted_grp = sorted(
                grp,
                key=lambda x: (
                    0 if x.source_type == "project_metadata" else 1,
                    -x.confidence,
                    len(x.description),
                ),
            )
            canonical = sorted_grp[0]
            result.append((canonical, grp))

        return result

    @classmethod
    def _detect_conflicts(
        cls,
        grouped: List[Tuple[CandidateRequirement, List[CandidateRequirement]]],
    ) -> None:
        """Scan across requirements and evidence for mutually exclusive technical declarations."""
        for canon, evidence_list in grouped:
            for pat_a, pat_b, summary in cls.CONFLICT_PAIRS:
                has_a = any(re.search(pat_a, e.description, re.IGNORECASE) for e in evidence_list)
                has_b = any(re.search(pat_b, e.description, re.IGNORECASE) for e in evidence_list)

                # Check if conflicting evidence across items
                if has_a and has_b:
                    canon.conflict_summary = f"Contradiction detected: {summary}"
                    canon.is_ambiguous = True

    # --------------------------------------------------------------------------
    # STABLE IDENTITY & DATABASE PERSISTENCE
    # --------------------------------------------------------------------------

    @classmethod
    def _persist_requirements(
        cls,
        db: Session,
        project_id: uuid.UUID,
        grouped_candidates: List[Tuple[CandidateRequirement, List[CandidateRequirement]]],
        force_regenerate: bool = False,
    ) -> List[Requirement]:
        """Persist canonical requirements while preserving stable identifiers across re-runs."""
        # Fetch existing requirements for this project
        stmt = sa.select(Requirement).where(Requirement.project_id == project_id)
        existing_reqs = list(db.scalars(stmt).all())
        existing_by_hash: Dict[str, Requirement] = {r.content_hash: r for r in existing_reqs}

        # Calculate next numerical ID e.g. REQ-001 -> 1
        max_id_num = 0
        for r in existing_reqs:
            match = re.match(r"^REQ-(\d+)$", r.requirement_id)
            if match:
                max_id_num = max(max_id_num, int(match.group(1)))

        persisted: List[Requirement] = []
        seen_hashes: Set[str] = set()

        for canonical, evidence_list in grouped_candidates:
            seen_hashes.add(canonical.content_hash)
            existing = existing_by_hash.get(canonical.content_hash)

            status_val = "conflicted" if canonical.conflict_summary else "extracted"

            if existing:
                # Preserve stable ID and internal UUID
                existing.title = canonical.title
                existing.description = canonical.description
                existing.category = canonical.category
                existing.priority = canonical.priority or existing.priority
                existing.actor = canonical.actor or existing.actor
                existing.is_ambiguous = canonical.is_ambiguous or existing.is_ambiguous
                existing.conflict_summary = canonical.conflict_summary or existing.conflict_summary
                existing.status = status_val
                req_obj = existing
            else:
                max_id_num += 1
                stable_code = f"REQ-{max_id_num:03d}"
                req_obj = Requirement(
                    project_id=project_id,
                    requirement_id=stable_code,
                    title=canonical.title,
                    description=canonical.description,
                    category=canonical.category,
                    priority=canonical.priority,
                    actor=canonical.actor,
                    status=status_val,
                    is_ambiguous=canonical.is_ambiguous,
                    conflict_summary=canonical.conflict_summary,
                    content_hash=canonical.content_hash,
                )
                db.add(req_obj)
                db.flush()

            # Synchronize evidence records
            cls._sync_evidence(db, project_id, req_obj, evidence_list)
            persisted.append(req_obj)

        # Mark removed requirements as deprecated if not found in current extraction
        for old_hash, old_req in existing_by_hash.items():
            if old_hash not in seen_hashes:
                if force_regenerate:
                    db.delete(old_req)
                else:
                    old_req.status = "deprecated"

        try:
            db.commit()
            for r in persisted:
                db.refresh(r)
        except Exception:
            db.rollback()
            raise

        # Sort by requirement_id ascending
        persisted.sort(key=lambda x: x.requirement_id)
        return persisted

    @classmethod
    def _sync_evidence(
        cls,
        db: Session,
        project_id: uuid.UUID,
        requirement: Requirement,
        evidence_list: List[CandidateRequirement],
    ) -> None:
        """Add or update requirement evidence items without duplicate rows."""
        # Existing evidence signatures
        existing_sigs: Set[Tuple[str, Optional[uuid.UUID], str]] = {
            (e.source_type, e.artifact_id, e.exact_snippet)
            for e in requirement.evidence
        }

        for cand in evidence_list:
            sig = (cand.source_type, cand.artifact_id, cand.exact_snippet)
            if sig not in existing_sigs:
                evidence_row = RequirementEvidence(
                    requirement_id=requirement.id,
                    project_id=project_id,
                    artifact_id=cand.artifact_id,
                    source_type=cand.source_type,
                    artifact_name=cand.artifact_name,
                    page_number=cand.page_number,
                    section_title=cand.section_title,
                    exact_snippet=cand.exact_snippet,
                    extraction_method=cand.extraction_method,
                    confidence=cand.confidence,
                )
                db.add(evidence_row)
                existing_sigs.add(sig)

    # --------------------------------------------------------------------------
    # HELPER PARSING UTILITIES
    # --------------------------------------------------------------------------

    @classmethod
    def _extract_priority(cls, text: str) -> Optional[str]:
        """Extract explicit priority tag if present; otherwise strictly None."""
        match = cls.PRIORITY_TAG_REGEX.search(text)
        if match:
            val = (match.group(1) or match.group(2) or "").strip().lower()
            if val in ("p0", "high", "must-have", "must have"):
                return "high"
            elif val in ("p1", "medium"):
                return "medium"
            elif val in ("p2", "low", "nice-to-have", "nice to have", "optional"):
                return "low"
            return val
        return None

    @classmethod
    def _extract_actor(cls, text: str) -> Optional[str]:
        """Extract user role / actor if explicitly indicated; otherwise strictly None."""
        clean = re.sub(r"^[-*+•]\s*", "", text).strip()
        clean = re.sub(r"^(?:REQ[-_ ]?)?\d+(?:\.\d+)*[\.\)\:\-]?\s*", "", clean, flags=re.IGNORECASE).strip()
        story_match = cls.USER_STORY_REGEX.match(clean)
        if story_match:
            role = story_match.group(1).strip()
            if len(role) < 40 and not role.lower().startswith("system"):
                return role.capitalize()

        # Modal with subject role: "The [Admin] shall..."
        actor_match = re.match(
            r"^(?:The|An?)\s+([A-Z][a-zA-Z0-9_\- ]+?)\s+(?:shall|must|is required to)\b",
            clean,
        )
        if actor_match:
            actor_candidate = actor_match.group(1).strip()
            if actor_candidate.lower() not in ("system", "application", "platform", "software", "api"):
                return actor_candidate.capitalize()

        return None


    @classmethod
    def _classify_category(cls, text: str, section_name: str) -> str:
        """Classify requirement into domain category using deterministic keyword heuristics."""
        sec_lower = section_name.lower()
        text_lower = text.lower()

        if "security" in sec_lower:
            return "security"
        if "performance" in sec_lower or "scale" in sec_lower:
            return "performance"
        if "interface" in sec_lower or "ui" in sec_lower or "frontend" in sec_lower:
            return "interface"
        if "non-functional" in sec_lower:
            return "non_functional"

        # Check content keywords
        for cat, keywords in cls.CATEGORY_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return cat

        return "functional"

    @classmethod
    def _generate_title(cls, text: str) -> str:
        """Create concise readable title from first clause or sentence."""
        # Remove user story preamble if present
        story_match = cls.USER_STORY_REGEX.match(text)
        if story_match:
            action = story_match.group(2).strip()
            return action[:80].capitalize().rstrip(".;,")

        # Take first sentence or split at comma/semicolon if long
        first_sent = re.split(r"[.!?]\s+", text)[0].strip()
        if len(first_sent) > 80:
            first_sent = first_sent[:77].rsplit(" ", 1)[0] + "..."
        return first_sent.capitalize().rstrip(".;,")

    @classmethod
    def _check_ambiguity(cls, text: str) -> bool:
        """Check if statement is vague or lacks concrete testable criteria."""
        text_lower = text.lower()
        has_vague = any(vw in text_lower for vw in cls.VAGUE_WORDS)
        too_brief = len(text.split()) < 4
        return has_vague or too_brief

    @classmethod
    def _read_artifact_text(cls, project_id: uuid.UUID, ext: DocumentExtraction) -> str:
        """Read normalized authoritative text from disk or fallback to preview."""
        if ext.text_storage_path:
            try:
                file_path = storage_service.get_processed_text_path(project_id, ext.artifact_id)
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    return f.read()
            except Exception:
                pass
        return ext.text_preview or ""

    @classmethod
    def _build_page_map(cls, full_text: str) -> List[Tuple[int, int]]:
        """Map character offsets to 1-based page numbers based on '--- Page X ---' delimiters."""
        page_map: List[Tuple[int, int]] = []
        for match in re.finditer(r"--- Page (\d+) ---\n", full_text):
            page_num = int(match.group(1))
            offset = match.start()
            page_map.append((offset, page_num))
        return page_map

    @classmethod
    def _resolve_page_number(cls, char_offset: int, page_map: List[Tuple[int, int]]) -> Optional[int]:
        """Resolve page number for a given character offset."""
        if not page_map:
            return None
        current_page = page_map[0][1]
        for offset, page_num in page_map:
            if char_offset >= offset:
                current_page = page_num
            else:
                break
        return current_page

    @classmethod
    def _resolve_section_title(cls, char_offset: int, sections: List[dict]) -> str:
        """Find the enclosing section title for a character offset."""
        if not sections:
            return "Document Body"
        current_title = "Document Body"
        for sec in sections:
            start = sec.get("start_char", 0)
            if char_offset >= start:
                current_title = sec.get("title", current_title)
            else:
                break
        return current_title
