import uuid
from typing import Optional

from app.schemas.ai_analysis import (
    AIAnalysisResult,
    AIEvidenceCitation,
    AIObservation,
    AICrossArtifactCorrelation,
    AIContradiction,
    AIEvidenceGap,
    AIDiagnosticInterpretation,
    ProjectUnderstandingAssessment,
)
from app.schemas.ai_evidence import AIEvidencePackage
from app.services.ai.base import (
    BaseAIProvider,
    GeminiRateLimitError,
    GeminiTimeoutError,
    AIAnalysisGenerationError,
)


class MockAIProvider(BaseAIProvider):
    """Deterministic, offline AI provider for automated testing."""

    def __init__(
        self,
        should_timeout: bool = False,
        should_rate_limit: bool = False,
        should_fail_schema: bool = False,
        should_fail_citation: bool = False,
        custom_result: Optional[AIAnalysisResult] = None,
    ):
        self.should_timeout = should_timeout
        self.should_rate_limit = should_rate_limit
        self.should_fail_schema = should_fail_schema
        self.should_fail_citation = should_fail_citation
        self.custom_result = custom_result
        self.call_count = 0

    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str = "cp8-v1.0",
    ) -> AIAnalysisResult:
        """Return deterministic mock AI reasoning result populated with real evidence references."""
        self.call_count += 1

        if self.should_timeout:
            raise GeminiTimeoutError("Mock simulated timeout error", status_code=504)
        if self.should_rate_limit:
            raise GeminiRateLimitError("Mock simulated rate limit error (429)", status_code=429)
        if self.should_fail_schema:
            raise AIAnalysisGenerationError("Mock simulated schema validation error")

        if self.custom_result:
            return self.custom_result

        # Collect citations to real entities from the evidence package
        req_citation: Optional[AIEvidenceCitation] = None
        if evidence.requirements:
            r = evidence.requirements[0]
            req_citation = AIEvidenceCitation(
                target_type="requirement",
                target_id=r.id,
                identifier=r.requirement_id,
                detail=f"Requirement title: {r.title}",
            )

        file_citation: Optional[AIEvidenceCitation] = None
        repo_summary = evidence.repository_summary or {}
        indexed_files = repo_summary.get("all_indexed_files", [])
        if indexed_files:
            f0 = indexed_files[0]
            file_citation = AIEvidenceCitation(
                target_type="repository_file",
                target_id=uuid.UUID(str(f0["id"])) if "id" in f0 else None,
                identifier=f0.get("file_path", "README.md"),
                detail="Representative repository file",
            )

        finding_interpretation: Optional[AIDiagnosticInterpretation] = None
        finding_citation: Optional[AIEvidenceCitation] = None
        if evidence.diagnostic_findings:
            f = evidence.diagnostic_findings[0]
            finding_citation = AIEvidenceCitation(
                target_type="finding",
                target_id=f.finding_id,
                identifier=f.finding_hash,
                detail=f"Diagnostic finding: {f.title}",
            )
            finding_interpretation = AIDiagnosticInterpretation(
                finding_id=f.finding_id,
                finding_title=f.title,
                project_context_impact=(
                    f"In the context of '{evidence.project_title}', this finding highlights an area "
                    "evaluators will likely scrutinize during review."
                ),
                uncertainty_note="No additional runtime telemetry was provided to verify frequency.",
            )

        artifact_citation: Optional[AIEvidenceCitation] = None
        if evidence.artifacts:
            art = evidence.artifacts[0]
            artifact_citation = AIEvidenceCitation(
                target_type="artifact",
                target_id=art.id,
                identifier=art.filename,
                detail=f"Uploaded specification: {art.filename}",
            )

        # Build citations list
        citations = [c for c in [req_citation, file_citation, finding_citation, artifact_citation] if c is not None]

        # Observations
        obs_citations = list(citations[:2])
        if self.should_fail_citation:
            obs_citations.append(
                AIEvidenceCitation(
                    target_type="requirement",
                    target_id=uuid.uuid4(),
                    identifier="REQ-999-FAKE",
                    detail="Hallucinated requirement citation",
                )
            )

        observations = [
            AIObservation(
                observation_type="fact",
                category="architecture",
                title="Monolithic architecture entrypoint detected",
                statement=(
                    f"The repository for '{evidence.project_title}' presents a modular structure "
                    f"with {evidence.evidence_counts.get('total_files', 0)} indexed files."
                ),
                technical_rationale=(
                    "Evaluators look for cohesive directory organization and clear separation of concerns."
                ),
                evidence_citations=obs_citations,
                confidence="high",
            ),
            AIObservation(
                observation_type="interpretation",
                category="implementation",
                title="Specification coverage aligned with prototype state",
                statement=(
                    f"Identified {len(evidence.requirements)} formal requirements with candidate "
                    "implementation files mapped in repository evidence."
                ),
                technical_rationale=(
                    "Requirement-to-code traceability establishes whether the project satisfies its stated scope."
                ),
                evidence_citations=citations[:1],
                confidence="medium",
            ),
        ]

        # Correlations
        correlations = []
        if req_citation and file_citation:
            correlations.append(
                AICrossArtifactCorrelation(
                    claim_source=f"Requirement {req_citation.identifier}",
                    implementation_evidence=file_citation.identifier,
                    correlation_status="supported",
                    explanation="Candidate implementation evidence was identified in the repository snapshot.",
                    citations=[req_citation, file_citation],
                )
            )

        # Contradictions
        contradictions = []
        if req_citation:
            contradictions.append(
                AIContradiction(
                    headline="Documented backup mechanism lacks repository verification evidence",
                    specification_claim="System documentation describes automated failover and backup capabilities.",
                    repository_reality="No supporting implementation evidence was found in the analyzed repository snapshot.",
                    discrepancy_explanation=(
                        "While the specification describes high availability, repository evidence does not yet "
                        "contain dedicated clustering or failover configuration scripts."
                    ),
                    severity_assessment="moderate",
                    citations=[req_citation],
                )
            )

        # Evidence gaps
        evidence_gaps = [
            AIEvidenceGap(
                area="scalability",
                missing_evidence_description=(
                    "No load testing scripts, benchmarking reports, or concurrent user assumptions were available in evidence."
                ),
                why_needed=(
                    "Evaluators cannot verify scalability claims without concrete performance metrics or testing evidence."
                ),
                recommended_evidence="Provide Locust/k6 load test scripts or document expected RPS bounds.",
            )
        ]

        # Diagnostic interpretations
        diagnostic_interpretations = []
        if finding_interpretation:
            diagnostic_interpretations.append(finding_interpretation)

        return AIAnalysisResult(
            analysis_summary=(
                f"Project Doctor evaluated '{evidence.project_title}' across specifications, "
                f"repository snapshot evidence, and deterministic diagnostic findings. "
                "The project demonstrates a clear architectural direction with manageable verification gaps."
            ),
            project_understanding=ProjectUnderstandingAssessment(
                summary=evidence.project_context.get("description", "A technical student project."),
                primary_purpose=evidence.project_context.get("problem_statement", "Solving an engineering problem."),
                target_users_identified=["Students", "Evaluators"],
                key_capabilities_claimed=["Evaluation", "Traceability"],
                evidence_basis="Extracted from proposal documentation and synced repository snapshot tree.",
                confidence="high",
            ),
            observations=observations,
            cross_artifact_correlations=correlations,
            contradictions=contradictions,
            evidence_gaps=evidence_gaps,
            diagnostic_interpretations=diagnostic_interpretations,
            uncertainty_notes=[
                "Runtime execution behavior could not be directly observed from static snapshot analysis."
            ],
        )
