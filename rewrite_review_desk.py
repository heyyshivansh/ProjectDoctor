import re

with open('frontend/src/pages/ReviewDeskPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
import_stmt = "import { AnalyzeView } from '@/components/analyze/AnalyzeView';\n"
if 'AnalyzeView' not in code:
    code = re.sub(r'(import [^\n]+;\n)', r'\1' + import_stmt, code, count=1)

# Find the block and replace
# It starts with {/* VIEW 4: ANALYZE */} and ends before {/* VIEW 5: IMPROVE */}
pattern = re.compile(r'\{\/\* VIEW 4: ANALYZE \*\/\}\s*\{activeSection === \'analyze\' && \([\s\S]*?\n          \)\}', re.DOTALL)

replacement = '''{/* VIEW 4: ANALYZE */}
        {activeSection === 'analyze' && (
          <AnalyzeView 
            project={project}
            repoConnection={repoConnection}
            analysisStatus={analysisStatus}
            setActiveSection={setActiveSection}
          />
        )}'''

code = pattern.sub(replacement, code)

with open('frontend/src/pages/ReviewDeskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
