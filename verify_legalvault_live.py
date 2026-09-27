"""
Live verification script for LegalVault project through the real Project Doctor application flow.
Verifies bounded context, Groq reasoning with openai/gpt-oss-120b, citation integrity,
database persistence, and API endpoint delivery.
"""

import json
import sys
import uuid
from pathlib import Path

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend is on sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import httpx
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.project import Project
from app.models.ai_analysis import AIAnalysis
from app.schemas.ai_analysis import AIAnalysisResult
from app.services.analysis.ai_evidence_builder import AIEvidencePackageBuilder
from app.services.analysis.ai_evidence_selector import AIEvidenceSelector, estimate_prompt_tokens
from app.services.analysis.citation_validator import CitationValidator

PROJECT_ID = uuid.UUID("cc312f58-8d97-4853-b52d-09d8657b4fc3")
SERVER_URL = "http://127.0.0.1:8000"


def run_live_verification():
    print("=" * 70)
    print("PROJECT DOCTOR - REAL LEGALVAULT GROQ VERIFICATION")
    print("=" * 70)

    with SessionLocal() as db:
        project = db.get(Project, PROJECT_ID)
        assert project is not None, f"Project {PROJECT_ID} not found in database!"
        print(f"Project Title: {project.title}")

        # 1. Canonical Evidence Package Analysis
        print("\n--- 1. Canonical Evidence Package (Unpruned) ---")
        canonical_package = AIEvidencePackageBuilder.build_package(db, PROJECT_ID)
        canonical_tokens = estimate_prompt_tokens(canonical_package)
        print(f"Canonical Findings Count:       {len(canonical_package.diagnostic_findings)}")
        print(f"Canonical Requirements Count:   {len(canonical_package.requirements)}")
        print(f"Canonical Indexed Files Count:  {len(canonical_package.repository_summary.get('all_indexed_files', []))}")
        print(f"Canonical Estimated Tokens:     {canonical_tokens} (Exceeds Groq 8k TPM limit)")

        # 2. Bounded Evidence Package Selection
        print("\n--- 2. Bounded Evidence Package (AIEvidenceSelector) ---")
        bounded_package = AIEvidenceSelector.select_bounded_evidence(
            canonical_package,
            max_input_tokens=settings.AI_INPUT_MAX_TOKENS,
        )
        bounded_tokens = estimate_prompt_tokens(bounded_package)
        print(f"Bounded Findings Count:         {len(bounded_package.diagnostic_findings)}")
        print(f"Bounded Requirements Count:     {len(bounded_package.requirements)}")
        print(f"Bounded Indexed Files Count:    {len(bounded_package.repository_summary.get('all_indexed_files', []))}")
        print(f"Bounded Estimated Tokens:       {bounded_tokens}")
        print(f"Budget Invariant: {bounded_tokens} <= {settings.AI_INPUT_MAX_TOKENS} tokens (PASS)")
        assert bounded_tokens <= settings.AI_INPUT_MAX_TOKENS, "Bounded tokens exceeded input budget!"

        # 3. Trigger Generation via Live Application Endpoint
        print("\n--- 3. Triggering AI Generation via Live Application Endpoint ---")
        gen_resp = httpx.post(
            f"{SERVER_URL}/api/projects/{PROJECT_ID}/ai-analysis/generate",
            timeout=90.0,
        )
        if gen_resp.status_code != 200:
            print(f"Initial generate status {gen_resp.status_code}, retrying with force=true...")
            gen_resp = httpx.post(
                f"{SERVER_URL}/api/projects/{PROJECT_ID}/ai-analysis/generate?force=true",
                timeout=90.0,
            )
        print(f"Generate Route HTTP Status:     {gen_resp.status_code}")
        assert gen_resp.status_code == 200, f"Expected 200 from generate, got {gen_resp.status_code}: {gen_resp.text}"

        gen_data = gen_resp.json()
        print(f"Generate Status:                {gen_data.get('status')}")
        print(f"Generate Message:               {gen_data.get('message')}")
        assert gen_data.get("status") == "completed", f"Generation status not completed: {gen_data}"

        # 4. Query Read Endpoint
        print("\n--- 4. Querying Live Application Read Endpoint ---")
        api_resp = httpx.get(f"{SERVER_URL}/api/projects/{PROJECT_ID}/ai-analysis", timeout=30.0)
        print(f"API Route HTTP Status:          {api_resp.status_code}")
        assert api_resp.status_code == 200, f"Expected 200, got {api_resp.status_code}"

        api_data = api_resp.json()
        print(f"Analysis Status:                {api_data.get('status')}")
        print(f"Model Provider:                 {api_data.get('model_provider')}")
        print(f"Model Name:                     {api_data.get('model_name')}")
        print(f"Prompt Version:                 {api_data.get('prompt_version')}")
        print(f"Evidence Hash:                  {api_data.get('evidence_hash')}")

        assert api_data.get("status") == "completed", "Status is not completed!"
        assert api_data.get("model_provider") == "groq", f"Expected groq, got {api_data.get('model_provider')}"
        assert api_data.get("model_name") == "openai/gpt-oss-120b", f"Expected openai/gpt-oss-120b, got {api_data.get('model_name')}"
        assert api_data.get("prompt_version") == "cp8-v1.3", f"Expected cp8-v1.3, got {api_data.get('prompt_version')}"

        # 5. Validate Structured Result
        print("\n--- 5. Validating Structured AIAnalysisResult Schema ---")
        structured_raw = api_data.get("result")
        assert structured_raw is not None, "Missing structured result!"
        result = AIAnalysisResult.model_validate(structured_raw)

        print(f"Observations Count:             {len(result.observations)}")
        print(f"Cross-Artifact Correlations:    {len(result.cross_artifact_correlations)}")
        print(f"Contradictions Count:           {len(result.contradictions)}")
        print(f"Evidence Gaps Count:            {len(result.evidence_gaps)}")
        for gap in result.evidence_gaps:
            print(f"  - Area: {gap.area} | Missing: {gap.missing_evidence_description[:60]}...")
        print(f"Diagnostic Interpretations:     {len(result.diagnostic_interpretations)}")

        total_citations = (
            sum(len(obs.evidence_citations) for obs in result.observations)
            + sum(len(c.citations) for c in result.cross_artifact_correlations)
            + sum(len(c.citations) for c in result.contradictions)
        )
        print(f"Total Citations:                {total_citations}")

        # 5. Citation Integrity Audit
        print("\n--- 5. Auditing Citation Integrity Against Bounded Evidence ---")
        CitationValidator.validate_citation_integrity(result, bounded_package)
        print("Citation integrity check:       PASS (All citations map to bounded evidence)")

        # 6. Database Record Persistence Verification
        print("\n--- 6. Verifying Database Record Persistence ---")
        persisted = db.get(AIAnalysis, uuid.UUID(api_data["id"]))
        assert persisted is not None, "Record not found in database!"
        assert persisted.status == "completed"
        print(f"Database Record ID:             {persisted.id}")
        print(f"Database Record Status:         {persisted.status}")
        print(f"Database Model Provider:        {persisted.model_provider}")
        print(f"Database Model Name:            {persisted.model_name}")
        print(f"Database Prompt Version:        {persisted.prompt_version}")
        print(f"Database Evidence Hash:         {persisted.evidence_hash}")

        print("\n" + "=" * 70)
        print("REAL LEGALVAULT GROQ VERIFICATION: SUCCESS")
        print("=" * 70)
        return True


if __name__ == "__main__":
    success = run_live_verification()
    sys.exit(0 if success else 1)
