import React, { useState } from 'react';
import { Loader2, Shield, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  startDefendSession, 
  submitDefendAttempt,
  retryDefendAttemptFeedback, 
  completeDefendSession,
  skipDefendQuestion,
  DefendSession, 
} from '@/services/defend';
import { AnalysisStatusResponse } from '@/types/analysis';

interface DefendStageProps {
  projectId: string;
  analysisStatus: AnalysisStatusResponse | null;
  onAnalyze: () => void;
}

export const DefendStage: React.FC<DefendStageProps> = ({ projectId, analysisStatus, onAnalyze }) => {
  const [session, setSession] = useState<DefendSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAnalyzed = analysisStatus?.status === 'completed';
  const isStale = analysisStatus?.is_stale;

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await startDefendSession(projectId);
      setSession(res.session);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session || !answer.trim()) return;
    const currentQ = session.questions[currentQIndex];
    if (!currentQ) return;

    setIsSubmitting(true);
    try {
      const attempt = await submitDefendAttempt(projectId, currentQ.id, answer);
      // update local session state
      const newSession = { ...session };
      newSession.questions[currentQIndex].attempts.push(attempt);
      newSession.questions[currentQIndex].status = 'answered';
      setSession(newSession);
      setAnswer('');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishPractice = async () => {
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

  const handleSkip = async () => {
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

  const handleNext = () => {
    if (session && currentQIndex < session.questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="w-8 h-8 text-[var(--pd-ai)] animate-spin" />
        <p className="text-sm font-mono text-[var(--pd-text-muted)]">Preparing practice session...</p>
      </div>
    );
  }


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
            {(() => {
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
            })()}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Defend Practice</h2>
          <p className="text-sm text-[var(--pd-text-body)] mt-1">Practice explaining your project to an evaluator with real evidence.</p>
        </div>
        <div className="p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-center space-y-4 max-w-2xl mx-auto">
          <Shield className="w-12 h-12 text-[var(--pd-emerald)] mx-auto opacity-80" />
          {isAnalyzed ? (
            <>
              {isStale && (
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--pd-coral)] bg-red-50 p-2 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4" />
                  Your repository has changed since the last analysis. Practice will use older evidence.
                </div>
              )}
              <h3 className="text-xl font-display font-medium text-[var(--pd-text-primary)]">Ready to begin</h3>
              <p className="text-sm text-[var(--pd-text-muted)]">
                You will answer questions grounded in the actual findings and requirements from your project.
              </p>
              <div className="flex justify-center gap-3 pt-4">
                {isStale && (
                  <Button variant="outline" onClick={onAnalyze}>Analyze Latest Code</Button>
                )}
                <Button onClick={handleStart} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">
                  Start Practice
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-display font-medium text-[var(--pd-text-primary)]">Analysis Required</h3>
              <p className="text-sm text-[var(--pd-text-muted)]">
                Defend requires a completed analysis to build specific questions about your project.
              </p>
              <div className="pt-4">
                <Button onClick={onAnalyze} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">
                  Run Analysis
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  const question = session.questions[currentQIndex];
  const isAnswered = question?.status === 'answered' && question.attempts.length > 0;
  const latestAttempt = isAnswered ? question.attempts[question.attempts.length - 1] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Defend Session</h2>
          <p className="text-sm text-[var(--pd-text-body)] mt-1">
            Question {currentQIndex + 1} of {session.questions.length} 
                {session.questions[currentQIndex]?.status === 'skipped' && <span className="ml-2 text-[var(--pd-coral)] bg-[var(--pd-coral)]/10 px-2 py-0.5 rounded text-xs">Skipped</span>}
          </p>
        </div>
      </div>

      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--pd-text-muted)] tracking-wide uppercase">Question</p>
          <p className="text-lg text-[var(--pd-text-primary)] font-medium leading-relaxed">
            {question?.question_text}
          </p>
        </div>
        
                {question?.evidence_context && (
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
        )}

        {!isAnswered ? (
          <div className="space-y-4">
            <Textarea 
              placeholder="Explain the details from this evidence..." 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              className="min-h-[120px] bg-white border-[var(--pd-border)] resize-y"
              disabled={isSubmitting}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={handleSkip} 
                disabled={isSubmitting}
                className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] mr-2"
              >
                Skip Question
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !answer.trim()}
                className="bg-[var(--pd-emerald)] text-white hover:bg-[#0ea971]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Answer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--pd-text-muted)] tracking-wide uppercase">Your Answer</p>
              <div className="p-4 bg-white border border-[var(--pd-border)] rounded-xl text-sm text-[var(--pd-text-primary)] whitespace-pre-wrap">
                {latestAttempt?.student_answer}
              </div>
            </div>

            {latestAttempt?.ai_feedback ? (
              <div className="p-5 rounded-xl border bg-[var(--pd-surface-raised)] border-[var(--pd-border)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--pd-emerald)] mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-4">
                    <p className="text-sm font-semibold text-[var(--pd-text-primary)]">
                      Feedback
                    </p>
                    {(() => {
                      try {
                        const fb = JSON.parse(latestAttempt.ai_feedback);
                                                return (
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
                        );
                      } catch(e) {
                        return <p className="text-sm mt-1 text-[var(--pd-text-body)]">{latestAttempt.ai_feedback}</p>;
                      }
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl border bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-800">
                      Feedback Unavailable
                    </p>
                    <p className="text-sm mt-1 text-orange-700">
                      The AI evaluator is temporarily unavailable or timed out. Your answer was saved.
                    </p>
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={isSubmitting}
                        onClick={async () => {
                          if (!latestAttempt) return;
                          setIsSubmitting(true);
                          try {
                            const attempt = await retryDefendAttemptFeedback(projectId, latestAttempt.id);
                            const newSession = { ...session };
                            newSession.questions[currentQIndex].attempts[newSession.questions[currentQIndex].attempts.length - 1] = attempt;
                            setSession(newSession);
                          } catch (err: any) {
                            setError(err.message || 'Failed to retry feedback');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Retry Feedback Generation
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => {
                const newSession = { ...session };
                newSession.questions[currentQIndex].status = 'unanswered';
                setSession(newSession);
                setAnswer('');
              }} variant="outline" className="border-[var(--pd-border)]">
                Retry Question
              </Button>
              {currentQIndex < session.questions.length - 1 ? (
                <Button onClick={handleNext} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">
                  Next Question
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleFinishPractice} disabled={isSubmitting} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Finish Practice
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
