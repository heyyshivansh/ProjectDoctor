import re

with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Revert MorphingDialogTriggerProps
code = re.sub(r'export type MorphingDialogTriggerProps = React\.ButtonHTMLAttributes<HTMLButtonElement> & \{', 'export type MorphingDialogTriggerProps = {', code)

code = re.sub(r'function MorphingDialogTrigger\(\{[\s\S]*?\}\:\s*MorphingDialogTriggerProps\)\s*\{', '''function MorphingDialogTrigger({
  children,
  className,
  style,
  triggerRef,
}: MorphingDialogTriggerProps) {''', code)

code = code.replace('<motion.button {...props} ', '<motion.button ')

with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Change the trigger back to a wrapper
trigger_block = '''      <MorphingDialogTrigger className="w-full text-left">
        <span
          onPointerDown={fetchDetail}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "group relative cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all duration-200 w-full",
            "hover:border-[var(--pd-mint)]/40 hover:shadow-pd-glow-mint"
          )}
        >
          <span className="space-y-3 block">
            <span className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] text-[11px] font-mono font-medium border border-[var(--pd-mint)]/20">
                <BadgeIcon className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </span>
            <span className="text-base font-semibold text-[var(--pd-text-primary)] leading-snug tracking-tight block">
              {capabilityName}
            </span>
            <span className="text-xs text-[var(--pd-text-body)] leading-relaxed line-clamp-2 block">
              {isHovered && strength.why_it_matters
                ? strength.why_it_matters
                : strength.summary || "Implementation and automated test suite confirmed by deterministic evidence."}
            </span>
          </span>
          <span className="pt-3 mt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-[11px] font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-mint)] transition-colors">
            <span>{isHovered ? "Inspect proof \\u2192" : "Confirmed by code & tests"}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">\\u2192</span>
          </span>
        </span>
      </MorphingDialogTrigger>'''

# Replace the current trigger block
code = re.sub(r'<MorphingDialogTrigger\s+onPointerDown=\{fetchDetail\}[\s\S]*?</MorphingDialogTrigger>', trigger_block.replace('\\\\', '\\'), code)

with open('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
