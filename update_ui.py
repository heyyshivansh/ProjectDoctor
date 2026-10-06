import re

content = open('frontend/src/components/defend/DefendStage.tsx', encoding='utf-8').read()

import_pattern = r'  completeDefendSession,\n  DefendSession,'
new_imports = '  completeDefendSession,\n  skipDefendQuestion,\n  DefendSession,'
if 'skipDefendQuestion,' not in content:
    content = content.replace(import_pattern, new_imports)

skip_func = """  const handleSkip = async () => {
    if (!session) return;
    const currentQ = session.questions[currentQIndex];
    if (!currentQ) return;
    
    setIsSubmitting(true);
    try {
      await skipDefendQuestion(projectId, currentQ.id);
      const newSession = { ...session };
      newSession.questions[currentQIndex].status = 'skipped';
      setSession(newSession);
      
      if (currentQIndex < session.questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setAnswer('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to skip question');
    } finally {
      setIsSubmitting(false);
    }
  };
"""

if 'const handleSkip' not in content:
    content = content.replace('  const handleNext = () => {', skip_func + '\n  const handleNext = () => {')

skip_btn = """              <Button 
                variant="outline" 
                onClick={handleSkip} 
                disabled={isSubmitting}
                className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] mr-2"
              >
                Skip Question
              </Button>
              <Button 
                onClick={handleSubmit} """

if 'Skip Question' not in content:
    content = content.replace('              <Button \n                onClick={handleSubmit} ', skip_btn)

recap_pattern = re.compile(r'<div className="bg-white p-5 rounded-xl border border-\[var\(--pd-border\)\] text-sm text-\[var\(--pd-text-primary\)\] leading-relaxed whitespace-pre-wrap shadow-sm">\s*\{session.session_recap \|\| "No recap generated."\}\s*</div>')

recap_ui = """{(() => {
              if (!session.session_recap) return <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] text-sm shadow-sm">No recap generated.</div>;
              try {
                const recap = JSON.parse(session.session_recap);
                if (recap.project_understanding) {
                  return (
                    <div className="space-y-4">
                      <div className="flex gap-4 items-center">
                        <div className="px-3 py-1 bg-[var(--pd-emerald)]/10 text-[var(--pd-emerald)] text-sm rounded font-medium">Answered: {recap.answered_count}</div>
                        <div className="px-3 py-1 bg-[var(--pd-coral)]/10 text-[var(--pd-coral)] text-sm rounded font-medium">Skipped: {recap.skipped_count}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] shadow-sm space-y-2">
                          <h4 className="font-semibold text-[var(--pd-text-primary)] text-sm">Project Understanding</h4>
                          <p className="text-sm text-[var(--pd-text-body)]">{recap.project_understanding}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] shadow-sm space-y-2">
                          <h4 className="font-semibold text-[var(--pd-text-primary)] text-sm">Flow Explanation</h4>
                          <p className="text-sm text-[var(--pd-text-body)]">{recap.flow_description}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] shadow-sm space-y-2">
                          <h4 className="font-semibold text-[var(--pd-text-primary)] text-sm">Technical Clarity</h4>
                          <p className="text-sm text-[var(--pd-text-body)]">{recap.technical_clarity}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] shadow-sm space-y-2">
                          <h4 className="font-semibold text-[var(--pd-text-primary)] text-sm">Relevant Specifics</h4>
                          <p className="text-sm text-[var(--pd-text-body)]">{recap.relevant_specifics}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] shadow-sm space-y-2 md:col-span-2">
                          <h4 className="font-semibold text-[var(--pd-text-primary)] text-sm">Evidence Support</h4>
                          <p className="text-sm text-[var(--pd-text-body)]">{recap.evidence_support}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-[var(--pd-emerald)]/30 bg-[var(--pd-emerald)]/5 shadow-sm space-y-2 md:col-span-2">
                          <h4 className="font-semibold text-[var(--pd-emerald)] text-sm">Useful Next Steps</h4>
                          <p className="text-sm text-[var(--pd-text-primary)]">{recap.next_step}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                // Ignore parse err
              }
              return (
                <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] text-sm text-[var(--pd-text-primary)] leading-relaxed whitespace-pre-wrap shadow-sm">
                  {session.session_recap}
                </div>
              );
            })()}"""

content = recap_pattern.sub(recap_ui, content)

progress_pattern = re.compile(r'Question \{currentQIndex \+ 1\} of \{session\.questions\.length\}')
progress_ui = """Question {currentQIndex + 1} of {session.questions.length} 
                {session.questions[currentQIndex]?.status === 'skipped' && <span className="ml-2 text-[var(--pd-coral)] bg-[var(--pd-coral)]/10 px-2 py-0.5 rounded text-xs">Skipped</span>}"""
content = progress_pattern.sub(progress_ui, content)

open('frontend/src/components/defend/DefendStage.tsx', 'w', encoding='utf-8').write(content)
