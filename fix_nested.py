import re

def fix_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        code = f.read()

    # Find <MorphingDialogTrigger> followed by <button className="X"> Y </button>
    # and replace with <MorphingDialogTrigger className="X"> Y </MorphingDialogTrigger>
    
    pattern = re.compile(r'<MorphingDialogTrigger>\s*<button\s+className="([^"]+)"\s*>(.*?)</button>\s*</MorphingDialogTrigger>', re.DOTALL)
    
    code = pattern.sub(r'<MorphingDialogTrigger className="\1">\2</MorphingDialogTrigger>', code)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(code)

fix_file('frontend/src/components/improve/ImprovementStage.tsx')
fix_file('frontend/src/components/desk/KeyFindingPager.tsx')
