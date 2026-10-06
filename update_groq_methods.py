import re
content = open('backend/app/services/ai/groq_client.py', encoding='utf-8').read()

new_evaluate = """    def evaluate_defend_attempt(self, evidence_context: dict, question: str, student_answer: str) -> dict:
        import json
        import httpx
        
        prompt_text = self.build_defend_prompt(evidence_context, question, student_answer)
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
            raw_text = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_text)
            return {"feedback": self.format_defend_feedback(parsed, evidence_context)}
        except Exception as e:
            logger.error(f"Groq error generating defend feedback: {e}")
            raise
        finally:
            if self.http_client is None:
                client_cm.close()"""

new_generate = """    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        import httpx
        
        prompt_text = self.build_defend_questions_prompt(evidence_package)
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
            raw_text = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_text)
            return self.parse_and_validate_defend_questions(parsed, evidence_package)
        except Exception as e:
            logger.error(f"Groq error generating defend questions: {e}")
            raise
        finally:
            if self.http_client is None:
                client_cm.close()"""

# Replace evaluate_defend_attempt
content = re.sub(r'    def evaluate_defend_attempt.*?logger\.error.*?raise', new_evaluate, content, flags=re.DOTALL)
# Replace generate_defend_questions
content = re.sub(r'    def generate_defend_questions.*?return self\.parse_and_validate_defend_questions\(parsed, evidence_package\)', new_generate, content, flags=re.DOTALL)

open('backend/app/services/ai/groq_client.py', 'w', encoding='utf-8').write(content)
