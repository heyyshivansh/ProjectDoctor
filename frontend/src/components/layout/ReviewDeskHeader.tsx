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
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'codebase', label: 'Codebase' },
  { id: 'documents', label: 'Documents' },
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-[var(--pd-canvas)]/90 backdrop-blur-md border-b border-[var(--pd-hairline)]">
      {/* Left: Branding & Nav */}
      <div className="flex items-center h-full gap-4 shrink-0">
        <a 
          href="/" 
          className="flex items-center gap-2 text-sm text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-accent)] rounded-sm"
          aria-label="Back to Projects"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Projects</span>
        </a>
        <div className="w-px h-5 bg-[var(--pd-hairline)]" />
        <h1 className="font-display font-semibold text-[var(--pd-text-primary)] truncate max-w-[150px] sm:max-w-xs">
          {projectTitle}
        </h1>
      </div>

      {/* Center/Right: Tabs */}
      <nav 
        aria-label="Project navigation" 
        className="flex items-center gap-1 sm:gap-6 h-full ml-4 overflow-x-auto no-scrollbar mask-linear-fade"
      >
        {TABS.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "relative flex items-center h-full px-3 sm:px-1 whitespace-nowrap text-xs font-mono uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-accent)] rounded-sm",
                isActive 
                  ? "text-[var(--pd-text-primary)] font-semibold" 
                  : "text-[var(--pd-text-muted)] hover:text-[var(--pd-text-body)]"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--pd-accent)] rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Far Right: Actions */}
      {onReevaluate && (
        <div className="flex items-center ml-4 pl-4 border-l border-[var(--pd-hairline)] shrink-0">
          <button
            onClick={onReevaluate}
            disabled={isReevaluating}
            className="flex items-center justify-center p-2 rounded-md text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent)]"
            title="Re-evaluate project"
            aria-label="Re-evaluate project"
          >
            <RefreshCw className={cn("w-4 h-4", isReevaluating && "animate-spin")} />
          </button>
        </div>
      )}
    </header>
  );
}
