import re
content = open('app/services/defend/defend_service.py').read()
content = content.replace('ai_drafted_questions = llm.generate_defend_questions(evidence_package)\n            import traceback\n            print("GENERATED:", ai_drafted_questions)', 'ai_drafted_questions = llm.generate_defend_questions(evidence_package)')
content = content.replace('import traceback; traceback.print_exc(); logger.warning(f"AI question generation failed', 'logger.warning(f"AI question generation failed')
open('app/services/defend/defend_service.py', 'w').write(content)
