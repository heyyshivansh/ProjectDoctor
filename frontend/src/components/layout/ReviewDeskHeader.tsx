import { ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosisStatus } from '@/types/diagnosis';

interface ReviewDeskHeaderProps {
  projectTitle: string;
  diagnosisStatus?: DiagnosisStatus | string;
  isReevaluating?: boolean;
  onReevaluate?: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'understand', label: 'Understand' },
  { id: 'diagnosis', label: 'Diagnosis' },
];

export function ReviewDeskHeader({
  projectTitle,
  diagnosisStatus: _diagnosisStatus,
  isReevaluating,
  onReevaluate,
  activeSection,
  onNavigate
}: ReviewDeskHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[var(--pd-canvas)]/80 backdrop-blur-xl border-b border-[var(--pd-border)]">
      <div className="max-w-[1520px] w-full mx-auto px-6 sm:px-12 lg:px-16 h-full flex items-center justify-between">
        {/* Left: Back + Project Name */}
        <div className="flex items-center h-full gap-4 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)] rounded"
            aria-label="Back to Projects"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </a>
          <div className="w-px h-4 bg-[var(--pd-border)]" />
          <h1 className="font-sans font-semibold text-sm text-[var(--pd-text-primary)] truncate max-w-xs">
            {projectTitle}
          </h1>
        </div>

        {/* Center/Right: Navigation Tabs */}
        <nav
          aria-label="Project navigation"
          className="flex items-center gap-1.5 h-full ml-4"
        >
          {TABS.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "relative flex items-center h-8 px-4 text-xs font-mono uppercase tracking-wider rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]",
                  isActive
                    ? "bg-[var(--pd-ai)]/15 text-violet-300 border border-violet-500/30 font-semibold"
                    : "text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)]"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Far Right: Re-evaluate */}
        {onReevaluate && (
          <div className="flex items-center ml-4 pl-4 border-l border-[var(--pd-border)] shrink-0">
            <button
              onClick={onReevaluate}
              disabled={isReevaluating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] hover:border-[var(--pd-border-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)]"
              title="Re-evaluate project"
              aria-label="Re-evaluate project"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isReevaluating && "animate-spin text-[var(--pd-ai)]")} />
              <span>Re-evaluate</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
