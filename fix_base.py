import re
content = open('backend/app/services/ai/base.py', encoding='utf-8').read()

# Fix duplicated prompt
dup_q_prompt_regex = r'\"\"\"You are an expert evaluator assessing a student\'s software project\..*?\{json\.dumps\(evidence_package, indent=2\)\}\n\"\"\"'
content = re.sub(dup_q_prompt_regex, '', content, flags=re.DOTALL)

# Fix duplicated feedback prompt
dup_f_prompt_regex = r'\"\"\"\nYou are evaluating a student\'s explanation of their technical project\..*?\"next_step\": \(string\) A useful, actionable next step for the student\.\n\"\"\"'
content = re.sub(dup_f_prompt_regex, '', content, flags=re.DOTALL)

# Update format_defend_feedback to return JSON
new_format = """    @staticmethod
    def format_defend_feedback(parsed_resp: dict, evidence_context: dict) -> str:
        # Validate schema strictly
        from pydantic import BaseModel, ConfigDict, ValidationError
        
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
                
        return validated.model_dump_json()"""

content = re.sub(r'    @staticmethod\n    def format_defend_feedback.*?return feedback\.strip\(\)', new_format, content, flags=re.DOTALL)

open('backend/app/services/ai/base.py', 'w', encoding='utf-8').write(content)
