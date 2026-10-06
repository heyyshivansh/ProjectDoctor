import re

content = open('backend/app/services/defend/defend_service.py').read()
content = content.replace('ai_drafted_questions = llm.generate_defend_questions(evidence_package)', 'ai_drafted_questions = llm.generate_defend_questions(evidence_package)\n            import traceback\n            print("GENERATED:", ai_drafted_questions)')
content = content.replace('logger.warning(f"AI question generation failed', 'import traceback; traceback.print_exc(); logger.warning(f"AI question generation failed')
open('backend/app/services/defend/defend_service.py', 'w').write(content)
