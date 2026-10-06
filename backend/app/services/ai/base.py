from abc import ABC, abstractmethod
from typing import Optional
from app.schemas.ai_analysis import AIAnalysisResult
from app.schemas.ai_evidence import AIEvidencePackage


class AIProviderError(Exception):
    """Base exception for AI provider failures."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class AIProviderConfigurationError(AIProviderError):
    """Raised when an AI provider's configuration or credentials are missing or invalid."""

    pass


class GeminiConfigurationError(AIProviderConfigurationError):
    """Raised when the Gemini API key or environment configuration is missing or invalid."""

    pass


class GeminiRateLimitError(AIProviderError):
    """Raised when Gemini API rate limits (HTTP 429) are exhausted after retries."""

    pass


class GeminiTimeoutError(AIProviderError):
    """Raised when Gemini API call times out."""

    pass


class GeminiServiceUnavailableError(AIProviderError):
    """Raised when Gemini API is unavailable (HTTP 503 / 504) after retries."""

    pass


class OpenRouterConfigurationError(AIProviderConfigurationError):
    """Raised when OpenRouter API key or configuration is missing or invalid."""

    pass


class OpenRouterRateLimitError(AIProviderError):
    """Raised when OpenRouter rate limits (HTTP 429) or credits are exhausted."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = 429,
        limit_source: Optional[str] = None,
        provider_name: Optional[str] = None,
        remedy_hint: Optional[str] = None,
    ):
        super().__init__(message, status_code=status_code)
        self.limit_source = limit_source
        self.provider_name = provider_name
        self.remedy_hint = remedy_hint


class OpenRouterTimeoutError(AIProviderError):
    """Raised when OpenRouter API call times out."""

    pass


class OpenRouterServiceUnavailableError(AIProviderError):
    """Raised when OpenRouter service is unavailable (HTTP 502/503/504) after retries."""

    pass


class GroqConfigurationError(AIProviderConfigurationError):
    """Raised when Groq API key or configuration is missing or invalid."""

    pass


class GroqRateLimitError(AIProviderError):
    """Raised when Groq rate limits (HTTP 429) or quota are exhausted."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = 429,
        retry_after: Optional[float] = None,
    ):
        super().__init__(message, status_code=status_code)
        self.retry_after = retry_after


class GroqTimeoutError(AIProviderError):
    """Raised when Groq API call times out."""

    pass


class GroqServiceUnavailableError(AIProviderError):
    """Raised when Groq service is unavailable (HTTP 500/502/503/504) after retries."""

    pass


class AIAnalysisGenerationError(AIProviderError):
    """Raised when AI reasoning output cannot be generated or validated."""

    pass


class BaseAIProvider(ABC):
    """Abstract interface for AI reasoning engines."""

    provider_name: str = "base"
    model_name: str = "default"
    last_succeeded_model: Optional[str] = None

    @abstractmethod
    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str,
    ) -> AIAnalysisResult:
        """Execute structured project reasoning over the supplied evidence package."""
        pass

    @staticmethod
    def build_defend_prompt(evidence_context: dict, question: str, student_answer: str) -> str:
        import json
        evidence_str = json.dumps(evidence_context, indent=2)
        return f"""
You are evaluating a student's explanation of their technical project in a supportive, viva-style voice. Address the student directly (use "you", not "the student").

Context Evidence Provided: 
{evidence_str}

Question asked: {question}
Student's Answer: {student_answer}

Evaluate the response in a constructive voice. Give useful, concise feedback. Do not assign grades, numeric scores, percentages, pass/fail results, or readiness ratings. Do not require file paths or code to earn positive feedback.

You must output a JSON object with the following exact keys:
- "what_explained_clearly": (string) Did they explain what the feature does and why?
- "flow_description": (string) Did they describe the steps in a coherent order, to the extent project evidence supports it?
- "technical_specificity": (string) Was the explanation understandable and technically precise? Recognize correct plain-language explanations. If they mention relevant files/code accurately, recognize that.
- "evidence_support": (string) Explain which available evidence supports or does not confirm their claims. Reward honest uncertainty. If evidence is missing, state it cannot be verified from the available snapshot. Do not invent project details.
- "next_step": (string) A useful, actionable next step for the student.
- "cited_evidence": (array of strings) The exact evidence IDs from the context that support your evaluation.
"""

    @abstractmethod
    def evaluate_defend_attempt(self, evidence_context: dict, question: str, student_answer: str) -> dict:
        """Evaluate a student's defend attempt."""
        pass

    @abstractmethod
    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        """Draft a set of practice questions from the provided evidence package."""
        pass

    @staticmethod
    def build_defend_questions_prompt(evidence_package: dict) -> str:
        import json
        return f"""You are an expert evaluator assessing a student's software project in a viva-style practice session.
Based on the following project evidence, generate a list of focused practice questions for the student to explain their work.

Guidelines:
1. Each question must focus on ONE clear task or capability. Do not repeat long requirement lists in the question.
2. Ask one clear, open-ended, project-specific question at a time. Invite the student to describe how a feature or user flow works in their own words.
3. Do not make every question ask the student to point to specific code or evidence. Students may answer with a plain-language explanation, technical details, file references, or a mix.
4. Keep questions short and conversational. Example: "How does a user upload a file in your project?" rather than "What evidence shows how a user uploads a file?"
5. Limit your output to a compact practice session (at most 5 questions). Prevent duplicate or near-duplicate question intents.
6. Provide the exact source evidence IDs (finding IDs, traceability IDs, or link IDs) that motivated the question in the `cited_ids` array.
7. The `evidence_id` must perfectly match the ID of the finding or requirement_trace object you are questioning.

Return ONLY a valid JSON object matching this schema exactly:
{{
    "questions": [
        {{
            "question_text": "...",
            "evidence_type": "finding",
            "evidence_id": "id_of_the_finding_or_trace",
            "cited_ids": ["id1", "id2"]
        }}
    ]
}}
Note: evidence_type must be either "finding" or "requirement_trace".

Evidence Package:
{json.dumps(evidence_package, indent=2)}
"""

    @staticmethod
    def parse_and_validate_defend_questions(parsed_resp: dict, evidence_package: dict) -> list[dict]:
        from pydantic import BaseModel, ConfigDict, ValidationError
        from typing import Literal

        class DraftedQuestion(BaseModel):
            model_config = ConfigDict(extra="forbid", strict=True)
            question_text: str
            evidence_type: Literal["finding", "requirement_trace"]
            evidence_id: str
            cited_ids: list[str]

        class DraftedQuestionsOutput(BaseModel):
            model_config = ConfigDict(extra="forbid", strict=True)
            questions: list[DraftedQuestion]

        try:
            validated = DraftedQuestionsOutput.model_validate(parsed_resp)
        except ValidationError as e:
            raise ValueError(f"Malformed AI questions schema: {e}")

        if not validated.questions:
            raise ValueError("AI returned empty questions list.")

        finding_allowlist = {}
        for f in evidence_package.get("findings", []):
            allowed = {str(f.get("id"))}
            for ref in f.get("evidence_references", []):
                if isinstance(ref, dict) and "target_id" in ref:
                    allowed.add(str(ref["target_id"]))
            finding_allowlist[str(f.get("id"))] = allowed

        trace_allowlist = {}
        for t in evidence_package.get("traces", []):
            allowed = {str(t.get("id"))}
            for link in t.get("links", []):
                if "id" in link:
                    allowed.add(str(link["id"]))
            trace_allowlist[str(t.get("id"))] = allowed

        seen_questions = set()
        for q in validated.questions:
            if q.question_text in seen_questions:
                raise ValueError(f"Duplicate question generated: {q.question_text}")
            seen_questions.add(q.question_text)

            if q.evidence_type == "finding":
                if q.evidence_id not in finding_allowlist:
                    raise ValueError(f"Invalid finding evidence_id cited: {q.evidence_id}")
                for cid in q.cited_ids:
                    if str(cid) not in finding_allowlist[q.evidence_id]:
                        raise ValueError(f"Invalid cited_id {cid} for finding {q.evidence_id}")
            else:
                if q.evidence_id not in trace_allowlist:
                    raise ValueError(f"Invalid trace evidence_id cited: {q.evidence_id}")
                for cid in q.cited_ids:
                    if str(cid) not in trace_allowlist[q.evidence_id]:
                        raise ValueError(f"Invalid cited_id {cid} for trace {q.evidence_id}")

        return [q.model_dump() for q in validated.questions]

    @staticmethod
    def format_defend_feedback(parsed_resp: dict, evidence_context: dict) -> str:
        # Validate schema strictly
        from pydantic import BaseModel, ConfigDict, ValidationError
        
        class DefendRecapSchema(BaseModel):
            project_understanding: str
            flow_description: str
            technical_clarity: str
            relevant_specifics: str
            evidence_support: str
            next_step: str
        class DefendFeedbackSchema(BaseModel):
            model_config = ConfigDict(extra="forbid", strict=True)
            what_explained_clearly: str
            flow_description: str
            technical_specificity: str
            evidence_support: str
            next_step: str
            cited_evidence: list[str]
                        
        try:
            validated = DefendFeedbackSchema.model_validate(parsed_resp)
        except ValidationError as e:
            raise ValueError(f"Malformed AI feedback schema: {e}")
            
        # Collect strictly allowed IDs from evidence context
        allowed_ids = set()
        if evidence_context.get("type") == "finding":
            if "id" in evidence_context:
                allowed_ids.add(str(evidence_context["id"]))
            if "evidence_references" in evidence_context:
                for ref in evidence_context["evidence_references"]:
                    if isinstance(ref, dict) and "target_id" in ref:
                        allowed_ids.add(str(ref["target_id"]))
        elif evidence_context.get("type") == "requirement_trace":
            if "id" in evidence_context:
                allowed_ids.add(str(evidence_context["id"]))
            if "links" in evidence_context:
                for link in evidence_context["links"]:
                    if "id" in link:
                        allowed_ids.add(str(link["id"]))
                    
        # Verify citations
        for cite in validated.cited_evidence:
            if str(cite) not in allowed_ids:
                raise ValueError(f"AI cited invalid evidence ID: {cite}")
                
        return validated.model_dump_json()

    def generate_session_recap(self, answered_data: list[dict]) -> dict:
        raise NotImplementedError("Subclasses must implement generate_session_recap")
