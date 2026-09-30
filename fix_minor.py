import re

# Fix ReviewDeskPage
with open('frontend/src/pages/ReviewDeskPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add CheckCircle2 to lucide imports
code = re.sub(r'AlertCircle,', 'AlertCircle, CheckCircle2,', code)

with open('frontend/src/pages/ReviewDeskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

# Fix KeyFindingPager duplicates
with open('frontend/src/components/desk/KeyFindingPager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the duplicates from the earlier replacement
code = re.sub(r'Layers,\s*ChevronLeft,\s*ChevronRight,', 'Layers,', code, count=1)

with open('frontend/src/components/desk/KeyFindingPager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

# Fix morphing-dialog.tsx props unused
with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We used {...props} in motion.button but typescript complains props is not read? 
# Ah, I replaced motion.button with onClick={(e) => { handleClick(); onClick?.(e as any); }} {...props}. Why would it be unread?
# Let's check if the replacement actually put {...props} in.
