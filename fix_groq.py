content = open('backend/app/services/ai/groq_client.py', 'r', encoding='utf-8').read()
new_groq = """    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        import httpx
        prompt_text = self.build_defend_questions_prompt(evidence_package)
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        resp = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json={
                "model": self.model_name,
                "messages": [{"role": "user", "content": prompt_text}],
                "response_format": {"type": "json_object"}
            },
            timeout=120.0
        )
        resp.raise_for_status()
        parsed = json.loads(resp.json()["choices"][0]["message"]["content"])
        return self.parse_and_validate_defend_questions(parsed, evidence_package)"""
import re
content = re.sub(r'    def generate_defend_questions.*?return self\.parse_and_validate_defend_questions\(parsed, evidence_package\)', new_groq, content, flags=re.DOTALL)
open('backend/app/services/ai/groq_client.py', 'w', encoding='utf-8').write(content)
