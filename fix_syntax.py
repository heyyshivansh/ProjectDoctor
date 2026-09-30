import re

# Fix ReviewDeskPage
with open('frontend/src/pages/ReviewDeskPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('f"{repoConnection.current_snapshot.total_files} files"', '${repoConnection.current_snapshot.total_files} files')
with open('frontend/src/pages/ReviewDeskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

# Fix VerifiedStrengthsShowcase
with open('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We need to make sure the div tags match. The trigger is currently wrapping a div that was partially replaced.
# Let's just fix the trigger block.
trigger_regex = re.compile(r'<MorphingDialogTrigger[\s\S]*?>\s*<div className="space-y-3">', re.DOTALL)
trigger_match = trigger_regex.search(code)

if trigger_match:
    # Let's count divs and see what's missing
    pass
# Wait, the easiest way is just to rewrite the whole component correctly without nested regex mess.

