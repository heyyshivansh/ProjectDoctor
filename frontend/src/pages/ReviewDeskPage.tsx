import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AnalyzeView } from '@/components/analyze/AnalyzeView';
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getProject } from "@/services/projects";
import {
  getProjectDiagnosis,
  getFindingDetail,
} from "@/services/diagnosis";
import { ProjectDetail, Artifact } from "@/types/project";
import { DocumentExtraction } from "@/types/document";
import {
  ProjectDiagnosis,
  FindingSummary,
  FindingDetail,
  FindingSeverity,
} from "@/types/diagnosis";

// Review Desk Core Components
import { ReviewDeskHeader } from "@/components/layout/ReviewDeskHeader";
import { ReviewDeskLayout } from "@/components/layout/ReviewDeskLayout";
import { DiagnosisTriageHeader } from "@/components/desk/DiagnosisTriageHeader";
import { KeyFindingPager } from "@/components/desk/KeyFindingPager";
import { VerifiedStrengthsShowcase } from "@/components/desk/VerifiedStrengthsShowcase";

import { ProjectOverviewView } from "@/components/overview/ProjectOverviewView";
import { ProjectUnderstandView } from "@/components/understanding/ProjectUnderstandView";
import { ExtractedTextViewerModal } from "@/components/documents/ExtractedTextViewerModal";
import { ImprovementStage } from "@/components/improve/ImprovementStage";

import { getRepository } from "@/services/repository";
import {
  getProjectUnderstanding,
  generateProjectUnderstanding,
  getArtifactExtraction,
} from "@/services/documents";
import {
  getProjectAnalysisStatus,
  triggerProjectAnalysis,
} from "@/services/analysis";
import { RepositoryConnection } from "@/types/repository";
import { ProjectUnderstanding } from "@/types/understanding";
import { AnalysisStatusResponse } from "@/types/analysis";
import { AnalysisWorkspaceModal } from "@/components/analysis/AnalysisWorkspaceModal";

import { Loader2, AlertCircle, CheckCircle2, FileText, Github, Sparkles, LayoutDashboard, BrainCircuit, Activity, Stethoscope, TrendingUp, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/core/dock";
import { cn } from "@/lib/utils";

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  critical: 1,
  major: 2,
  needs_attention: 3,
  improvement: 4,
  strength: 5,
};

export const ReviewDeskPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary State
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [diagnosis, setDiagnosis] = useState<ProjectDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Feature 2: Analysis Orchestration State
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatusResponse | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(
    searchParams.get("analysis") === "true"
  );
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);

  // Active navigation tab: "overview" | "understand" | "diagnosis"
  const activeSection = searchParams.get("tab") || "overview";
  const setActiveSection = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // Findings state
  const [activeFindingIndex, setActiveFindingIndex] = useState<number>(0);
  const [findingDetail, setFindingDetail] = useState<FindingDetail | null>(null);

    
  // Understanding & Repository State
  const [understanding, setUnderstanding] = useState<ProjectUnderstanding | null>(null);
  const [isGeneratingUnderstanding, setIsGeneratingUnderstanding] = useState(false);
  const [understandingError, setUnderstandingError] = useState<string | null>(null);
  const [repoConnection, setRepoConnection] = useState<RepositoryConnection | null>(null);

  // Document Text Viewer Modal State
  const [viewingArtifactModal, setViewingArtifactModal] = useState<{
    artifact: Artifact;
    extraction: DocumentExtraction;
  } | null>(null);

  const handleInspectArtifact = async (artifactId: string) => {
    if (!projectId || !project) return;
    const art = project.artifacts?.find((a) => a.id === artifactId) || ({
      id: artifactId,
      project_id: projectId,
      stored_filename: artifactId,
      original_filename: "Specification Document",
      file_type: "document",
      mime_type: "application/pdf",
      file_size_bytes: 0,
      status: "uploaded",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Artifact);

    try {
      const extraction = await getArtifactExtraction(projectId, artifactId);
      setViewingArtifactModal({ artifact: art, extraction });
    } catch (err) {
      console.error("Failed to load artifact extraction:", err);
    }
  };

  // Initial Load: Project, Diagnosis, Repository & Understanding in parallel (strictly read-only)
  const loadDeskData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const proj = await getProject(projectId);
      setProject(proj);

      await Promise.allSettled([
        getProjectDiagnosis(projectId)
          .then(setDiagnosis)
          .catch(() => setDiagnosis(null)),
        getRepository(projectId)
          .then(setRepoConnection)
          .catch(() => setRepoConnection(null)),
        getProjectUnderstanding(projectId)
          .then(setUnderstanding)
          .catch(() => setUnderstanding(null)),
      ]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDeskData();
  }, [loadDeskData]);

  // Explicit action: Generate or refresh project understanding
  const handleGenerateUnderstanding = async () => {
    if (!projectId) return;
    setIsGeneratingUnderstanding(true);
    setUnderstandingError(null);
    try {
      const res = await generateProjectUnderstanding(projectId);
      setUnderstanding(res);
    } catch (err) {
      setUnderstandingError(
        err instanceof Error ? err.message : "Failed to generate project understanding"
      );
    } finally {
      setIsGeneratingUnderstanding(false);
    }
  };

  // Sort findings by severity
  const sortedFindings = useMemo<FindingSummary[]>(() => {
    if (!diagnosis) return [];
    const combined = [...(diagnosis.top_findings || [])];
    return combined.sort((a, b) => {
      const weightA = SEVERITY_WEIGHT[a.severity] || 99;
      const weightB = SEVERITY_WEIGHT[b.severity] || 99;
      return weightA - weightB;
    });
  }, [diagnosis]);

  // Active finding
  const activeFinding = sortedFindings[activeFindingIndex] || null;

  // Hydrate active finding detail
  useEffect(() => {
    if (!projectId || !activeFinding) {
      setFindingDetail(null);
      return;
    }

    let isCurrent = true;
    getFindingDetail(projectId, activeFinding.id)
      .then((detail) => {
        if (isCurrent) setFindingDetail(detail);
      })
      .catch(() => {
        if (isCurrent) setFindingDetail(null);
      });

    return () => {
      isCurrent = false;
    };
  }, [projectId, activeFinding]);

  // Analysis status refresh and polling
  const refreshAnalysisStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const status = await getProjectAnalysisStatus(projectId);
      setAnalysisStatus(status);
    } catch {
      setAnalysisStatus(null);
    }
  }, [projectId]);

  useEffect(() => {
    refreshAnalysisStatus();
  }, [refreshAnalysisStatus]);

  // Active polling when analysis is running
  useEffect(() => {
    if (!projectId) return;
    if (analysisStatus?.status !== "running") return;

    const interval = setInterval(async () => {
      try {
        const latest = await getProjectAnalysisStatus(projectId);
        setAnalysisStatus(latest);
        if (latest.status === "completed") {
          const [diagResult, undResult] = await Promise.allSettled([
            getProjectDiagnosis(projectId),
            getProjectUnderstanding(projectId),
          ]);
          if (diagResult.status === "fulfilled") setDiagnosis(diagResult.value);
          if (undResult.status === "fulfilled") setUnderstanding(undResult.value);
        }
      } catch (err) {
        console.error("Failed to poll analysis status", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [projectId, analysisStatus?.status]);

  // Action: Trigger full 7-stage project evaluation
  const handleStartAnalysis = async (force: boolean = false) => {
    if (!projectId) return;
    setIsAnalysisModalOpen(true);
    setIsStartingAnalysis(true);
    try {
      const initial = await triggerProjectAnalysis(projectId, force);
      setAnalysisStatus(initial);
    } catch (err) {
      console.error("Failed to trigger project analysis", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start project evaluation.";

      const isPreflight =
        errorMessage.toLowerCase().includes("repository") ||
        errorMessage.toLowerCase().includes("documentation") ||
        errorMessage.toLowerCase().includes("prerequisite");

      setAnalysisStatus((prev) => ({
        project_id: projectId,
        project_title: project?.title || "your project",
        status: isPreflight ? "insufficient_evidence" : "failed",
        current_stage: null,
        current_stage_label: null,
        stages: prev?.stages || [],
        is_stale: false,
        stale_reason: null,
        critical_count: prev?.critical_count || 0,
        needs_attention_count: prev?.needs_attention_count || 0,
        strengths_count: prev?.strengths_count || 0,
        analyzed_at: prev?.analyzed_at || null,
        commit_sha: prev?.commit_sha || null,
        message: errorMessage,
        ai_status: prev?.ai_status || null,
      }));
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const handleReviewFindings = () => {
    setIsAnalysisModalOpen(false);
    setActiveSection("diagnosis");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-[var(--pd-canvas)]">
        <Loader2 className="w-8 h-8 text-[var(--pd-ai)] animate-spin" />
        <p className="text-sm font-mono text-[var(--pd-text-muted)]">Opening Technical Review Desk...</p>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-center space-y-4 text-[var(--pd-text-primary)]">
        <AlertCircle className="w-10 h-10 text-[var(--pd-coral)] mx-auto" />
        <h2 className="text-lg font-display font-semibold">Unable to load project</h2>
        <p className="text-sm font-sans text-[var(--pd-text-muted)]">{loadError || "Project was not found"}</p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/">
            <Button variant="outline" size="sm" className="bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-overlay)]">Back to Projects</Button>
          </Link>
          <Button size="sm" onClick={loadDeskData} className="bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)]">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <ReviewDeskLayout>
      <ReviewDeskHeader
        projectTitle={project.title}
        diagnosisStatus={diagnosis?.status}
        analysisStatus={analysisStatus}
        isAnalyzing={analysisStatus?.status === "running" || isStartingAnalysis}
        onAnalyze={() => handleStartAnalysis(analysisStatus?.is_stale || false)}
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />

      <div className="w-full max-w-[1520px] mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 space-y-10">
        {/* VIEW 1: OVERVIEW */}
        {activeSection === "overview" && (
          <ProjectOverviewView
            project={project}
            repoConnection={repoConnection}
            understanding={understanding}
            diagnosis={diagnosis}
            analysisStatus={analysisStatus}
            onOpenAnalysis={() => handleStartAnalysis(analysisStatus?.is_stale || false)}
            onNavigate={setActiveSection}
            onGenerateUnderstanding={handleGenerateUnderstanding}
            isGeneratingUnderstanding={isGeneratingUnderstanding}
            onInspectArtifact={handleInspectArtifact}
          />
        )}

        {/* VIEW 2: UNDERSTAND */}
        {activeSection === "understand" && (
          <ProjectUnderstandView
            project={project}
            understanding={understanding}
            isGenerating={isGeneratingUnderstanding}
            error={understandingError}
            onGenerateUnderstanding={handleGenerateUnderstanding}
            onInspectArtifact={handleInspectArtifact}
            onOpenAnalysis={() => handleStartAnalysis(analysisStatus?.is_stale || false)}
          />
        )}

        {/* VIEW 3: DIAGNOSIS & REVIEW DESK */}
        {activeSection === "diagnosis" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Triage Status Header */}
            <DiagnosisTriageHeader
              diagnosis={diagnosis}
              analysisStatus={analysisStatus}
              onReanalyze={() => handleStartAnalysis(true)}
            />

            {/* Dominant Key Finding Investigation Workspace */}
            {sortedFindings.length > 0 ? (
              <KeyFindingPager
                findings={sortedFindings}
                activeIndex={activeFindingIndex}
                onSelectFinding={setActiveFindingIndex}
                findingDetail={findingDetail}
                
              />
            ) : (
              <div className="p-10 text-center rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3">
                <p className="text-lg font-sans font-semibold text-[var(--pd-text-primary)]">No findings generated yet.</p>
                <p className="text-sm font-mono text-[var(--pd-text-muted)]">
                  Click &ldquo;Analyze Project&rdquo; in the top bar to evaluate your documentation and repository.
                </p>
              </div>
            )}

            {/* Horizontal Verified Strengths Showcase */}
            {diagnosis?.strengths && diagnosis.strengths.length > 0 && (
              <VerifiedStrengthsShowcase
                projectId={projectId!}
                strengths={diagnosis.strengths}
                
              />
            )}

            
          </div>
        )}

        {/* VIEW 4: ANALYZE */}
        {activeSection === 'analyze' && (
          <AnalyzeView 
            project={project}
            repoConnection={repoConnection}
            analysisStatus={analysisStatus}
            setActiveSection={setActiveSection}
          />
        )}
  
          {/* VIEW 5: IMPROVE */}
        {activeSection === 'improve' && projectId && (
          <ImprovementStage 
            projectId={projectId} 
            onStartAnalysis={() => handleStartAnalysis(false)} 
          />
        )}

        {/* VIEW 6: DEFEND */}
        {activeSection === 'defend' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Defend</h2>
              <p className="text-sm text-[var(--pd-text-body)] mt-1">Prepare to explain your work with evidence.</p>
            </div>
            <div className="p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-center space-y-3">
              <p className="text-base font-semibold text-[var(--pd-text-primary)]">Defend is not available yet.</p>
              <p className="text-sm text-[var(--pd-text-muted)]">
                Defend will help you practice explaining your project capabilities with supporting repository evidence. It requires analysis to be completed first.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 7: READINESS */}
        {activeSection === 'readiness' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Readiness</h2>
              <p className="text-sm text-[var(--pd-text-body)] mt-1">See what is well-supported and what needs more evidence.</p>
            </div>
            <div className="p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-center space-y-3">
              <p className="text-base font-semibold text-[var(--pd-text-primary)]">Readiness is not available yet.</p>
              <p className="text-sm text-[var(--pd-text-muted)]">
                Readiness will show qualitative evidence coverage and gaps across your capabilities. Run analysis to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feature 2: Focused Analysis Workspace Modal */}
      <AnalysisWorkspaceModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        statusResponse={analysisStatus}
        onReviewFindings={handleReviewFindings}
        onRetry={() => handleStartAnalysis(true)}
        isStarting={isStartingAnalysis}
      />

      {/* Document Text Viewer Modal */}
      {viewingArtifactModal && (
        <ExtractedTextViewerModal
          projectId={projectId!}
          artifactId={viewingArtifactModal.artifact.id}
          artifactName={viewingArtifactModal.artifact.original_filename}
          extraction={viewingArtifactModal.extraction}
          isOpen={Boolean(viewingArtifactModal)}
          onClose={() => setViewingArtifactModal(null)}
        />
      )}

      {/* Persistent Navigation Dock */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] sm:w-auto">
        <Dock className="bg-[var(--pd-surface-glass)] border border-[var(--pd-border)] shadow-pd-elevated backdrop-blur-xl max-w-full">
          <DockItem onClick={() => setActiveSection("overview")}>
            <DockLabel>Overview</DockLabel>
            <DockIcon>
              <LayoutDashboard className={cn("w-5 h-5", activeSection === "overview" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>
          
          <DockItem onClick={() => setActiveSection("understand")}>
            <DockLabel>Understand</DockLabel>
            <DockIcon>
              <BrainCircuit className={cn("w-5 h-5", activeSection === "understand" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>

          <DockItem onClick={() => setActiveSection("analyze")}>
            <DockLabel>Analyze</DockLabel>
            <DockIcon>
              <Activity className={cn("w-5 h-5", activeSection === "analyze" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>

          <DockItem onClick={() => setActiveSection("diagnosis")}>
            <DockLabel>Diagnosis</DockLabel>
            <DockIcon>
              <Stethoscope className={cn("w-5 h-5", activeSection === "diagnosis" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>

          <DockItem onClick={() => setActiveSection("improve")}>
            <DockLabel>Improve</DockLabel>
            <DockIcon>
              <TrendingUp className={cn("w-5 h-5", activeSection === "improve" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>

          <DockItem onClick={() => setActiveSection("defend")}>
            <DockLabel>Defend</DockLabel>
            <DockIcon>
              <Shield className={cn("w-5 h-5", activeSection === "defend" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>

          <DockItem onClick={() => setActiveSection("readiness")}>
            <DockLabel>Readiness</DockLabel>
            <DockIcon>
              <CheckCircle className={cn("w-5 h-5", activeSection === "readiness" ? "text-[var(--pd-ai)]" : "text-[var(--pd-text-muted)]")} />
            </DockIcon>
          </DockItem>
        </Dock>
      </div>
    </ReviewDeskLayout>
  );
};

export default ReviewDeskPage;
