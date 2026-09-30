with open("frontend/src/components/analyze/AnalyzeView.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "files\\" in line or "GitHub Repository" in line:
        lines[i] = "                  {repoConnection.current_snapshot ? `${repoConnection.current_snapshot.total_files} files` : 'GitHub Repository'}\n"
    if "\\`\\${" in line:
        lines[i] = line.replace("\\`\\${", "`${").replace("\\`", "`")

with open("frontend/src/components/analyze/AnalyzeView.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
