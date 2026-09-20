import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getProject } from "@/services/projects";
import {
  getProjectDiagnosis,
  generateProjectDiagnosis,
  getFindingDetail,
} from "@/services/diagnosis";
import { ProjectDetail } from "@/types/project";
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
import { SourceEvidenceDrawer } from "@/components/evidence/SourceEvidenceDrawer";
import { ProjectOverviewView } from "@/components/overview/ProjectOverviewView";
import { ProjectUnderstandView } from "@/components/understanding/ProjectUnderstandView";

import { getRepository } from "@/services/repository";
import {
  getProjectUnderstanding,
  generateProjectUnderstanding,
} from "@/services/documents";
import { RepositoryConnection } from "@/types/repository";
import { ProjectUnderstanding } from "@/types/understanding";

import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [isReevaluating, setIsReevaluating] = useState(false);

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

  const isEvidenceOpen = searchParams.get("evidence") === "true";
  const setIsEvidenceOpen = (open: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (open) {
        next.set("evidence", "true");
      } else {
        next.delete("evidence");
      }
      return next;
    });
  };

  // Understanding & Repository State
  const [understanding, setUnderstanding] = useState<ProjectUnderstanding | null>(null);
  const [isGeneratingUnderstanding, setIsGeneratingUnderstanding] = useState(false);
  const [understandingError, setUnderstandingError] = useState<string | null>(null);
  const [repoConnection, setRepoConnection] = useState<RepositoryConnection | null>(null);

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

  // Re-evaluation Handler
  const handleReevaluate = async () => {
    if (!projectId) return;
    setIsReevaluating(true);
    try {
      const res = await generateProjectDiagnosis(projectId, true);
      setDiagnosis(res.diagnosis);
      setActiveFindingIndex(0);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate diagnosis");
    } finally {
      setIsReevaluating(false);
    }
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
        isReevaluating={isReevaluating}
        onReevaluate={handleReevaluate}
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
            onNavigate={setActiveSection}
            onGenerateUnderstanding={handleGenerateUnderstanding}
            isGeneratingUnderstanding={isGeneratingUnderstanding}
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
          />
        )}

        {/* VIEW 3: DIAGNOSIS & REVIEW DESK */}
        {activeSection === "diagnosis" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Triage Status Header: What needs attention without repeated project identity */}
            <DiagnosisTriageHeader diagnosis={diagnosis} />

            {/* Dominant Key Finding Investigation Workspace */}
            {sortedFindings.length > 0 ? (
              <KeyFindingPager
                findings={sortedFindings}
                activeIndex={activeFindingIndex}
                onSelectFinding={setActiveFindingIndex}
                findingDetail={findingDetail}
                onOpenEvidence={() => setIsEvidenceOpen(true)}
              />
            ) : (
              <div className="p-10 text-center rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3">
                <p className="text-lg font-sans font-semibold text-[var(--pd-text-primary)]">No findings generated yet.</p>
                <p className="text-sm font-mono text-[var(--pd-text-muted)]">Click &ldquo;Re-evaluate&rdquo; in the top bar to analyze this project.</p>
              </div>
            )}

            {/* Horizontal Verified Strengths Showcase */}
            {diagnosis?.strengths && diagnosis.strengths.length > 0 && (
              <VerifiedStrengthsShowcase
                strengths={diagnosis.strengths}
                onOpenEvidence={(strength) => {
                  // If the strength exists in sorted findings, activate it and open evidence drawer
                  const matchIndex = sortedFindings.findIndex(f => f.id === strength.id);
                  if (matchIndex !== -1) {
                    setActiveFindingIndex(matchIndex);
                  }
                  setIsEvidenceOpen(true);
                }}
              />
            )}

            {/* Source-First Evidence Drawer */}
            <SourceEvidenceDrawer
              isOpen={isEvidenceOpen}
              findingDetail={findingDetail}
              onClose={() => setIsEvidenceOpen(false)}
            />
          </div>
        )}
      </div>
    </ReviewDeskLayout>
  );
};

export default ReviewDeskPage;
