import React from 'react';
import { FileText, Github, Loader2, AlertCircle, CheckCircle2, ChevronRight, Check, X, ShieldAlert, FileSearch, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectDetail } from '@/types/project';
import { RepositoryConnection } from '@/types/repository';
import { AnalysisStatusResponse } from '@/types/analysis';

interface AnalyzeViewProps {
  project: ProjectDetail;
  repoConnection: RepositoryConnection | null;
  analysisStatus: AnalysisStatusResponse | null;
  setActiveSection: (section: string) => void;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  project,
  repoConnection,
  analysisStatus,
  setActiveSection,
}) => {
  const isRunning = analysisStatus?.status === 'running';
  const isCompleted = analysisStatus?.status === 'completed' || analysisStatus?.status === 'stale';
  const isStale = analysisStatus?.status === 'stale';
  
  // A missing analysis record -> pending/unavailable
  const isMissing = !analysisStatus || (analysisStatus.status !== 'running' && analysisStatus.status !== 'completed' && analysisStatus.status !== 'stale' && analysisStatus.status !== 'failed');

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-[var(--pd-mint)] shrink-0" />;
      case 'active': return <Loader2 className="w-5 h-5 text-[var(--pd-ai)] animate-spin shrink-0" />;
      case 'failed': return <X className="w-5 h-5 text-red-500 shrink-0" />;
      case 'unavailable': return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'skipped': return <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />;
    }
  };

  const getStageTextColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-[var(--pd-ai)] font-medium';
      case 'completed': return 'text-[var(--pd-text-primary)] font-medium';
      case 'failed': return 'text-red-700 font-medium';
      case 'unavailable': return 'text-amber-700 font-medium';
      default: return 'text-[var(--pd-text-muted)]';
    }
  };

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

        {/* Timeline Section */}
        <div className="p-6 bg-[var(--pd-surface-raised)]/50">
          {analysisStatus?.stages && analysisStatus.stages.length > 0 ? (
            <div className="space-y-6">
              {analysisStatus.stages.map((stage, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {getStageIcon(stage.status)}
                    {idx !== analysisStatus.stages.length - 1 && (
                      <div className={cn(
                        "w-px h-full mt-2 min-h-[40px]",
                        stage.status === 'completed' ? "bg-[var(--pd-mint)]/50" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                      <h4 className={cn("text-sm font-semibold", getStageTextColor(stage.status))}>
                        {stage.label}
                      </h4>
                      <span className="text-[10px] font-mono text-[var(--pd-text-muted)] uppercase tracking-wider hidden sm:inline">
                        {stage.stage}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--pd-text-body)] mt-1">{stage.description}</p>
                    
                    {/* Stage Detail / Outcome Summary */}
                    {stage.detail && (stage.status === 'completed' || stage.status === 'unavailable' || stage.status === 'failed') && (
                      <div className={cn(
                        "mt-2 text-xs p-2 rounded-lg border",
                        stage.status === 'completed' ? "bg-[var(--pd-surface)] border-[var(--pd-border)] text-[var(--pd-text-primary)]" :
                        stage.status === 'unavailable' ? "bg-amber-50 border-amber-100 text-amber-800" :
                        "bg-red-50 border-red-100 text-red-800"
                      )}>
                        {stage.detail}
                      </div>
                    )}
                  </div>
                </div>
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
          <div className="p-4 border-t border-[var(--pd-border)] bg-[var(--pd-surface)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-4 text-sm font-mono text-[var(--pd-text-muted)]">
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
