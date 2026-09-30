import { ArrowLeft, RefreshCw, PlayCircle } from 'lucide-react';
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

export function ReviewDeskHeader({
  projectTitle,
  diagnosisStatus: _diagnosisStatus,
  analysisStatus,
  isAnalyzing,
  onAnalyze,
}: ReviewDeskHeaderProps) {
  const isStale = analysisStatus?.is_stale;
  const isRunning = isAnalyzing || analysisStatus?.status === 'running';

  const buttonLabel = isRunning
    ? 'Evaluating…'
    : 'Re-analyze';

  return (
    <header className="sticky top-0 z-30 bg-[var(--pd-surface)]/95 backdrop-blur-xl border-b border-[var(--pd-border)]">
      {/* Top scroll progress bar */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--pd-border)]">
        <ScrollProgress className="bg-[var(--pd-ai)]" />
      </div>

      {/* Aligned to the same content grid as the page */}
      <div className="w-full max-w-[1520px] mx-auto px-6 sm:px-12 lg:px-16 h-16 flex items-center justify-between">
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
          <h1 className="font-sans font-semibold text-sm text-[var(--pd-text-primary)] truncate max-w-[200px] sm:max-w-xs lg:max-w-md">
            {projectTitle}
          </h1>
        </div>

        {/* Right: Re-analyze action */}
        {onAnalyze && (
          <div className="flex items-center gap-3 shrink-0">
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
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-border-focus)] shadow-sm active:scale-95',
                isRunning
                  ? 'bg-[var(--pd-ai-wash)] text-[var(--pd-ai)] border border-[var(--pd-border)] cursor-wait'
                  : 'bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] border border-transparent'
              )}
            >
              {isRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlayCircle className="w-3.5 h-3.5" />
              )}
              <span>{buttonLabel}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
