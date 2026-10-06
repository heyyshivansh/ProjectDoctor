import re
content = open('frontend/src/components/defend/DefendStage.tsx', encoding='utf-8').read()

new_feedback_block = """                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fb.what_explained_clearly && (
                              <div className="bg-white p-4 rounded-lg border border-[var(--pd-border)] shadow-sm">
                                <p className="text-xs font-bold text-[var(--pd-text-muted)] uppercase tracking-wider mb-2">What you explained clearly</p>
                                <p className="text-sm text-[var(--pd-text-body)] leading-relaxed">{fb.what_explained_clearly}</p>
                              </div>
                            )}
                            {fb.flow_description && (
                              <div className="bg-white p-4 rounded-lg border border-[var(--pd-border)] shadow-sm">
                                <p className="text-xs font-bold text-[var(--pd-text-muted)] uppercase tracking-wider mb-2">Flow Description</p>
                                <p className="text-sm text-[var(--pd-text-body)] leading-relaxed">{fb.flow_description}</p>
                              </div>
                            )}
                            {fb.technical_specificity && (
                              <div className="bg-white p-4 rounded-lg border border-[var(--pd-border)] shadow-sm">
                                <p className="text-xs font-bold text-[var(--pd-text-muted)] uppercase tracking-wider mb-2">Technical Specificity</p>
                                <p className="text-sm text-[var(--pd-text-body)] leading-relaxed">{fb.technical_specificity}</p>
                              </div>
                            )}
                            {fb.evidence_support && (
                              <div className="bg-white p-4 rounded-lg border border-[var(--pd-border)] shadow-sm">
                                <p className="text-xs font-bold text-[var(--pd-text-muted)] uppercase tracking-wider mb-2">Evidence Support</p>
                                <p className="text-sm text-[var(--pd-text-body)] leading-relaxed">{fb.evidence_support}</p>
                              </div>
                            )}
                            {fb.next_step && (
                              <div className="bg-[var(--pd-surface-raised)] p-4 rounded-lg border border-[var(--pd-border)] shadow-sm md:col-span-2">
                                <p className="text-xs font-bold text-[var(--pd-emerald)] uppercase tracking-wider mb-2">Next Step</p>
                                <p className="text-sm text-[var(--pd-text-body)] leading-relaxed">{fb.next_step}</p>
                              </div>
                            )}
                          </div>
                        );"""

old_fb_regex = r'return \(\s*<div className=\"space-y-3\">\s*\{fb\.student_explanation.*?</div>\s*\);'
replaced = re.sub(old_fb_regex, new_feedback_block, content, flags=re.DOTALL)
open('frontend/src/components/defend/DefendStage.tsx', 'w', encoding='utf-8').write(replaced)
print('Done' if replaced != content else 'Not replaced')
