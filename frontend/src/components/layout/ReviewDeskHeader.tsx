import { ArrowLeft, RefreshCw, Sparkles, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosisStatus } from '@/types/diagnosis';
import { AnalysisStatusResponse } from '@/types/analysis';
import { ScrollProgress } from '@/components/core/scroll-progress';

interface ReviewDeskHeaderProps {
  projectTitle: string;
  diagnosisStatus?: DiagnosisStatus | string;
  analysisStatus?: AnalysisStatusResponse | null;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'understand', label: 'Understand' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'improve', label: 'Improve' },
  { id: 'defend', label: 'Defend' },
  { id: 'readiness', label: 'Readiness' },
];

export function ReviewDeskHeader({
  projectTitle,
  diagnosisStatus: _diagnosisStatus,
  analysisStatus,
  isAnalyzing,
  onAnalyze,
  activeSection,
  onNavigate,
}: ReviewDeskHeaderProps) {
  const isStale = analysisStatus?.is_stale;
  const isRunning = isAnalyzing || analysisStatus?.status === 'running';
  const isNotStarted = analysisStatus?.status === 'not_started';

  const buttonLabel = isRunning
    ? 'Evaluating…'
    : isNotStarted
    ? 'Analyze Project'
    : 'Re-analyze';

  return (
    <header className="sticky top-0 z-30 bg-[var(--pd-surface)]/95 backdrop-blur-xl border-b border-[var(--pd-border)]">
      {/* Top scroll progress bar */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--pd-border)]">
        <ScrollProgress className="bg-[var(--pd-ai)]" />
      </div>

      <div className="max-w-[1520px] w-full mx-auto px-4 sm:px-8 lg:px-12 h-14 flex items-center gap-3">
        {/* Left: Back + Project Name */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-border-focus)] rounded"
            aria-label="Back to Projects"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </a>
          <div className="w-px h-4 bg-[var(--pd-border)]" />
          <h1 className="font-sans font-semibold text-sm text-[var(--pd-text-primary)] truncate max-w-[120px] sm:max-w-[200px] lg:max-w-xs">
            {projectTitle}
          </h1>
        </div>

        {/* Center: Navigation tabs — horizontally scrollable */}
        <nav
          aria-label="Project navigation"
          className="flex-1 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex items-center gap-0.5 min-w-max">
            {TABS.map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center h-7 px-3 text-xs font-medium rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-border-focus)] whitespace-nowrap',
                    isActive
                      ? 'bg-[var(--pd-ai)] text-white shadow-sm'
                      : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-ai-wash)]'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Stale badge + Analyze button */}
        {onAnalyze && (
          <div className="flex items-center gap-2 shrink-0">
            {isStale && !isRunning && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/30 text-[var(--pd-amber)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--pd-amber)] animate-pulse" />
                Stale
              </span>
            )}
            <button
              onClick={onAnalyze}
              disabled={isRunning}
              aria-label={buttonLabel}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-border-focus)]',
                isNotStarted
                  ? 'bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] shadow-sm'
                  : isRunning
                  ? 'bg-[var(--pd-ai-wash)] text-[var(--pd-ai)] border border-[var(--pd-border)]'
                  : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] hover:border-[var(--pd-border-hover)]'
              )}
            >
              {isRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isNotStarted ? (
                <PlayCircle className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{buttonLabel}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
