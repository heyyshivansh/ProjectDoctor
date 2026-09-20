import hashlib
import json
from typing import Any, Dict
from app.schemas.ai_evidence import AIEvidencePackage


def _normalize_value(val: Any) -> Any:
    """Recursively normalize values for deterministic canonical serialization."""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, float):
        return round(val, 4)
    if isinstance(val, dict):
        return {k: _normalize_value(v) for k, v in sorted(val.items())}
    if isinstance(val, list):
        return [_normalize_value(x) for x in val]
    return val


def canonicalize_package(package: AIEvidencePackage) -> Dict[str, Any]:
    """Convert an AIEvidencePackage into a canonical, order-invariant dictionary."""
    pkg_dict = package.model_dump(mode="json")

    # 1. Sort requirements by requirement_id ascending
    if "requirements" in pkg_dict and isinstance(pkg_dict["requirements"], list):
        pkg_dict["requirements"] = sorted(
            pkg_dict["requirements"],
            key=lambda r: r.get("requirement_id", ""),
        )

    # 2. Sort diagnostic findings by finding_hash ascending
    if "diagnostic_findings" in pkg_dict and isinstance(
        pkg_dict["diagnostic_findings"], list
    ):
        pkg_dict["diagnostic_findings"] = sorted(
            pkg_dict["diagnostic_findings"],
            key=lambda f: f.get("finding_hash", ""),
        )

    # 3. Sort artifacts by filename ascending
    if "artifacts" in pkg_dict and isinstance(pkg_dict["artifacts"], list):
        pkg_dict["artifacts"] = sorted(
            pkg_dict["artifacts"],
            key=lambda a: a.get("filename", ""),
        )

    # 4. Sort repository summary lists
    repo_sum = pkg_dict.get("repository_summary")
    if repo_sum and isinstance(repo_sum, dict):
        if "manifests" in repo_sum and isinstance(repo_sum["manifests"], list):
            repo_sum["manifests"] = sorted(repo_sum["manifests"])
        if "entrypoints" in repo_sum and isinstance(repo_sum["entrypoints"], list):
            repo_sum["entrypoints"] = sorted(repo_sum["entrypoints"])
        if "directory_tree" in repo_sum and isinstance(repo_sum["directory_tree"], list):
            repo_sum["directory_tree"] = sorted(repo_sum["directory_tree"])
        if "all_indexed_files" in repo_sum and isinstance(
            repo_sum["all_indexed_files"], list
        ):
            repo_sum["all_indexed_files"] = sorted(
                repo_sum["all_indexed_files"],
                key=lambda f: f.get("file_path", ""),
            )

    # 5. Sort traceability summary items
    trace_sum = pkg_dict.get("traceability_summary")
    if trace_sum and isinstance(trace_sum, dict):
        if "items" in trace_sum and isinstance(trace_sum["items"], list):
            trace_sum["items"] = sorted(
                trace_sum["items"],
                key=lambda t: t.get("requirement_id", ""),
            )

    # 6. Apply recursive key sorting and string trimming
    return _normalize_value(pkg_dict)


def compute_evidence_hash(package: AIEvidencePackage, prompt_version: str) -> str:
    """
    Compute a deterministic SHA-256 hash over canonical evidence and prompt version.

    Any material change to evidence or prompt version produces a different hash.
    Identical evidence and prompt version produce the exact same hash regardless
    of dictionary key order or entity insertion order.
    """
    canonical_dict = canonicalize_package(package)
    canonical_dict["prompt_version"] = prompt_version.strip()

    canonical_json = json.dumps(
        canonical_dict,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
