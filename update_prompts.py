import re
content = open('backend/app/services/ai/base.py', encoding='utf-8').read()

new_q_prompt = """    def build_defend_questions_prompt(evidence_package: dict) -> str:
        import json
        return f\"\"\"You are an expert evaluator assessing a student's software project in a viva-style practice session.
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
\"\"\""""

content = re.sub(r'    def build_defend_questions_prompt.*?\"\"\"', new_q_prompt, content, flags=re.DOTALL)

new_f_prompt = """    def build_defend_prompt(evidence_context: dict, question: str, student_answer: str) -> str:
        import json
        evidence_str = json.dumps(evidence_context, indent=2)
        return f\"\"\"
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
\"\"\""""

content = re.sub(r'    def build_defend_prompt.*?\"\"\"', new_f_prompt, content, flags=re.DOTALL)

# Now update DefendFeedbackSchema
new_schema = """        class DefendFeedbackSchema(BaseModel):
            model_config = ConfigDict(extra="forbid", strict=True)
            what_explained_clearly: str
            flow_description: str
            technical_specificity: str
            evidence_support: str
            next_step: str
            cited_evidence: list[str]"""

content = re.sub(r'        class DefendFeedbackSchema.*?cited_evidence: list\[str\]', new_schema, content, flags=re.DOTALL)
content = re.sub(r'remaining_uncertainty: str\n\s*next_step: str\n', '', content, flags=re.DOTALL)

open('backend/app/services/ai/base.py', 'w', encoding='utf-8').write(content)
