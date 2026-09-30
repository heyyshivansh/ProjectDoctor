import re

with open('frontend/src/components/desk/KeyFindingPager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove old Prev / Next Buttons from header
header_pattern = re.compile(r'\{\/\* Prev \/ Next Buttons \*\/\}\s*<div className="flex items-center gap-2 shrink-0">.*?</div>', re.DOTALL)
code = header_pattern.sub('', code)

# We need ChevronLeft and ChevronRight
code = code.replace('Layers,', 'Layers, ChevronLeft, ChevronRight,')

# Find AnimatePresence block
animate_pattern = re.compile(r'(<AnimatePresence mode="wait">\s*<motion\.div[\s\S]*?</motion\.div>\s*</AnimatePresence>)', re.DOTALL)

# Wrap it in the flex layout
new_layout = '''
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Previous Button - Left on desktop, Top/Bottom on mobile? Actually let's use order for mobile to put them together at bottom */}
        <button
          onClick={() => onSelectFinding(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous finding"
          className="hidden sm:flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-ai)] hover:bg-[var(--pd-surface-raised)] disabled:opacity-30 disabled:pointer-events-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 w-full min-w-0">
          \\1
        </div>

        {/* Next Button - Right on desktop */}
        <button
          onClick={() => onSelectFinding(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          aria-label="Next finding"
          className="hidden sm:flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-ai)] hover:bg-[var(--pd-surface-raised)] disabled:opacity-30 disabled:pointer-events-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Mobile-only prev/next row (below the card) */}
      <div className="flex sm:hidden items-center justify-between gap-4 mt-2 px-2">
        <button
          onClick={() => onSelectFinding(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous finding"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Previous</span>
        </button>
        <button
          onClick={() => onSelectFinding(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          aria-label="Next finding"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)]"
        >
          <span className="text-sm font-medium">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
'''
code = animate_pattern.sub(new_layout, code)

with open('frontend/src/components/desk/KeyFindingPager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
