import React from 'react';
import { FileText, Github, Loader2, AlertCircle, CheckCircle2, ChevronRight, Check, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectDetail } from '@/types/project';
import { RepositoryConnection } from '@/types/repository';
import { AnalysisStatusResponse, AnalysisStageInfo } from '@/types/analysis';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogDescription,
} from '@/components/motion-primitives/morphing-dialog';

interface AnalyzeViewProps {
  project: ProjectDetail;
  repoConnection: RepositoryConnection | null;
  analysisStatus: AnalysisStatusResponse | null;
  setActiveSection: (section: string) => void;
}

const getStageWording = (stageCode: string, status: string, originalLabel: string) => {
  const mapping: Record<string, { completed: string, pending: string, running: string, failed: string }> = {
    'STAGE_DOCUMENTS': { completed: 'Documents reviewed', pending: 'Document review', running: 'Reviewing documents', failed: 'Document review failed' },
    'STAGE_UNDERSTANDING': { completed: 'Project summarized', pending: 'Project summary', running: 'Summarizing project', failed: 'Summary failed' },
    'STAGE_REQUIREMENTS': { completed: 'Claims extracted', pending: 'Claim extraction', running: 'Extracting claims', failed: 'Extraction failed' },
    'STAGE_REPOSITORY': { completed: 'Repository inspected', pending: 'Repository inspection', running: 'Inspecting repository', failed: 'Repository sync failed' },
    'STAGE_TRACEABILITY': { completed: 'Evidence traced', pending: 'Evidence tracing', running: 'Tracing evidence', failed: 'Tracing failed' },
    'STAGE_DIAGNOSIS': { completed: 'Diagnosis checked', pending: 'Diagnosis', running: 'Running diagnosis', failed: 'Diagnosis failed' },
    'STAGE_AI_REVIEW': { completed: 'AI review finished', pending: 'AI evaluation', running: 'Evaluating via AI', failed: 'AI review failed' },
  };

  const wording = mapping[stageCode];
  if (!wording) return originalLabel;
  if (status === 'completed' || status === 'stale') return wording.completed;
  if (status === 'active') return wording.running;
  if (status === 'failed') return wording.failed;
  if (status === 'unavailable' || status === 'skipped') return `AI review ${status}`
  return wording.pending;
};

const getStageIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-[var(--pd-mint)] shrink-0" />;
    case 'active': return <Loader2 className="w-4 h-4 text-[var(--pd-ai)] animate-spin shrink-0" />;
    case 'failed': return <X className="w-4 h-4 text-red-500 shrink-0" />;
    case 'unavailable': return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'skipped': return <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />;
    default: return <div className="w-3 h-3 m-0.5 rounded-full border-2 border-gray-300 shrink-0" />;
  }
};

const getStageTextColor = (status: string) => {
  switch (status) {
    case 'active': return 'text-[var(--pd-ai)] font-medium';
    case 'completed': return 'text-[var(--pd-text-primary)] font-medium';
    case 'failed': return 'text-red-700 font-medium';
    case 'unavailable': return 'text-amber-700 font-medium';
    case 'skipped': return 'text-gray-500 font-medium';
    default: return 'text-[var(--pd-text-muted)]';
  }
};

const StageRailItem = ({ stage }: { stage: AnalysisStageInfo }) => {
  const wording = getStageWording(stage.stage, stage.status, stage.label);
  
  return (
    <MorphingDialog transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
      <MorphingDialogTrigger className="flex flex-col text-left h-full w-[140px] sm:w-full sm:flex-1 shrink-0 bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-3 hover:border-[var(--pd-ai)]/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)] snap-start">
        <div className="flex items-center justify-between mb-2">
          {getStageIcon(stage.status)}
        </div>
        <h4 className={cn("text-xs font-semibold leading-snug mb-1", getStageTextColor(stage.status))}>
          {wording}
        </h4>
        <p className="text-[10px] text-[var(--pd-text-muted)] line-clamp-2 mt-auto pt-1 font-medium">
           {stage.status === 'completed' || stage.status === 'unavailable' || stage.status === 'failed' || stage.status === 'skipped' ? 'View details' : 'Pending'}
        </p>
      </MorphingDialogTrigger>
      
      <MorphingDialogContainer>
        <MorphingDialogContent className="pointer-events-auto w-full max-w-md rounded-2xl bg-[var(--pd-surface)] p-6 shadow-2xl border border-[var(--pd-border)] flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 pr-4">
              {getStageIcon(stage.status)}
              <MorphingDialogTitle className="text-lg font-semibold text-[var(--pd-text-primary)]">
                {wording}
              </MorphingDialogTitle>
            </div>
            <MorphingDialogClose className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] bg-[var(--pd-surface-raised)] hover:bg-[var(--pd-border-hover)] rounded-full p-2 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </MorphingDialogClose>
          </div>
          
          <MorphingDialogDescription className="text-sm text-[var(--pd-text-body)] mb-4">
            {stage.description}
          </MorphingDialogDescription>
          
          <div className="space-y-3 mt-2 bg-[var(--pd-surface-raised)] rounded-xl p-4 border border-[var(--pd-border)]">
            <div className="flex items-start gap-3 text-sm">
               <span className="font-mono text-[var(--pd-text-muted)] text-xs uppercase tracking-wider w-20 shrink-0">Status</span>
               <span className={cn("font-medium capitalize", getStageTextColor(stage.status))}>
                 {stage.status}
               </span>
            </div>
            {stage.detail && (stage.status === 'completed' || stage.status === 'unavailable' || stage.status === 'failed' || stage.status === 'skipped') && (
              <div className="flex items-start gap-3 text-sm border-t border-[var(--pd-border)] pt-3">
                 <span className="font-mono text-[var(--pd-text-muted)] text-xs uppercase tracking-wider w-20 shrink-0">Outcome</span>
                 <span className="text-[var(--pd-text-body)] font-medium">
                   {stage.detail}
                 </span>
              </div>
            )}
          </div>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
};

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  project,
  repoConnection,
  analysisStatus,
  setActiveSection,
}) => {
  const isRunning = analysisStatus?.status === 'running';
  const isCompleted = analysisStatus?.status === 'completed' || analysisStatus?.status === 'stale';
  const isStale = analysisStatus?.status === 'stale';
  
  const isMissing = !analysisStatus || (!isRunning && !isCompleted && analysisStatus.status !== 'failed');

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Control Room: {project.title}</h2>
        <p className="text-sm text-[var(--pd-text-body)]">
          Project Doctor compares your specification documents with the repository code to find what is implemented, what is missing, and what needs attention.
        </p>
      </div>

      {/* Analysis Inputs Panel */}
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 shadow-pd-card space-y-4">
        <h3 className="text-sm font-semibold text-[var(--pd-text-primary)] uppercase tracking-wider font-mono">
          Included in Analysis
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(project.artifacts || []).map((artifact) => (
            <div key={artifact.id} className="bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl p-4 flex items-start gap-3">
              <FileText className="w-4 h-4 text-[var(--pd-text-muted)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--pd-text-primary)] truncate">{artifact.original_filename}</p>
                <p className="text-xs text-[var(--pd-text-muted)]">Specification Document</p>
              </div>
            </div>
          ))}
          {repoConnection && (
            <div className="bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl p-4 flex items-start gap-3">
              <Github className="w-4 h-4 text-[var(--pd-text-muted)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--pd-text-primary)] truncate">{repoConnection.owner}/{repoConnection.repo_name}</p>
                <p className="text-xs text-[var(--pd-text-muted)]">
                  {repoConnection.current_snapshot ? `${repoConnection.current_snapshot.total_files} files` : 'GitHub Repository'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Status & Pipeline Panel */}
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl shadow-pd-card overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-[var(--pd-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--pd-surface)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--pd-text-primary)] uppercase tracking-wider font-mono">
              Pipeline Execution State
            </h3>
            {analysisStatus?.analyzed_at && (
              <p className="text-xs text-[var(--pd-text-muted)] mt-1">
                Last analyzed: {new Date(analysisStatus.analyzed_at + 'Z').toLocaleString()}
              </p>
            )}
          </div>
          
          {isRunning && (
            <span className="flex items-center gap-2 text-xs font-mono font-medium text-[var(--pd-ai)] bg-[var(--pd-ai)]/10 px-3 py-1.5 rounded-full border border-[var(--pd-ai)]/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analysis Active
            </span>
          )}
          {isCompleted && (
            <span className={cn(
              "flex items-center gap-2 text-xs font-mono font-medium px-3 py-1.5 rounded-full",
              isStale 
                ? "text-amber-700 bg-amber-50 border border-amber-200"
                : "text-[var(--pd-mint)] bg-[var(--pd-mint-wash)] border border-[var(--pd-mint)]/20"
            )}>
              {isStale ? (
                <><AlertCircle className="w-3.5 h-3.5" /> Results Stale (Re-analyze needed)</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Up to Date</>
              )}
            </span>
          )}
          {analysisStatus?.status === 'failed' && (
            <span className="flex items-center gap-2 text-xs font-mono font-medium text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> Analysis Failed
            </span>
          )}
          {isMissing && (
            <span className="flex items-center gap-2 text-xs font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
              <Loader2 className="w-3.5 h-3.5" /> Pending First Run
            </span>
          )}
        </div>

        {/* Timeline Section (Horizontal Rail) */}
        <div className="p-4 sm:p-6 bg-[var(--pd-surface-raised)]/30 border-b border-[var(--pd-border)]">
          {analysisStatus?.stages && analysisStatus.stages.length > 0 ? (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {analysisStatus.stages.map((stage, idx) => (
                <StageRailItem key={idx} stage={stage} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-[var(--pd-text-muted)]">
              {isMissing ? (
                "The first evaluation run starts automatically after you set up the project. Please wait or check the backend process."
              ) : (
                "No pipeline stages available."
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isCompleted && (
          <div className="p-4 bg-[var(--pd-surface)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-[var(--pd-text-muted)]">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[var(--pd-mint)]" />
                <span className="font-semibold text-[var(--pd-text-primary)]">{analysisStatus.strengths_count || 0}</span> Strengths
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[var(--pd-amber)]" />
                <span className="font-semibold text-[var(--pd-text-primary)]">{analysisStatus.needs_attention_count || 0}</span> Needs Attention
              </div>
              {analysisStatus.critical_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-red-600">{analysisStatus.critical_count}</span> Critical
                </div>
              )}
            </div>
            
            <button
              onClick={() => setActiveSection('diagnosis')}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)] w-full sm:w-auto justify-center"
            >
              View Diagnosis Results &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
