import re
content = open('frontend/src/components/defend/DefendStage.tsx', encoding='utf-8').read()

new_ui_imports = """import { startDefendSession, getDefendSession, submitDefendAttempt, retryDefendAttemptFeedback, completeDefendSession } from '../../services/defend';
"""
content = re.sub(r'import \{ startDefendSession, getDefendSession, submitDefendAttempt, retryDefendAttemptFeedback \} from \'\.\.\/\.\.\/services\/defend\';', new_ui_imports, content)


new_complete_handler = """  const handleFinishPractice = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const resp = await completeDefendSession(projectId, session.id);
      setSession(resp);
    } catch (err: any) {
      setError(err.message || 'Failed to finish session');
    } finally {
      setIsSubmitting(false);
    }
  };
"""
# insert before handleNext
content = re.sub(r'  const handleNext = \(\) => \{', new_complete_handler + '\n  const handleNext = () => {', content)


new_recap_view = """
  if (session && session.status === 'completed') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[var(--pd-border)] shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-[var(--pd-text-primary)]">Practice Session Complete</h2>
            <p className="text-sm text-[var(--pd-text-body)] mt-1">Review your overall performance and next steps.</p>
          </div>
          <Button onClick={() => setSession(null)} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">
            Close Session
          </Button>
        </div>
        
        <div className="bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--pd-text-muted)] tracking-wide uppercase">End of Session Recap</p>
            <div className="bg-white p-5 rounded-xl border border-[var(--pd-border)] text-sm text-[var(--pd-text-primary)] leading-relaxed whitespace-pre-wrap shadow-sm">
              {session.session_recap || "No recap generated."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {"""
content = re.sub(r'  if \(\!session\) \{', new_recap_view, content)

new_finish_button = """              ) : (
                <Button onClick={handleFinishPractice} disabled={isSubmitting} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Finish Practice
                </Button>
              )}"""
content = re.sub(r'              \) \: \(\s*<Button onClick=\{\(\) => setSession\(null\)\} className=\"bg-\[var\(--pd-ai\)] text-white hover:bg-\[var\(--pd-ai-hover\)]\">\s*Finish Practice\s*</Button>\s*\)\}', new_finish_button, content)

open('frontend/src/components/defend/DefendStage.tsx', 'w', encoding='utf-8').write(content)
