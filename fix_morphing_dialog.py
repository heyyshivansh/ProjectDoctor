import re

with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the MorphingDialogTrigger motion.button with one that spreads ...props
# First let's just make sure props is used or removed.
# I will just spread props into motion.button.
func_pattern = re.compile(r'(<motion\.button\s+ref=\{triggerRef\}\s+layoutId=\{dialog-\$\{uniqueId\}\}\s+className=\{cn\(\'relative cursor-pointer\', className\)\}\s+onClick=\{handleClick\}\s+onKeyDown=\{handleKeyDown\}\s+style=\{style\}\s+aria-haspopup=\'dialog\'\s+aria-expanded=\{isOpen\}\s+aria-controls=\{motion-ui-morphing-dialog-content-\$\{uniqueId\}\}\s+aria-label=\{Open dialog \$\{uniqueId\}\}\s+>)', re.DOTALL)

code = func_pattern.sub(r'\\1\n      {...props}', code)

with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
