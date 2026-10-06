import re
content = open('frontend/src/components/defend/DefendStage.tsx', encoding='utf-8').read()
new_evidence_block = '''        {question?.evidence_context && (
          <details className="p-4 bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl group cursor-pointer">
            <summary className="text-xs font-semibold text-[var(--pd-text-muted)] uppercase tracking-wide list-none flex items-center justify-between">
              <span>View evidence</span>
              <span className="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-3 space-y-1 cursor-auto">
            {(() => {
              try {
                const ctx = JSON.parse(question.evidence_context);
                
                if (ctx.type === 'finding') {
                  const hasRefs = ctx.evidence_references && ctx.evidence_references.length > 0;
                  if (!hasRefs) {
                    return <p className="text-sm text-[var(--pd-text-muted)] italic">No concrete evidence available.</p>;
                  }
                  return (
                    <ul className="list-disc pl-4 space-y-1">
                      {ctx.evidence_references.map((ref: any, i: number) => (
                        <li key={i} className="text-sm font-mono text-[var(--pd-ai)]">
                          {ref.file || ref.target_type || 'Evidence item'}
                        </li>
                      ))}
                    </ul>
                  );
                } else if (ctx.type === 'requirement_trace') {
                  const hasLinks = ctx.links && ctx.links.length > 0;
                  if (!hasLinks) {
                    return <p className="text-sm text-[var(--pd-text-muted)] italic">No concrete evidence available.</p>;
                  }
                  return (
                    <div className="space-y-3">
                      {ctx.links.map((link: any, i: number) => (
                        <div key={i} className="text-sm border-l-2 border-[var(--pd-border)] pl-3 py-0.5 space-y-1">
                          <p className="font-mono text-[var(--pd-ai)]">{link.file_path || 'Unknown file'}</p>
                          {link.is_test_evidence && <p className="text-[var(--pd-emerald)] font-medium text-xs">Test Evidence</p>}
                          {link.code_snippet && (
                            <pre className="bg-[var(--pd-surface)] p-2 rounded text-[10px] overflow-x-auto text-[var(--pd-text-body)] mt-1 border border-[var(--pd-border)]">
                              {link.code_snippet}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
                
                return <p className="text-sm text-[var(--pd-text-muted)] italic">No concrete evidence available.</p>;
              } catch (e) {
                return <p className="text-sm text-[var(--pd-text-muted)] italic">No concrete evidence available.</p>;
              }
            })()}
            </div>
          </details>
        )}'''

old_evidence_block_regex = r'\{question\?\.evidence_context && \(\s*<div className="p-4 bg-\[var\(--pd-surface-raised\)\].*?\}\)\(\)\}\s*<\/div>\s*\)\}'
replaced = re.sub(old_evidence_block_regex, new_evidence_block, content, flags=re.DOTALL)
open('frontend/src/components/defend/DefendStage.tsx', 'w', encoding='utf-8').write(replaced)
print('Done' if replaced != content else 'Not replaced')
