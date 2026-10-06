import re

content = open('backend/app/services/ai/mock_provider.py', encoding='utf-8').read()

new_code = """    def generate_session_recap(self, answered_data: list[dict], skipped_count: int = 0) -> dict:
        if not answered_data:
            return {
                "project_understanding": "No questions were answered.",
                "flow_description": "N/A",
                "technical_clarity": "N/A",
                "relevant_specifics": "N/A",
                "evidence_support": "N/A",
                "next_step": "Try answering questions next time."
            }
        return {
            "project_understanding": "The student has a good grasp of the project.",
            "flow_description": "The flow was explained clearly.",
            "technical_clarity": "The technical clarity was high.",
            "relevant_specifics": "The student provided relevant specifics.",
            "evidence_support": "The evidence supports the explanation.",
            "next_step": "Keep up the good work."
        }"""

pattern = re.compile(r'    def generate_session_recap\(self, answered_data: list\[dict\]\) -> dict:.*?        \}', re.DOTALL)
new_content = pattern.sub(new_code, content)
open('backend/app/services/ai/mock_provider.py', 'w', encoding='utf-8').write(new_content)
