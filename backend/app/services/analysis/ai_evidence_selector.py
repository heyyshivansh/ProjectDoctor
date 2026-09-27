"""
AIEvidenceSelector — Enforces an explicit, conservative AI input context budget
over a canonical AIEvidencePackage.

Architecture:
Deterministic systems establish facts.
AI reasons over structured evidence.

The selector:
1. Preserves mandatory foundation context (metadata, documents, repository stats).
2. Prioritizes high-signal evidence (critical/high diagnostic findings, key requirements).
3. Progressively includes evidence items while within the conservative input budget.
4. Stops cleanly at the budget boundary without ever blindly truncating prompt text.
5. Keeps canonical AIEvidencePackage untouched, returning a valid, bounded copy.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Set
import uuid

from app.schemas.ai_evidence import (
    AIEvidencePackage,
    AIEvidenceRequirementItem,
    AIEvidenceFindingItem,
    AIEvidenceArtifactItem,
)
from app.services.ai.openrouter_client import (
    SYSTEM_PROMPT_OPENROUTER,
    format_evidence_for_prompt,
)

logger = logging.getLogger(__name__)

# Heuristic estimation ratio: characters per token for compact JSON + prompt.
# NOTE: This is an empirical approximation for context budgeting, not an exact
# tokenizer guarantee. Conservative input bounds (e.g. 4,500 tokens) combined
# with explicit provider output token caps ensure the combined request remains
# safely below upstream provider TPM limits (e.g. 8,000 TPM).
CHARS_PER_TOKEN_ESTIMATE = 3.2

# Default conservative input token budget
DEFAULT_MAX_INPUT_TOKENS = 4500

# Severity sorting weight for findings (lower number = higher priority)
SEVERITY_WEIGHT = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
    "info": 4,
}

# Traceability status priority for requirements (unimplemented/ambiguous first)
STATUS_PRIORITY = {
    "unmatched": 0,
    "ambiguous": 1,
    "candidate": 2,
    "not_evaluated": 3,
}


def estimate_prompt_tokens(evidence: AIEvidencePackage) -> int:
    """
    Conservative token estimation heuristic over compact JSON serialization.
    NOTE: This is an empirical approximation for context budgeting, not an exact tokenizer guarantee.
    """
    user_prompt_text = format_evidence_for_prompt(evidence)
    total_prompt_chars = len(user_prompt_text) + len(SYSTEM_PROMPT_OPENROUTER)
    return int(total_prompt_chars / CHARS_PER_TOKEN_ESTIMATE)


def _sync_counts(draft: AIEvidencePackage) -> None:
    """Synchronize evidence_counts on draft package."""
    draft.evidence_counts = {
        "artifacts_count": len(draft.artifacts),
        "requirements_count": len(draft.requirements),
        "findings_count": len(draft.diagnostic_findings),
        "indexed_files_count": len(
            draft.repository_summary.get("all_indexed_files", [])
            if draft.repository_summary
            else []
        ),
        "traceability_items_count": len(
            draft.traceability_summary.get("items", [])
            if draft.traceability_summary
            else []
        ),
    }


class AIEvidenceSelector:
    """Provider-independent selector that produces a bounded copy of AIEvidencePackage."""

    @classmethod
    def select_bounded_evidence(
        cls,
        evidence: AIEvidencePackage,
        max_input_tokens: int = DEFAULT_MAX_INPUT_TOKENS,
    ) -> AIEvidencePackage:
        """
        Progressively select evidence into a bounded AIEvidencePackage within max_input_tokens.

        If the full canonical evidence package already fits within the budget,
        it is returned unmodified.
        """
        # 1. Fast path: check if full package already satisfies the budget
        current_estimate = estimate_prompt_tokens(evidence)
        if current_estimate <= max_input_tokens:
            logger.debug(
                "Evidence package fits within input budget (%d <= %d tokens). Retaining full package.",
                current_estimate,
                max_input_tokens,
            )
            return evidence

        logger.info(
            "Evidence package exceeds input budget (%d > %d tokens). Performing progressive selection.",
            current_estimate,
            max_input_tokens,
        )

        # 2. P0: Mandatory foundation context
        bounded_repo_summary: Optional[Dict[str, Any]] = None
        if evidence.repository_summary:
            bounded_repo_summary = {
                "snapshot_id": evidence.repository_summary.get("snapshot_id"),
                "commit_sha": evidence.repository_summary.get("commit_sha"),
                "branch": evidence.repository_summary.get("branch"),
                "total_files": evidence.repository_summary.get("total_files"),
                "total_size_bytes": evidence.repository_summary.get("total_size_bytes"),
                "evidence_counts": evidence.repository_summary.get("evidence_counts", {}),
                "manifests": list(evidence.repository_summary.get("manifests", [])),
                "entrypoints": list(evidence.repository_summary.get("entrypoints", [])),
                "directory_tree": list(evidence.repository_summary.get("directory_tree", [])),
                "sensitive_files_omitted_count": evidence.repository_summary.get(
                    "sensitive_files_omitted_count", 0
                ),
                "sensitive_file_paths": list(
                    evidence.repository_summary.get("sensitive_file_paths", [])
                ),
                "all_indexed_files": [],  # Populated progressively below
            }

        bounded_trace_summary: Optional[Dict[str, Any]] = None
        if evidence.traceability_summary:
            bounded_trace_summary = {
                "total_records": evidence.traceability_summary.get("total_records", 0),
                "matched_count": evidence.traceability_summary.get("matched_count", 0),
                "unmatched_count": evidence.traceability_summary.get("unmatched_count", 0),
                "ambiguous_count": evidence.traceability_summary.get("ambiguous_count", 0),
                "items": [],  # Populated progressively below
                "candidate_snippets": [],  # Populated progressively below
            }

        draft = AIEvidencePackage(
            project_id=evidence.project_id,
            project_title=evidence.project_title,
            snapshot_id=evidence.snapshot_id,
            commit_sha=evidence.commit_sha,
            project_context=dict(evidence.project_context),
            document_understanding=(
                dict(evidence.document_understanding) if evidence.document_understanding else None
            ),
            artifacts=list(evidence.artifacts),
            requirements=[],
            repository_summary=bounded_repo_summary,
            traceability_summary=bounded_trace_summary,
            diagnostic_findings=[],
            evidence_counts={},
        )
        _sync_counts(draft)

        base_estimate = estimate_prompt_tokens(draft)
        available_for_entities = max(max_input_tokens - base_estimate, 0)

        # Allocate balanced tier ceilings so findings don't starve requirements/files
        findings_budget = min(int(available_for_entities * 0.45), 2000)
        findings_ceiling = min(base_estimate + findings_budget, max_input_tokens - 200)

        # 3. P1: Diagnostic Findings (High Signal)
        sorted_findings = sorted(
            evidence.diagnostic_findings,
            key=lambda f: SEVERITY_WEIGHT.get(f.severity.lower(), 5),
        )

        selected_findings: List[AIEvidenceFindingItem] = []
        for finding in sorted_findings:
            draft.diagnostic_findings = selected_findings + [finding]
            _sync_counts(draft)
            if estimate_prompt_tokens(draft) <= findings_ceiling and estimate_prompt_tokens(draft) <= max_input_tokens:
                selected_findings.append(finding)
            else:
                draft.diagnostic_findings = selected_findings
                _sync_counts(draft)
                break

        # Calculate remaining budget for requirements
        after_findings_estimate = estimate_prompt_tokens(draft)
        remaining_for_reqs = max(max_input_tokens - after_findings_estimate, 0)
        reqs_budget = min(int(remaining_for_reqs * 0.65), 1500)
        reqs_ceiling = min(after_findings_estimate + reqs_budget, max_input_tokens - 100)

        # 4. P2: Requirements (High Signal)
        sorted_requirements = sorted(
            evidence.requirements,
            key=lambda r: (
                STATUS_PRIORITY.get(r.traceability_status, 4),
                not r.is_ambiguous,
                r.requirement_id,
            ),
        )

        selected_requirements: List[AIEvidenceRequirementItem] = []
        for req in sorted_requirements:
            draft.requirements = selected_requirements + [req]
            _sync_counts(draft)
            if estimate_prompt_tokens(draft) <= reqs_ceiling and estimate_prompt_tokens(draft) <= max_input_tokens:
                selected_requirements.append(req)
            else:
                draft.requirements = selected_requirements
                _sync_counts(draft)
                break

        # 5. P3: Traceability items & compact snippets
        if evidence.traceability_summary and bounded_trace_summary is not None:
            selected_req_codes: Set[str] = {r.requirement_id for r in selected_requirements}
            all_trace_items = evidence.traceability_summary.get("items", [])
            selected_trace_items: List[Dict[str, Any]] = []

            for ti in all_trace_items:
                if ti.get("requirement_id") in selected_req_codes:
                    bounded_trace_summary["items"] = selected_trace_items + [ti]
                    _sync_counts(draft)
                    if estimate_prompt_tokens(draft) <= (max_input_tokens - 100):
                        selected_trace_items.append(ti)
                    else:
                        bounded_trace_summary["items"] = selected_trace_items
                        _sync_counts(draft)
                        break

            # Add compact snippets for retained trace items
            retained_trace_ids = {str(ti.get("id")) for ti in selected_trace_items}
            all_snippets = evidence.traceability_summary.get("candidate_snippets", [])
            selected_snippets: List[Dict[str, Any]] = []

            for snip in all_snippets:
                if str(snip.get("traceability_id")) in retained_trace_ids:
                    compact_snip = dict(snip)
                    raw_text = compact_snip.get("snippet", "")
                    if len(raw_text) > 120:
                        compact_snip["snippet"] = raw_text[:120] + "..."
                    bounded_trace_summary["candidate_snippets"] = selected_snippets + [compact_snip]
                    _sync_counts(draft)
                    if estimate_prompt_tokens(draft) <= (max_input_tokens - 50):
                        selected_snippets.append(compact_snip)
                    else:
                        bounded_trace_summary["candidate_snippets"] = selected_snippets
                        _sync_counts(draft)
                        break

        # 6. P4: Contextual Repository Files
        if evidence.repository_summary and bounded_repo_summary is not None:
            referenced_paths: Set[str] = set()

            for f in draft.diagnostic_findings:
                for ref in f.evidence_references:
                    if ref.get("file_path"):
                        referenced_paths.add(ref.get("file_path"))

            for r in draft.requirements:
                for cp in r.candidate_files:
                    referenced_paths.add(cp)

            if bounded_trace_summary:
                for ti in bounded_trace_summary.get("items", []):
                    for cp in ti.get("candidate_files", []):
                        referenced_paths.add(cp)
                for snip in bounded_trace_summary.get("candidate_snippets", []):
                    if snip.get("file_path"):
                        referenced_paths.add(snip.get("file_path"))

            all_indexed = evidence.repository_summary.get("all_indexed_files", [])
            sorted_files = sorted(
                all_indexed,
                key=lambda f: (f.get("file_path") not in referenced_paths, f.get("file_path", "")),
            )

            selected_files: List[Dict[str, Any]] = []
            for file_item in sorted_files:
                bounded_repo_summary["all_indexed_files"] = selected_files + [file_item]
                _sync_counts(draft)
                if estimate_prompt_tokens(draft) <= max_input_tokens:
                    selected_files.append(file_item)
                else:
                    bounded_repo_summary["all_indexed_files"] = selected_files
                    _sync_counts(draft)
                    break

        # 7. Safety trim guard: guarantee estimate <= max_input_tokens
        while estimate_prompt_tokens(draft) > max_input_tokens:
            if bounded_repo_summary and bounded_repo_summary.get("all_indexed_files"):
                bounded_repo_summary["all_indexed_files"].pop()
            elif bounded_trace_summary and bounded_trace_summary.get("candidate_snippets"):
                bounded_trace_summary["candidate_snippets"].pop()
            elif bounded_trace_summary and bounded_trace_summary.get("items"):
                bounded_trace_summary["items"].pop()
            elif draft.requirements:
                draft.requirements.pop()
            elif draft.diagnostic_findings:
                draft.diagnostic_findings.pop()
            else:
                break
            _sync_counts(draft)

        final_estimate = estimate_prompt_tokens(draft)
        logger.info(
            "Progressive evidence selection completed: %d findings, %d requirements, %d files, "
            "%d trace items -> estimated %d tokens (budget: %d).",
            len(draft.diagnostic_findings),
            len(draft.requirements),
            draft.evidence_counts["indexed_files_count"],
            draft.evidence_counts["traceability_items_count"],
            final_estimate,
            max_input_tokens,
        )

        return draft
