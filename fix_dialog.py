import re

with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

props_type = '''export type MorphingDialogTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  triggerRef?: React.RefObject<HTMLButtonElement>;
};'''

code = re.sub(r'export type MorphingDialogTriggerProps = \{[\s\S]*?\};', props_type, code)

func_decl = '''function MorphingDialogTrigger({
  children,
  className,
  style,
  triggerRef,
  onClick,
  ...props
}: MorphingDialogTriggerProps) {'''

code = re.sub(r'function MorphingDialogTrigger\(\{\s*children,\s*className,\s*style,\s*triggerRef,\s*\}\:\s*MorphingDialogTriggerProps\)\s*\{', func_decl, code)

button_code = '''    <motion.button
      ref={triggerRef}
      layoutId={dialog-}
      className={cn('relative cursor-pointer', className)}
      aria-label={Open dialog }
      onClick={(e) => {
        handleClick();
        onClick?.(e as any);
      }}
      {...props}
    >'''

code = re.sub(r'<motion\.button\s+ref=\{triggerRef\}\s+layoutId=\{dialog-\$\{uniqueId\}\}\s+className=\{cn\(\'relative cursor-pointer\', className\)\}\s+aria-label=\{Open dialog \$\{uniqueId\}\}\s+>', button_code, code)

with open('frontend/src/components/motion-primitives/morphing-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
