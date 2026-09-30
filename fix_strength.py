import re

with open('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

trigger_replacement = '''    <MorphingDialog transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
      <MorphingDialogTrigger
        onPointerDown={fetchDetail}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all duration-200 w-full text-left",
          "hover:border-[var(--pd-mint)]/40 hover:shadow-pd-glow-mint"
        )}
      >
        <div className="space-y-3">'''

code = re.sub(r'<MorphingDialogTrigger className="w-full text-left">\s*<div\s+onClick=\{fetchDetail\}\s+onMouseEnter=\{\(\) => setIsHovered\(true\)\}\s+onMouseLeave=\{\(\) => setIsHovered\(false\)\}\s+className=\{cn\([\s\S]*?\)\s*>\s*<div className="space-y-3">', trigger_replacement, code)

code = code.replace('</span>\n          </div>\n        </div>\n      </MorphingDialogTrigger>', '</span>\n          </div>\n      </MorphingDialogTrigger>')

with open('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
