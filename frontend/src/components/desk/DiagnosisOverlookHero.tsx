import { motion } from 'motion/react';
import { FileText, Github } from 'lucide-react';
import { ProjectDetail } from '@/types/project';
import { ProjectDiagnosis, DiagnosisStatus } from '@/types/diagnosis';
import { cn } from '@/lib/utils';

interface DiagnosisOverlookHeroProps {
  project: ProjectDetail;
  diagnosis: ProjectDiagnosis | null;
}

const statusConfig: Record<DiagnosisStatus, { color: string; label: string }> = {
  looks_solid: { color: 'bg-[#10B981]', label: 'Looks solid' },
  needs_attention: { color: 'bg-[#F59E0B]', label: 'Needs attention' },
  significant_concern: { color: 'bg-[#F43F5E]', label: 'Significant concern' },
  not_enough_evidence_yet: { color: 'bg-[#64748B]', label: 'Not enough evidence yet' },
  not_analyzed: { color: 'bg-[#64748B]', label: 'Not analyzed' },
};

export function DiagnosisOverlookHero({ project, diagnosis }: DiagnosisOverlookHeroProps) {
  const summaryText = diagnosis?.summary || project.problem_statement;
  const status = diagnosis?.status || 'not_analyzed';
  const { color, label } = statusConfig[status];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-[var(--pd-surface)] border border-[var(--pd-hairline)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6"
    >
      <div className="flex-1 space-y-4">
        <h1 className="font-display text-3xl sm:text-5xl text-[var(--pd-text-primary)] font-medium leading-tight">
          {project.title}
        </h1>
        {summaryText && (
          <p className="font-sans text-[var(--pd-text-body)] text-lg line-clamp-2 max-w-3xl leading-relaxed">
            {summaryText}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {project.artifacts && project.artifacts.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-sm text-[var(--pd-text-muted)] font-mono">
              <FileText className="w-4 h-4" />
              <span>{project.artifacts.length} artifacts</span>
            </div>
          )}
          {project.github_repo_url && (
            <a 
              href={project.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-sm text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors font-mono"
            >
              <Github className="w-4 h-4" />
              <span>Repository</span>
            </a>
          )}
        </div>
      </div>
      
      <div className="flex-shrink-0 flex items-center gap-3 bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] rounded-full px-4 py-2">
        <div className="relative flex items-center justify-center w-3 h-3">
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', color)} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', color)} />
        </div>
        <span className="font-mono text-sm text-[var(--pd-text-primary)] font-medium tracking-wide">
          {diagnosis?.status_label || label}
        </span>
      </div>
    </motion.div>
  );
}
