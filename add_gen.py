import os

providers = [
    'backend/app/services/ai/gemini_client.py',
    'backend/app/services/ai/groq_client.py',
    'backend/app/services/ai/openrouter_client.py'
]

gen_method = """
    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        prompt = self.build_defend_questions_prompt(evidence_package)
        raw_text = self._generate_json(prompt)
        import json
        parsed = json.loads(raw_text)
        return self.parse_and_validate_defend_questions(parsed, evidence_package)
"""

for p in providers:
    content = open(p, encoding='utf-8').read()
    content += gen_method
    open(p, 'w', encoding='utf-8').write(content)
