import re

content = open('backend/app/services/ai/groq_client.py', encoding='utf-8').read()

pattern = re.compile(r'    def generate_session_recap\(self, answered_data: list\[dict\]\).*?            return \{"recap": "An error occurred while generating the recap."\}', re.DOTALL)

new_code = '''    def generate_session_recap(self, answered_data: list[dict], skipped_count: int = 0) -> dict:
        import json
        import httpx
        
        prompt_text = f"""You are an expert evaluator assessing a student's software project defense.
Review the following Q&A session. Summarize the student's overall performance.
Provide a calm, constructive summary grounded in the answers actually submitted and their validated per-question feedback.
Do NOT make unsupported blanket judgments such as 'all answers were nonsensical', 'dismissive', or 'consistently inadequate'. 
Do NOT shame students for skipping, saying 'not sure', or lacking evidence that was not available in the session.
If there is too little information to assess a category, say so plainly.
Do NOT invent project facts, show raw evidence UUIDs, assign numeric grades or readiness scores, or compare students.

Session Data:
{json.dumps(answered_data, indent=2)}
Skipped questions: {skipped_count}

Return ONLY a valid JSON object matching this exact schema:
{{
    "project_understanding": "<Clear summary of project understanding>",
    "flow_description": "<How clearly the student explained the process or flow>",
    "technical_clarity": "<Technical clarity and language>",
    "relevant_specifics": "<Relevant specifics (e.g. code/files) when accurately explained>",
    "evidence_support": "<What the analyzed evidence does or does not support>",
    "next_step": "<Useful next steps>"
}}
"""
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        
        client_cm = (
            self.http_client
            if self.http_client is not None
            else httpx.Client(timeout=self.timeout_seconds)
        )
        
        try:
            resp = client_cm.post(
                GROQ_API_URL,
                headers=headers,
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt_text}],
                    "response_format": {"type": "json_object"}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            return json.loads(content)
        except Exception:
            return {
                "project_understanding": "Unable to generate summary.",
                "flow_description": "Unable to generate summary.",
                "technical_clarity": "Unable to generate summary.",
                "relevant_specifics": "Unable to generate summary.",
                "evidence_support": "Unable to generate summary.",
                "next_step": "Unable to generate summary."
            }'''

new_content = pattern.sub(new_code, content)
open('backend/app/services/ai/groq_client.py', 'w', encoding='utf-8').write(new_content)
