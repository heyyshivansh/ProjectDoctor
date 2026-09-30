with open("frontend/src/components/analyze/AnalyzeView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("\\`AI review ${status}`", "`AI review ${status}`")
code = code.replace("\\`", "`")

with open("frontend/src/components/analyze/AnalyzeView.tsx", "w", encoding="utf-8") as f:
    f.write(code)
