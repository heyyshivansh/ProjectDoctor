def rewrite(file_path, old_method, new_method):
    content = open(file_path, 'r', encoding='utf-8').read()
    if old_method in content:
        content = content.replace(old_method, new_method)
        open(file_path, 'w', encoding='utf-8').write(content)

old_method = """    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        prompt = self.build_defend_questions_prompt(evidence_package)
        raw_text = self._generate_json(prompt)
        import json
        parsed = json.loads(raw_text)
        return self.parse_and_validate_defend_questions(parsed, evidence_package)"""

groq_new = """    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        import groq
        prompt_text = self.build_defend_questions_prompt(evidence_package)
        client = groq.Client(api_key=self.api_key.strip())
        resp = client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt_text}],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(resp.choices[0].message.content)
        return self.parse_and_validate_defend_questions(parsed, evidence_package)"""

gemini_new = """    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        from google import genai
        from google.genai import types
        prompt_text = self.build_defend_questions_prompt(evidence_package)
        client = genai.Client(api_key=self.api_key.strip())
        resp = client.models.generate_content(
            model=self.model_name,
            contents=prompt_text,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        parsed = json.loads(resp.text)
        return self.parse_and_validate_defend_questions(parsed, evidence_package)"""

or_new = """    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        import httpx
        from app.core.config import settings
        prompt_text = self.build_defend_questions_prompt(evidence_package)
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "HTTP-Referer": settings.SITE_URL,
            "X-Title": settings.SITE_NAME,
        }
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
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

rewrite('backend/app/services/ai/groq_client.py', old_method, groq_new)
rewrite('backend/app/services/ai/gemini_client.py', old_method, gemini_new)
rewrite('backend/app/services/ai/openrouter_client.py', old_method, or_new)
