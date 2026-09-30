import re

with open("frontend/src/components/analyze/AnalyzeView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("import { Project, RepositoryConnection } from '@/types/project';", "import { ProjectDetail } from '@/types/project';\nimport { RepositoryConnection } from '@/types/repository';")
code = code.replace("project: Project;", "project: ProjectDetail;")

with open("frontend/src/components/analyze/AnalyzeView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

with open("frontend/src/types/analysis.ts", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace('"pending" | "active" | "completed" | "failed" | "skipped"', '"pending" | "active" | "completed" | "failed" | "skipped" | "unavailable"')

with open("frontend/src/types/analysis.ts", "w", encoding="utf-8") as f:
    f.write(code)
