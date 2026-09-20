import uuid
from typing import Dict, List, Optional, Set, Tuple
from app.schemas.ai_analysis import (
    AIAnalysisResult,
    AIEvidenceCitation,
    TargetType,
)
from app.schemas.ai_evidence import AIEvidencePackage


class CitationIntegrityError(Exception):
    """Raised when an AI-generated citation fails verification against the supplied evidence package."""

    def __init__(self, message: str, invalid_citations: Optional[List[Dict[str, Any]]] = None):
        super().__init__(message)
        self.invalid_citations = invalid_citations or []


class CitationValidator:
    """Validates that every citation in AIAnalysisResult maps to a real entity in AIEvidencePackage."""

    @classmethod
    def validate_citation_integrity(
        cls,
        result: AIAnalysisResult,
        package: AIEvidencePackage,
    ) -> None:
        """
        Validate all citations in the AIAnalysisResult against the supplied AIEvidencePackage.

        Raises CitationIntegrityError if any citation references an unknown,
        fabricated, or mismatched entity.
        """
        # 1. Index allowed entities from the evidence package
        req_by_id: Dict[uuid.UUID, str] = {
            r.id: r.requirement_id for r in package.requirements
        }
        req_by_code: Dict[str, uuid.UUID] = {
            r.requirement_id: r.id for r in package.requirements
        }

        artifact_by_id: Dict[uuid.UUID, str] = {
            a.id: a.filename for a in package.artifacts
        }
        artifact_by_name: Dict[str, uuid.UUID] = {
            a.filename: a.id for a in package.artifacts
        }

        finding_by_id: Dict[uuid.UUID, str] = {
            f.finding_id: f.finding_hash for f in package.diagnostic_findings
        }
        finding_by_hash: Dict[str, uuid.UUID] = {
            f.finding_hash: f.finding_id for f in package.diagnostic_findings
        }
        finding_titles: Set[str] = {
            f.title for f in package.diagnostic_findings
        }

        repo_summary = package.repository_summary or {}
        indexed_files = repo_summary.get("all_indexed_files", [])
        file_by_id: Dict[uuid.UUID, str] = {}
        file_by_path: Dict[str, uuid.UUID] = {}

        for f in indexed_files:
            try:
                fid = uuid.UUID(str(f.get("id")))
                fpath = f.get("file_path", "")
                file_by_id[fid] = fpath
                file_by_path[fpath] = fid
            except (ValueError, TypeError):
                continue

        all_known_paths = set(file_by_path.keys())
        for path in repo_summary.get("manifests", []) + repo_summary.get("entrypoints", []) + repo_summary.get("directory_tree", []):
            all_known_paths.add(path)

        trace_summary = package.traceability_summary or {}
        trace_items = trace_summary.get("items", [])
        trace_by_id: Dict[uuid.UUID, str] = {}
        for ti in trace_items:
            try:
                tid = uuid.UUID(str(ti.get("id")))
                req_id = ti.get("requirement_id", "")
                trace_by_id[tid] = req_id
            except (ValueError, TypeError):
                continue

        # 2. Collect all citations from observations, correlations, contradictions, and interpretations
        all_citations: List[Tuple[str, AIEvidenceCitation]] = []

        for obs in result.observations:
            for cit in obs.evidence_citations:
                all_citations.append((f"Observation '{obs.title}'", cit))

        for corr in result.cross_artifact_correlations:
            for cit in corr.citations:
                all_citations.append((f"Correlation '{corr.claim_source}'", cit))

        for cont in result.contradictions:
            for cit in cont.citations:
                all_citations.append((f"Contradiction '{cont.headline}'", cit))

        # Also validate finding_id in diagnostic interpretations
        for interp in result.diagnostic_interpretations:
            if interp.finding_id:
                if interp.finding_id not in finding_by_id:
                    raise CitationIntegrityError(
                        f"Diagnostic interpretation '{interp.finding_title}' references unknown finding_id: {interp.finding_id}"
                    )

        # 3. Validate each citation
        invalid_citations: List[Dict[str, Any]] = []

        for context_label, citation in all_citations:
            t_type = citation.target_type
            t_id = citation.target_id
            ident = citation.identifier.strip()

            if t_type == "requirement":
                # Rule: target_id must match a requirement UUID, and identifier must match requirement_id
                if not t_id and ident in req_by_code:
                    # Allow auto-resolving target_id if human code matches exactly
                    t_id = req_by_code[ident]
                    citation.target_id = t_id

                if not t_id or t_id not in req_by_id:
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id) if t_id else None,
                            "identifier": ident,
                            "reason": f"Requirement UUID '{t_id}' not found in evidence package",
                        }
                    )
                elif req_by_id[t_id] != ident and ident not in req_by_id.values():
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id),
                            "identifier": ident,
                            "reason": f"Requirement identifier '{ident}' does not match expected code '{req_by_id[t_id]}'",
                        }
                    )

            elif t_type == "repository_file":
                # Rule: identifier must be a real file path in the repository summary
                # If target_id is present, it must match RepositoryFile.id
                if ident not in all_known_paths and ident not in file_by_path:
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id) if t_id else None,
                            "identifier": ident,
                            "reason": f"Repository file path '{ident}' not found in indexed repository files",
                        }
                    )
                elif t_id and t_id in file_by_id and file_by_id[t_id] != ident:
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id),
                            "identifier": ident,
                            "reason": f"RepositoryFile UUID '{t_id}' points to '{file_by_id[t_id]}', not '{ident}'",
                        }
                    )
                elif not t_id and ident in file_by_path:
                    # Auto-populate target_id from canonical path if known
                    citation.target_id = file_by_path[ident]

            elif t_type == "finding":
                # Rule: identifier or target_id must match an active finding
                is_valid = False
                if t_id and t_id in finding_by_id:
                    is_valid = True
                elif ident in finding_by_hash:
                    is_valid = True
                    citation.target_id = finding_by_hash[ident]
                elif ident in finding_titles:
                    is_valid = True

                if not is_valid:
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id) if t_id else None,
                            "identifier": ident,
                            "reason": f"Finding reference '{ident}' not found in active CP7 findings",
                        }
                    )

            elif t_type == "artifact":
                # Rule: target_id must match Artifact.id, identifier must match filename
                if not t_id and ident in artifact_by_name:
                    t_id = artifact_by_name[ident]
                    citation.target_id = t_id

                if not t_id or t_id not in artifact_by_id:
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id) if t_id else None,
                            "identifier": ident,
                            "reason": f"Artifact UUID '{t_id}' not found in evidence package",
                        }
                    )
                elif artifact_by_id[t_id] != ident and ident not in artifact_by_id.values():
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id),
                            "identifier": ident,
                            "reason": f"Artifact identifier '{ident}' does not match expected filename '{artifact_by_id[t_id]}'",
                        }
                    )

            elif t_type == "traceability":
                # Rule: target_id must match RequirementSnapshotTraceability.id
                if not t_id or t_id not in trace_by_id:
                    invalid_citations.append(
                        {
                            "context": context_label,
                            "target_type": t_type,
                            "target_id": str(t_id) if t_id else None,
                            "identifier": ident,
                            "reason": f"Traceability UUID '{t_id}' not found in evidence package",
                        }
                    )

            else:
                invalid_citations.append(
                    {
                        "context": context_label,
                        "target_type": str(t_type),
                        "target_id": str(t_id) if t_id else None,
                        "identifier": ident,
                        "reason": f"Unsupported target_type: '{t_type}'",
                    }
                )

        if invalid_citations:
            error_details = "; ".join(
                f"{c['context']}: {c['reason']} ({c['identifier']})"
                for c in invalid_citations[:3]
            )
            raise CitationIntegrityError(
                f"Citation integrity validation failed ({len(invalid_citations)} invalid citation(s)): {error_details}",
                invalid_citations=invalid_citations,
            )
