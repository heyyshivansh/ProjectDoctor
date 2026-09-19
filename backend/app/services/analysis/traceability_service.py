import hashlib
import os
import re
import uuid
from typing import Dict, List, Optional, Set, Tuple
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
from app.schemas.traceability import (
    RequirementTraceabilitySummaryResponse,
    RequirementTraceabilityDetailResponse,
    TraceabilityLinkResponse,
    TraceabilityMetricsResponse,
    TraceabilityGenerationResponse,
)
from app.schemas.requirement import RequirementEvidenceResponse

STOPWORDS: Set[str] = {
    # English language stopwords
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at",
    "from", "by", "for", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "to", "of", "in", "on", "off",
    "over", "under", "again", "further", "once", "here", "there", "all", "any",
    "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can",
    "will", "just", "don", "should", "now", "shall", "must", "would", "could",
    "may", "might", "needs", "need", "allow", "allows", "allowed", "support",
    "supports", "supported", "system", "users", "user", "team", "student",
    "project", "application", "feature", "features", "function", "functions",
    "able", "provide", "provides", "provided", "ensure", "ensures", "handling",
    # Generic software stopwords
    "file", "files", "data", "index", "common", "util", "utils", "helper",
    "helpers", "base", "app", "service", "services", "handler", "handlers",
    "controller", "controllers", "router", "routes", "route", "model", "models",
    "schema", "schemas", "type", "types", "src", "lib", "package", "config",
    "init", "main", "run", "build", "dist", "core", "impl", "default", "internal",
}

DOMAIN_SYNONYMS: Dict[str, Set[str]] = {
    "auth": {
        "auth", "authenticate", "authentication", "login", "logout", "signin",
        "signup", "register", "jwt", "token", "password", "credential", "bcrypt",
        "oauth", "session", "permission", "rbac", "role",
    },
    "security": {
        "security", "encrypt", "encryption", "hash", "secret", "ssl", "tls",
        "sanitize", "cors", "csrf", "token", "jwt", "auth",
    },
    "upload": {
        "upload", "uploading", "uploaded", "uploader", "storage", "multipart",
        "attachment", "file", "download", "document",
    },
    "document": {
        "document", "documents", "doc", "docx", "pdf", "file", "text", "artifact",
        "artifacts", "extract", "extraction", "srs", "proposal",
    },
    "rubric": {
        "rubric", "evaluation", "evaluator", "eval", "grading", "grade",
        "score", "scoring", "criterion", "criteria", "assessment",
    },
    "jury": {
        "jury", "defense", "presentation", "question", "questions", "simulator",
        "interview", "qa",
    },
    "database": {
        "database", "db", "sqlite", "postgres", "postgresql", "mysql", "mongo",
        "mongodb", "sql", "orm", "repository", "crud", "query",
    },
    "notification": {
        "notification", "notifications", "notify", "alert", "alerts", "email",
        "sms", "message", "messaging",
    },
    "dashboard": {
        "dashboard", "ui", "frontend", "interface", "component", "page",
        "view", "form", "client", "screen",
    },
}

TEST_DIR_PATTERNS = ["tests/", "test/", "spec/", "specs/"]
TEST_FILE_PATTERNS = ["test_", "_test.", ".spec.", ".test."]


def tokenize_text(text: str) -> List[str]:
    """Extract lowercased alphanumeric tokens from text excluding stopwords."""
    words = re.findall(r"[A-Za-z0-9]+", text.lower())
    return [w for w in words if len(w) >= 3 and w not in STOPWORDS]


def expand_tokens(tokens: List[str], category: Optional[str] = None) -> Set[str]:
    """Expand tokens with domain-specific synonym anchors."""
    expanded = set(tokens)

    # Category hints
    if category:
        cat_lower = category.lower()
        if cat_lower in DOMAIN_SYNONYMS:
            expanded.update(DOMAIN_SYNONYMS[cat_lower])
        if "security" in cat_lower or "auth" in cat_lower:
            expanded.update(DOMAIN_SYNONYMS["auth"])
        elif "interface" in cat_lower or "ui" in cat_lower:
            expanded.update(DOMAIN_SYNONYMS["dashboard"])

    # Expand any matched keywords
    for t in list(expanded):
        for domain_key, synonyms in DOMAIN_SYNONYMS.items():
            if t in synonyms or t == domain_key:
                expanded.update(synonyms)

    return expanded


def is_test_file(file_path: str) -> bool:
    """Deterministically check if file represents an automated test suite."""
    norm = file_path.replace("\\", "/").lower()
    base = os.path.basename(norm)
    if any(pattern in norm for pattern in TEST_DIR_PATTERNS):
        return True
    if any(pattern in base for pattern in TEST_FILE_PATTERNS):
        return True
    return False


def _is_competing_variant(stem1: str, stem2: str) -> bool:
    """Check if two file stems represent competing candidate variants in the same directory."""
    s1, s2 = stem1.lower(), stem2.lower()
    if s1 == s2:
        return True
    variant_pattern = r"^(.+?)(?:_?v\d+|_?new|_?old|_?backup|_?copy|_?temp|_\d+|\d+)$"
    m1 = re.match(variant_pattern, s1)
    m2 = re.match(variant_pattern, s2)
    root1 = m1.group(1) if m1 else s1
    root2 = m2.group(1) if m2 else s2
    if root1 == root2 or root1 == s2 or root2 == s1:
        return True
    if (
        s1.startswith(f"{s2}_")
        or s2.startswith(f"{s1}_")
        or s1.startswith(f"{s2}-")
        or s2.startswith(f"{s1}-")
    ):
        return True
    return False


class CandidateMatch:
    """Intermediate candidate match scored between a requirement and a repository file."""

    def __init__(
        self,
        file_record: RepositoryFile,
        score: float,
        level: str,
        rationale: str,
        is_test: bool,
        evidence_type: str = "implementation_code",
        line_start: Optional[int] = None,
        line_end: Optional[int] = None,
        code_snippet: Optional[str] = None,
        evidence_id: Optional[uuid.UUID] = None,
    ):
        self.file_record = file_record
        self.score = score
        self.level = level
        self.rationale = rationale
        self.is_test = is_test
        self.evidence_type = evidence_type
        self.line_start = line_start
        self.line_end = line_end
        self.code_snippet = code_snippet
        self.evidence_id = evidence_id


class TraceabilityService:
    """Deterministic requirement-to-implementation traceability engine."""

    @classmethod
    def generate_traceability(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
        force: bool = False,
    ) -> TraceabilityGenerationResponse:
        """Run deterministic traceability matching across all project requirements for a snapshot."""
        # 1. Fetch project
        stmt = sa.select(Project).where(Project.id == project_id)
        project = db.scalars(stmt).first()
        if not project:
            raise ValueError(f"Project '{project_id}' not found.")

        # 2. Fetch repository
        repo_stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
        repo = db.scalars(repo_stmt).first()
        if not repo:
            raise ValueError(f"No GitHub repository connected for project '{project_id}'.")

        # 3. Determine target snapshot
        if snapshot_id:
            snap_stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.project_id == project_id,
            )
            snapshot = db.scalars(snap_stmt).first()
            if not snapshot:
                raise ValueError(f"Repository snapshot '{snapshot_id}' not found for project.")
        else:
            snap_stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.repository_id == repo.id,
                RepositorySnapshot.is_current == True,
            )
            snapshot = db.scalars(snap_stmt).first()
            if not snapshot:
                raise ValueError("No active repository snapshot found. Please sync the repository first.")

        # 4. Fetch all requirements for the project
        req_stmt = (
            sa.select(Requirement)
            .where(Requirement.project_id == project_id)
            .order_by(Requirement.requirement_id.asc())
        )
        requirements = list(db.scalars(req_stmt).all())
        if not requirements:
            # Return empty response if no requirements extracted yet
            metrics = TraceabilityMetricsResponse(
                project_id=project_id,
                snapshot_id=snapshot.id,
                commit_sha=snapshot.commit_sha,
                has_repository=True,
                total_requirements=0,
                candidate_with_tests_count=0,
                candidate_count=0,
                unmatched_count=0,
                ambiguous_count=0,
                coverage_percentage=0.0,
            )
            return TraceabilityGenerationResponse(
                status="no_requirements",
                message="No requirements extracted for this project. Please extract requirements first.",
                snapshot_id=snapshot.id,
                commit_sha=snapshot.commit_sha,
                total_requirements=0,
                generated_links_count=0,
                metrics=metrics,
            )

        # 5. Fetch repository files and evidence for this snapshot
        files_stmt = (
            sa.select(RepositoryFile)
            .where(
                RepositoryFile.snapshot_id == snapshot.id,
                RepositoryFile.is_ignored == False,
                RepositoryFile.is_binary == False,
                RepositoryFile.content_status != "security_omitted",
            )
        )
        repo_files = list(db.scalars(files_stmt).all())

        ev_stmt = sa.select(RepositoryEvidence).where(RepositoryEvidence.snapshot_id == snapshot.id)
        repo_evidence = list(db.scalars(ev_stmt).all())
        evidence_by_file: Dict[str, List[RepositoryEvidence]] = {}
        for ev in repo_evidence:
            evidence_by_file.setdefault(ev.file_path, []).append(ev)

        # 6. Execute matching per requirement inside a savepoint
        generated_links_count = 0
        persisted_summaries: List[RequirementSnapshotTraceability] = []

        with db.begin_nested():
            # If force=True or re-running, clean up previous traceability for this snapshot
            existing_summaries_stmt = sa.select(RequirementSnapshotTraceability).where(
                RequirementSnapshotTraceability.snapshot_id == snapshot.id,
                RequirementSnapshotTraceability.project_id == project_id,
            )
            existing_summaries = list(db.scalars(existing_summaries_stmt).all())
            for old_summary in existing_summaries:
                db.delete(old_summary)
            db.flush()

            for req in requirements:
                # Tokenize requirement
                req_tokens = tokenize_text(f"{req.title} {req.description} {req.actor or ''}")
                expanded_tokens = expand_tokens(req_tokens, req.category)

                # Match candidate files
                candidates = cls._score_files_for_requirement(
                    req=req,
                    req_tokens=req_tokens,
                    expanded_tokens=expanded_tokens,
                    files=repo_files,
                    evidence_by_file=evidence_by_file,
                )

                # Separate implementation and test candidates
                impl_candidates = [c for c in candidates if not c.is_test]
                test_candidates = [c for c in candidates if c.is_test]

                # Cap candidates: top 5 impl, top 3 test
                capped_impl = impl_candidates[:5]
                capped_test = test_candidates[:3]

                # Determine overall requirement status
                status, notes = cls._determine_status(
                    impl_candidates=capped_impl,
                    test_candidates=capped_test,
                )

                # Create summary record
                summary_record = RequirementSnapshotTraceability(
                    project_id=project_id,
                    requirement_id=req.id,
                    snapshot_id=snapshot.id,
                    commit_sha=snapshot.commit_sha,
                    status=status,
                    implementation_count=len(capped_impl),
                    test_count=len(capped_test),
                    summary_notes=notes,
                )
                db.add(summary_record)
                db.flush()  # Obtain summary_record.id

                # Create link records
                all_capped = capped_impl + capped_test
                for c in all_capped:
                    line_start = c.line_start or 1
                    line_end = c.line_end or (line_start + (c.code_snippet.count("\n") if c.code_snippet else 1))
                    link_hash = hashlib.sha256(
                        f"{snapshot.id}:{req.id}:{c.file_record.file_path}:{line_start}".encode("utf-8")
                    ).hexdigest()

                    link_record = RequirementTraceabilityLink(
                        traceability_id=summary_record.id,
                        project_id=project_id,
                        requirement_id=req.id,
                        snapshot_id=snapshot.id,
                        commit_sha=snapshot.commit_sha,
                        repository_file_id=c.file_record.id,
                        repository_evidence_id=c.evidence_id,
                        file_path=c.file_record.file_path,
                        evidence_type=c.evidence_type,
                        is_test_evidence=c.is_test,
                        match_confidence=round(c.score, 2),
                        match_level=c.level,
                        match_rationale=c.rationale,
                        line_start=line_start,
                        line_end=line_end,
                        code_snippet=c.code_snippet,
                        link_hash=link_hash,
                    )
                    db.add(link_record)
                    generated_links_count += 1

                persisted_summaries.append(summary_record)

        db.commit()

        # Compute metrics
        metrics = cls._compute_metrics(
            project_id=project_id,
            snapshot=snapshot,
            summaries=persisted_summaries,
        )

        return TraceabilityGenerationResponse(
            status="completed",
            message=f"Generated traceability for {len(requirements)} requirement(s) at commit {snapshot.commit_sha[:7]}.",
            snapshot_id=snapshot.id,
            commit_sha=snapshot.commit_sha,
            total_requirements=len(requirements),
            generated_links_count=generated_links_count,
            metrics=metrics,
        )

    @classmethod
    def _score_files_for_requirement(
        cls,
        req: Requirement,
        req_tokens: List[str],
        expanded_tokens: Set[str],
        files: List[RepositoryFile],
        evidence_by_file: Dict[str, List[RepositoryEvidence]],
    ) -> List[CandidateMatch]:
        """Score repository files against requirement tokens using multi-signal heuristics."""
        candidates: List[CandidateMatch] = []

        for f in files:
            is_test = is_test_file(f.file_path)
            f_path = f.file_path.replace("\\", "/").lower()
            f_base = os.path.basename(f_path)
            f_name_no_ext, _ = os.path.splitext(f_base)

            # Remove test_ or _test prefix/suffix from base name if test file
            clean_base = f_name_no_ext
            if is_test:
                clean_base = re.sub(r"^(test_|spec_)", "", clean_base, flags=re.IGNORECASE)
                clean_base = re.sub(r"(_test|_spec)$", "", clean_base, flags=re.IGNORECASE)

            # Tokenize file name and directory
            fname_tokens = set(tokenize_text(clean_base))
            path_tokens = set(tokenize_text(os.path.dirname(f_path)))

            score = 0.0
            reasons: List[str] = []

            # Stem-aware token matching
            exact_fname_matches = [
                ft for ft in fname_tokens
                if any(
                    ft == rt or (len(ft) >= 4 and len(rt) >= 4 and (ft.startswith(rt) or rt.startswith(ft)))
                    for rt in req_tokens
                )
            ]
            expanded_fname_matches = fname_tokens.intersection(expanded_tokens)

            if exact_fname_matches:
                score += 0.45
                reasons.append(f"Filename matches '{', '.join(sorted(exact_fname_matches))}'")
            elif expanded_fname_matches:
                score += 0.40
                reasons.append(f"Filename relates to '{', '.join(sorted(expanded_fname_matches))}'")

            # Test suite correlation bonus
            if is_test and (exact_fname_matches or expanded_fname_matches):
                score += 0.15
                reasons.append("Matching test suite")

            # Signal 2: Directory Path Semantics (Weight: 0.25)
            exact_path_matches = [
                pt for pt in path_tokens
                if any(
                    pt == rt or (len(pt) >= 4 and len(rt) >= 4 and (pt.startswith(rt) or rt.startswith(pt)))
                    for rt in req_tokens
                )
            ]
            expanded_path_matches = path_tokens.intersection(expanded_tokens)
            if exact_path_matches:
                score += 0.25
                reasons.append(f"Directory matches '{', '.join(sorted(exact_path_matches))}'")
            elif expanded_path_matches:
                score += 0.15
                reasons.append(f"Directory relates to '{', '.join(sorted(expanded_path_matches))}'")

            # Signal 3: Evidence Snippet Match (Weight: 0.35)
            ev_list = evidence_by_file.get(f.file_path, [])
            matched_evidence: Optional[RepositoryEvidence] = None
            evidence_type = "test_evidence" if is_test else "implementation_code"

            candidate_terms = list(dict.fromkeys(req_tokens + list(expanded_tokens)))

            for ev in ev_list:
                snippet = (ev.content_snippet or "").lower()
                # Check for route decorators (e.g. @router.get("/login"), app.post)
                for t in candidate_terms:
                    if f"/{t}" in snippet or f"'{t}" in snippet or f'"{t}' in snippet:
                        score += 0.35
                        reasons.append(f"Route decorator contains '{t}'")
                        matched_evidence = ev
                        if not is_test:
                            evidence_type = "route_endpoint"
                        break
                    elif (
                        (f"def " in snippet and t in snippet)
                        or (f"class " in snippet and t in snippet)
                        or (f"test_" in snippet and t in snippet)
                    ):
                        score += 0.30
                        reasons.append(f"Symbol declaration matches '{t}'")
                        matched_evidence = ev
                        break

                if matched_evidence:
                    break

            # Manifest check: e.g. JWT or bcrypt dependency in package.json/requirements.txt
            if not matched_evidence and ev_list and any(e.evidence_type == "manifest" for e in ev_list):
                man_ev = next(e for e in ev_list if e.evidence_type == "manifest")
                man_snippet = (man_ev.content_snippet or "").lower()
                for t in candidate_terms:
                    if t in man_snippet:
                        score += 0.20
                        reasons.append(f"Manifest dependency references '{t}'")
                        matched_evidence = man_ev
                        evidence_type = "manifest_dependency"
                        break

            # Discard weak matches below threshold
            if score < 0.35:
                continue

            # Classify match level
            if score >= 0.80:
                level = "strong_match"
            elif score >= 0.55:
                level = "candidate_match"
            else:
                level = "weak_match"

            rationale_text = " • ".join(reasons) if reasons else "Candidate structural match"
            code_snippet = matched_evidence.content_snippet if matched_evidence else None
            line_start = matched_evidence.start_line if matched_evidence else 1
            line_end = matched_evidence.end_line if matched_evidence else 1

            candidates.append(
                CandidateMatch(
                    file_record=f,
                    score=min(score, 1.0),
                    level=level,
                    rationale=rationale_text,
                    is_test=is_test,
                    evidence_type=evidence_type,
                    line_start=line_start,
                    line_end=line_end,
                    code_snippet=code_snippet[:600] if code_snippet else None,
                    evidence_id=matched_evidence.id if matched_evidence else None,
                )
            )

        # Sort descending by score
        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates

    @classmethod
    def _determine_status(
        cls,
        impl_candidates: List[CandidateMatch],
        test_candidates: List[CandidateMatch],
    ) -> Tuple[str, str]:
        """Classify overall traceability status and generate student-friendly notes."""
        if not impl_candidates:
            return (
                "unmatched",
                "No implementation code or files matching this requirement were located in the repository snapshot.",
            )

        # Ambiguity rule 1: Same-directory competing candidate implementations / variants (e.g. auth.py vs auth_v2.py)
        if len(impl_candidates) >= 2:
            c0, c1 = impl_candidates[0], impl_candidates[1]
            dir0 = os.path.dirname(c0.file_record.file_path.replace("\\", "/"))
            dir1 = os.path.dirname(c1.file_record.file_path.replace("\\", "/"))
            score_diff = abs(c0.score - c1.score)
            if dir0 == dir1 and score_diff <= 0.05:
                stem0 = os.path.splitext(os.path.basename(c0.file_record.file_path))[0]
                stem1 = os.path.splitext(os.path.basename(c1.file_record.file_path))[0]
                if _is_competing_variant(stem0, stem1):
                    f0_name = os.path.basename(c0.file_record.file_path)
                    f1_name = os.path.basename(c1.file_record.file_path)
                    return (
                        "ambiguous",
                        f"Multiple competing candidate files ({f0_name}, {f1_name}) located in the same directory ({dir0 or '.'}). Review candidates to clarify the primary implementation.",
                    )

        # Ambiguity rule 2: Multiple top candidates across different directories with tied scores
        if len(impl_candidates) >= 3:
            dirs = {os.path.dirname(c.file_record.file_path.replace("\\", "/")) for c in impl_candidates[:3]}
            score_diff = abs(impl_candidates[0].score - impl_candidates[2].score)
            if len(dirs) >= 2 and score_diff < 0.08:
                return (
                    "ambiguous",
                    f"Multiple candidate implementation files located across different modules ({', '.join(sorted(dirs)[:2])}). Review the candidates to clarify the primary implementation.",
                )

        # Candidate with tests if candidate implementation AND test suite exist
        if test_candidates:
            return (
                "candidate_with_tests",
                f"Located {len(impl_candidates)} candidate implementation file(s) and {len(test_candidates)} matching test suite(s).",
            )

        # Otherwise candidate needing tests/verification
        return (
            "candidate",
            f"Located {len(impl_candidates)} candidate implementation file(s). No dedicated automated test suite was found.",
        )

    @classmethod
    def _compute_metrics(
        cls,
        project_id: uuid.UUID,
        snapshot: Optional[RepositorySnapshot],
        summaries: List[RequirementSnapshotTraceability],
    ) -> TraceabilityMetricsResponse:
        """Compute aggregate distribution and coverage percentage."""
        total = len(summaries)
        candidate_with_tests = sum(1 for s in summaries if s.status == "candidate_with_tests")
        candidate = sum(1 for s in summaries if s.status == "candidate")
        unmatched = sum(1 for s in summaries if s.status == "unmatched")
        ambiguous = sum(1 for s in summaries if s.status == "ambiguous")

        covered = candidate_with_tests + candidate
        coverage_pct = round((covered / total * 100.0), 1) if total > 0 else 0.0

        return TraceabilityMetricsResponse(
            project_id=project_id,
            snapshot_id=snapshot.id if snapshot else None,
            commit_sha=snapshot.commit_sha if snapshot else None,
            has_repository=snapshot is not None,
            total_requirements=total,
            candidate_with_tests_count=candidate_with_tests,
            candidate_count=candidate,
            unmatched_count=unmatched,
            ambiguous_count=ambiguous,
            coverage_percentage=coverage_pct,
        )

    @classmethod
    def get_project_traceability(
        cls,
        db: Session,
        project_id: uuid.UUID,
        status: Optional[str] = None,
        search: Optional[str] = None,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> List[RequirementTraceabilitySummaryResponse]:
        """Fetch requirement traceability summaries for the active or requested snapshot."""
        # Find snapshot
        if snapshot_id:
            snap_stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.project_id == project_id,
            )
            snapshot = db.scalars(snap_stmt).first()
        else:
            repo_stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
            repo = db.scalars(repo_stmt).first()
            if not repo:
                return []
            snap_stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.repository_id == repo.id,
                RepositorySnapshot.is_current == True,
            )
            snapshot = db.scalars(snap_stmt).first()

        if not snapshot:
            return []

        # Query summaries joined with Requirement
        query = (
            sa.select(RequirementSnapshotTraceability, Requirement)
            .join(Requirement, RequirementSnapshotTraceability.requirement_id == Requirement.id)
            .where(
                RequirementSnapshotTraceability.snapshot_id == snapshot.id,
                RequirementSnapshotTraceability.project_id == project_id,
            )
            .order_by(Requirement.requirement_id.asc())
        )

        if status:
            query = query.where(RequirementSnapshotTraceability.status == status.strip().lower())

        results = list(db.execute(query).all())

        summaries: List[RequirementTraceabilitySummaryResponse] = []
        for trace, req in results:
            if search and search.strip():
                q = search.strip().lower()
                if (
                    q not in req.title.lower()
                    and q not in req.description.lower()
                    and q not in req.requirement_id.lower()
                ):
                    continue

            cand_files = [link.file_path for link in trace.links if not link.is_test_evidence][:5]
            test_files = [link.file_path for link in trace.links if link.is_test_evidence][:3]
            spec_count = len(req.evidence) if hasattr(req, "evidence") and req.evidence else 0

            summaries.append(
                RequirementTraceabilitySummaryResponse(
                    id=trace.id,
                    project_id=trace.project_id,
                    requirement_id=req.id,
                    requirement_code=req.requirement_id,
                    title=req.title,
                    description=req.description,
                    category=req.category,
                    priority=req.priority,
                    actor=req.actor,
                    snapshot_id=trace.snapshot_id,
                    commit_sha=trace.commit_sha,
                    status=trace.status,
                    implementation_count=trace.implementation_count,
                    test_count=trace.test_count,
                    summary_notes=trace.summary_notes,
                    candidate_files=cand_files,
                    test_files=test_files,
                    specification_evidence_count=spec_count,
                    created_at=trace.created_at,
                    updated_at=trace.updated_at,
                )
            )

        return summaries

    @classmethod
    def get_traceability_metrics(
        cls,
        db: Session,
        project_id: uuid.UUID,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> TraceabilityMetricsResponse:
        """Fetch overall traceability metrics for project."""
        repo_stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
        repo = db.scalars(repo_stmt).first()
        if not repo:
            # Query requirements count even without repo
            req_count = db.scalar(
                sa.select(sa.func.count(Requirement.id)).where(Requirement.project_id == project_id)
            ) or 0
            return TraceabilityMetricsResponse(
                project_id=project_id,
                has_repository=False,
                total_requirements=req_count,
                unmatched_count=req_count,
                coverage_percentage=0.0,
            )

        if snapshot_id:
            snap_stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.project_id == project_id,
            )
            snapshot = db.scalars(snap_stmt).first()
        else:
            snap_stmt = sa.select(RepositorySnapshot).where(
                RepositorySnapshot.repository_id == repo.id,
                RepositorySnapshot.is_current == True,
            )
            snapshot = db.scalars(snap_stmt).first()

        if not snapshot:
            req_count = db.scalar(
                sa.select(sa.func.count(Requirement.id)).where(Requirement.project_id == project_id)
            ) or 0
            return TraceabilityMetricsResponse(
                project_id=project_id,
                has_repository=True,
                total_requirements=req_count,
                unmatched_count=req_count,
                coverage_percentage=0.0,
            )

        summaries_stmt = sa.select(RequirementSnapshotTraceability).where(
            RequirementSnapshotTraceability.snapshot_id == snapshot.id,
            RequirementSnapshotTraceability.project_id == project_id,
        )
        summaries = list(db.scalars(summaries_stmt).all())
        return cls._compute_metrics(project_id, snapshot, summaries)

    @classmethod
    def get_requirement_traceability_detail(
        cls,
        db: Session,
        project_id: uuid.UUID,
        requirement_code_or_id: str,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> Optional[RequirementTraceabilityDetailResponse]:
        """Fetch complete traceability detail for a single requirement."""
        # Find requirement
        req_query = sa.select(Requirement).where(Requirement.project_id == project_id)
        try:
            req_uuid = uuid.UUID(requirement_code_or_id)
            req_query = req_query.where(Requirement.id == req_uuid)
        except ValueError:
            req_query = req_query.where(Requirement.requirement_id == requirement_code_or_id)

        req = db.scalars(req_query).first()
        if not req:
            return None

        # Find repository and snapshot
        repo_stmt = sa.select(GitHubRepository).where(GitHubRepository.project_id == project_id)
        repo = db.scalars(repo_stmt).first()

        snapshot: Optional[RepositorySnapshot] = None
        if repo:
            if snapshot_id:
                snap_stmt = sa.select(RepositorySnapshot).where(
                    RepositorySnapshot.id == snapshot_id,
                    RepositorySnapshot.project_id == project_id,
                )
                snapshot = db.scalars(snap_stmt).first()
            else:
                snap_stmt = sa.select(RepositorySnapshot).where(
                    RepositorySnapshot.repository_id == repo.id,
                    RepositorySnapshot.is_current == True,
                )
                snapshot = db.scalars(snap_stmt).first()

        trace: Optional[RequirementSnapshotTraceability] = None
        impl_links: List[TraceabilityLinkResponse] = []
        test_links: List[TraceabilityLinkResponse] = []

        if snapshot:
            trace_stmt = sa.select(RequirementSnapshotTraceability).where(
                RequirementSnapshotTraceability.requirement_id == req.id,
                RequirementSnapshotTraceability.snapshot_id == snapshot.id,
            )
            trace = db.scalars(trace_stmt).first()

            if trace:
                for link in trace.links:
                    gh_url = None
                    if repo and repo.repo_url:
                        clean_url = repo.repo_url.rstrip("/")
                        start = link.line_start or 1
                        end = link.line_end or start
                        gh_url = f"{clean_url}/blob/{link.commit_sha}/{link.file_path}#L{start}-L{end}"

                    resp_link = TraceabilityLinkResponse(
                        id=link.id,
                        traceability_id=link.traceability_id,
                        requirement_id=link.requirement_id,
                        snapshot_id=link.snapshot_id,
                        commit_sha=link.commit_sha,
                        file_path=link.file_path,
                        evidence_type=link.evidence_type,
                        is_test_evidence=link.is_test_evidence,
                        match_confidence=link.match_confidence,
                        match_level=link.match_level,
                        match_rationale=link.match_rationale,
                        line_start=link.line_start,
                        line_end=link.line_end,
                        code_snippet=link.code_snippet,
                        github_url=gh_url,
                        created_at=link.created_at,
                    )

                    if link.is_test_evidence:
                        test_links.append(resp_link)
                    else:
                        impl_links.append(resp_link)

        # Format specification evidence
        spec_evidence = [
            RequirementEvidenceResponse.model_validate(ev)
            for ev in (req.evidence or [])
        ]

        # Technical verification note (strictly technical guidance, no jury coaching)
        status = trace.status if trace else "unmatched"
        verification_note: Optional[str] = None
        if status == "candidate_with_tests":
            verification_note = (
                "Candidate implementation and test files were located. "
                "Verify endpoint routing, test assertions, and coverage against the requirement specification."
            )
        elif status == "candidate":
            verification_note = (
                "Candidate implementation files were located, but no automated test files were matched. "
                "Verify that unit or integration tests exist and cover this requirement."
            )
        elif status == "ambiguous":
            verification_note = (
                "Multiple competing candidate files were identified. "
                "Review the candidate implementations to verify which file contains the active, production logic."
            )
        else:
            verification_note = (
                "No candidate code or test files were identified for this requirement. "
                "Verify if implementation code exists under different naming or directory conventions."
            )

        return RequirementTraceabilityDetailResponse(
            id=req.id,
            project_id=req.project_id,
            requirement_id=req.id,
            requirement_code=req.requirement_id,
            title=req.title,
            description=req.description,
            category=req.category,
            priority=req.priority,
            actor=req.actor,
            is_ambiguous_specification=req.is_ambiguous,
            conflict_summary=req.conflict_summary,
            snapshot_id=snapshot.id if snapshot else None,
            commit_sha=snapshot.commit_sha if snapshot else None,
            status=status,
            implementation_count=len(impl_links),
            test_count=len(test_links),
            summary_notes=trace.summary_notes if trace else "No repository snapshot evaluated yet.",
            specification_evidence=spec_evidence,
            implementation_links=impl_links,
            test_links=test_links,
            verification_note=verification_note,
            created_at=req.created_at,
            updated_at=req.updated_at,
        )
