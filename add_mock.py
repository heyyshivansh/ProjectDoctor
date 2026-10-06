import os

content = open('backend/app/services/ai/mock_provider.py', encoding='utf-8').read()

mock_method = """
    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        questions = []
        for finding in evidence_package.get("findings", [])[:2]:
            cited = []
            for ref in finding.get("evidence_references", []):
                if isinstance(ref, dict) and "target_id" in ref:
                    cited.append(str(ref["target_id"]))
            
            questions.append({
                "question_text": f"Mock finding question about {finding['title']}",
                "evidence_type": "finding",
                "evidence_id": str(finding["id"]),
                "cited_ids": cited
            })
            
        for trace in evidence_package.get("traces", [])[:2]:
            cited = []
            for link in trace.get("links", []):
                if "id" in link:
                    cited.append(str(link["id"]))
            
            questions.append({
                "question_text": f"Mock trace question for {trace.get('requirement_title', 'Req')}",
                "evidence_type": "requirement_trace",
                "evidence_id": str(trace["id"]),
                "cited_ids": cited
            })
            
        if not questions:
            raise ValueError("No mock evidence to draft from")
            
        # Optional validation
        # self.parse_and_validate_defend_questions({"questions": questions}, evidence_package)
            
        return questions
"""

content += mock_method
open('backend/app/services/ai/mock_provider.py', 'w', encoding='utf-8').write(content)
