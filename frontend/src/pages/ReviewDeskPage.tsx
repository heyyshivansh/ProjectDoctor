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

// New Review Desk Core Components
import { ReviewDeskHeader } from "@/components/layout/ReviewDeskHeader";
import { ReviewDeskLayout } from "@/components/layout/ReviewDeskLayout";
import { DiagnosisOverlookHero } from "@/components/desk/DiagnosisOverlookHero";
import { HorizontalFindingsRibbon } from "@/components/desk/HorizontalFindingsRibbon";
import { ActiveFindingDossier } from "@/components/desk/ActiveFindingDossier";
import { VerifiedStrengthsDeck } from "@/components/desk/VerifiedStrengthsDeck";
import { SourceEvidenceDrawer } from "@/components/evidence/SourceEvidenceDrawer";

// Secondary Subsystem Components (Lazy Loaded on demand)
const ArtifactUploadSection = React.lazy(() =>
  import("@/components/projects/ArtifactUploadSection").then((m) => ({
    default: m.ArtifactUploadSection,
  }))
);
const ArtifactList = React.lazy(() =>
  import("@/components/projects/ArtifactList").then((m) => ({
    default: m.ArtifactList,
  }))
);
const ProjectUnderstandingCard = React.lazy(() =>
  import("@/components/understanding/ProjectUnderstandingCard").then((m) => ({
    default: m.ProjectUnderstandingCard,
  }))
);
const RequirementSummaryHeader = React.lazy(() =>
  import("@/components/requirements/RequirementSummaryHeader").then((m) => ({
    default: m.RequirementSummaryHeader,
  }))
);
const RequirementList = React.lazy(() =>
  import("@/components/requirements/RequirementList").then((m) => ({
    default: m.RequirementList,
  }))
);
const RequirementEvidenceDrawer = React.lazy(() =>
  import("@/components/requirements/RequirementEvidenceDrawer").then((m) => ({
    default: m.RequirementEvidenceDrawer,
  }))
);
const RepositoryConnectionCard = React.lazy(() =>
  import("@/components/repository/RepositoryConnectionCard").then((m) => ({
    default: m.RepositoryConnectionCard,
  }))
);
const RepositorySnapshotHeader = React.lazy(() =>
  import("@/components/repository/RepositorySnapshotHeader").then((m) => ({
    default: m.RepositorySnapshotHeader,
  }))
);
const RepositoryEvidenceList = React.lazy(() =>
  import("@/components/repository/RepositoryEvidenceList").then((m) => ({
    default: m.RepositoryEvidenceList,
  }))
);
const RepositoryFileTree = React.lazy(() =>
  import("@/components/repository/RepositoryFileTree").then((m) => ({
    default: m.RepositoryFileTree,
  }))
);

// Services for Secondary Subsystems
import {
  listRequirements,
  extractRequirements,
  getRequirementMetrics,
} from "@/services/requirements";
import {
  listProjectTraceability,
  getTraceabilitySummary,
  generateTraceability,
} from "@/services/traceability";
import {
  getRepository,
  connectRepository,
  syncRepository,
  getRepositoryTree,
  getRepositoryEvidence,
  disconnectRepository,
} from "@/services/repository";
import {
  listDocumentExtractions,
  batchExtractDocuments,
  getProjectUnderstanding,
} from "@/services/documents";
import { Requirement, RequirementMetrics } from "@/types/requirement";
import {
  RequirementTraceabilitySummary,
  TraceabilityMetrics,
} from "@/types/traceability";
import {
  RepositoryConnection,
  RepositoryFile,
  RepositoryEvidence,
  RepositoryConnectInput,
} from "@/types/repository";
import { DocumentExtractionSummary } from "@/types/document";
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

  // Active navigation tab: "diagnosis" | "requirements" | "codebase" | "documents"
  const activeSection = searchParams.get("tab") || "diagnosis";
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

  // Secondary Data: Documents & Understanding
  const [extractions, setExtractions] = useState<Record<string, DocumentExtractionSummary>>({});
  const [understanding, setUnderstanding] = useState<ProjectUnderstanding | null>(null);
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);

  // Secondary Data: Requirements & Traceability
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementMetrics, setRequirementMetrics] = useState<RequirementMetrics | null>(null);
  const [traceabilityMap, setTraceabilityMap] = useState<Record<string, RequirementTraceabilitySummary>>({});
  const [traceabilityMetrics, setTraceabilityMetrics] = useState<TraceabilityMetrics | null>(null);
  const [isExtractingRequirements, setIsExtractingRequirements] = useState(false);
  const [isGeneratingTraceability, setIsGeneratingTraceability] = useState(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);

  // Secondary Data: Repository
  const [repoConnection, setRepoConnection] = useState<RepositoryConnection | null>(null);
  const [repoFiles, setRepoFiles] = useState<RepositoryFile[]>([]);
  const [repoEvidence, setRepoEvidence] = useState<RepositoryEvidence[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [isSyncingRepo, setIsSyncingRepo] = useState(false);
  const [repoSyncMessage, setRepoSyncMessage] = useState<string | null>(null);
  const [includeIgnoredFiles, setIncludeIgnoredFiles] = useState(false);

  // Initial Load: Project & Diagnosis
  const loadDeskData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const proj = await getProject(projectId);
      setProject(proj);

      try {
        const diag = await getProjectDiagnosis(projectId);
        setDiagnosis(diag);
      } catch {
        setDiagnosis(null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDeskData();
  }, [loadDeskData]);

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

  // Secondary Tab Hydration
  useEffect(() => {
    if (!projectId) return;

    if (activeSection === "requirements") {
      listRequirements(projectId)
        .then(setRequirements)
        .catch(() => {});
      getRequirementMetrics(projectId)
        .then(setRequirementMetrics)
        .catch(() => {});
      listProjectTraceability(projectId)
        .then((items) => {
          const map: Record<string, RequirementTraceabilitySummary> = {};
          items.forEach((item) => {
            map[item.requirement_id] = item;
          });
          setTraceabilityMap(map);
        })
        .catch(() => {});
      getTraceabilitySummary(projectId)
        .then(setTraceabilityMetrics)
        .catch(() => {});
    } else if (activeSection === "codebase") {
      setIsLoadingRepo(true);
      getRepository(projectId)
        .then((conn) => {
          setRepoConnection(conn);
          if (conn?.current_snapshot) {
            getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles })
              .then(setRepoFiles)
              .catch(() => {});
            getRepositoryEvidence(projectId)
              .then(setRepoEvidence)
              .catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingRepo(false));
    } else if (activeSection === "documents") {
      listDocumentExtractions(projectId)
        .then((items) => {
          const map: Record<string, DocumentExtractionSummary> = {};
          items.forEach((item) => {
            map[item.artifact_id] = item;
          });
          setExtractions(map);
        })
        .catch(() => {});
      getProjectUnderstanding(projectId)
        .then(setUnderstanding)
        .catch(() => {});
    }
  }, [projectId, activeSection, includeIgnoredFiles]);

  // Secondary Actions
  const handleBatchExtract = async () => {
    if (!projectId) return;
    setIsBatchExtracting(true);
    try {
      await batchExtractDocuments(projectId);
      const items = await listDocumentExtractions(projectId);
      const map: Record<string, DocumentExtractionSummary> = {};
      items.forEach((item) => {
        map[item.artifact_id] = item;
      });
      setExtractions(map);
      const under = await getProjectUnderstanding(projectId);
      setUnderstanding(under);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Document extraction failed");
    } finally {
      setIsBatchExtracting(false);
    }
  };

  const handleExtractRequirements = async (forceRegenerate: boolean = false) => {
    if (!projectId) return;
    setIsExtractingRequirements(true);
    try {
      await extractRequirements(projectId, forceRegenerate);
      const items = await listRequirements(projectId);
      setRequirements(items);
      const metrics = await getRequirementMetrics(projectId);
      setRequirementMetrics(metrics);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Requirement extraction failed");
    } finally {
      setIsExtractingRequirements(false);
    }
  };

  const handleGenerateTraceability = async () => {
    if (!projectId) return;
    setIsGeneratingTraceability(true);
    try {
      const summary = await generateTraceability(projectId);
      setTraceabilityMetrics(summary.metrics);
      const items = await listProjectTraceability(projectId);
      const map: Record<string, RequirementTraceabilitySummary> = {};
      items.forEach((item) => {
        map[item.requirement_id] = item;
      });
      setTraceabilityMap(map);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Traceability generation failed");
    } finally {
      setIsGeneratingTraceability(false);
    }
  };

  const handleConnectRepo = async (input: RepositoryConnectInput) => {
    if (!projectId) return;
    setIsLoadingRepo(true);
    try {
      const conn = await connectRepository(projectId, input);
      setRepoConnection(conn);
      if (conn.current_snapshot) {
        const files = await getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles });
        setRepoFiles(files);
        const ev = await getRepositoryEvidence(projectId);
        setRepoEvidence(ev);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Repository connection failed");
    } finally {
      setIsLoadingRepo(false);
    }
  };

  const handleSyncRepo = async (force?: boolean) => {
    if (!projectId) return;
    setIsSyncingRepo(true);
    setRepoSyncMessage(null);
    try {
      const res = await syncRepository(projectId, force);
      setRepoSyncMessage(res.message);
      const conn = await getRepository(projectId);
      setRepoConnection(conn);
      if (conn?.current_snapshot) {
        const files = await getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles });
        setRepoFiles(files);
        const ev = await getRepositoryEvidence(projectId);
        setRepoEvidence(ev);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Repository sync failed");
    } finally {
      setIsSyncingRepo(false);
    }
  };

  const handleDisconnectRepo = async () => {
    if (!projectId) return;
    try {
      await disconnectRepository(projectId);
      setRepoConnection(null);
      setRepoFiles([]);
      setRepoEvidence([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Disconnect failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-[var(--pd-canvas)]">
        <Loader2 className="w-8 h-8 text-[var(--pd-accent)] animate-spin" />
        <p className="text-sm font-mono text-[var(--pd-text-muted)]">Opening Technical Review Desk...</p>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)] text-center space-y-4 text-[var(--pd-text-primary)]">
        <AlertCircle className="w-10 h-10 text-[var(--pd-critical)] mx-auto" />
        <h2 className="text-lg font-display font-medium">Unable to load project</h2>
        <p className="text-sm font-sans text-[var(--pd-text-muted)]">{loadError || "Project was not found"}</p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/">
            <Button variant="outline" size="sm" className="bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] hover:bg-[var(--pd-hairline)]">Back to Projects</Button>
          </Link>
          <Button size="sm" onClick={loadDeskData} className="bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)]">Retry</Button>
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

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* VIEW 1: DIAGNOSIS & REVIEW DESK */}
        {activeSection === "diagnosis" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Project Identity & Qualitative Diagnostic State */}
            <DiagnosisOverlookHero project={project} diagnosis={diagnosis} />

            {/* Horizontal Findings Ribbon */}
            {sortedFindings.length > 0 ? (
              <div className="space-y-6">
                <HorizontalFindingsRibbon
                  findings={sortedFindings}
                  activeIndex={activeFindingIndex}
                  onSelectFinding={setActiveFindingIndex}
                />

                {/* Dominant Active Finding Dossier */}
                {activeFinding && (
                  <ActiveFindingDossier
                    finding={activeFinding}
                    findingDetail={findingDetail}
                    onOpenEvidence={() => setIsEvidenceOpen(true)}
                  />
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)] space-y-2">
                <p className="text-base font-sans text-[var(--pd-text-body)]">No findings generated yet.</p>
                <p className="text-xs font-mono text-[var(--pd-text-muted)]">Click "Re-evaluate" in the top bar to analyze this project.</p>
              </div>
            )}

            {/* Verified Architectural Strengths */}
            {diagnosis?.strengths && diagnosis.strengths.length > 0 && (
              <VerifiedStrengthsDeck strengths={diagnosis.strengths} />
            )}

            {/* Source-First Evidence Drawer */}
            <SourceEvidenceDrawer
              isOpen={isEvidenceOpen}
              findingDetail={findingDetail}
              onClose={() => setIsEvidenceOpen(false)}
            />
          </div>
        )}

        {/* VIEW 2: REQUIREMENTS & TRACEABILITY */}
        <React.Suspense fallback={<div className="p-12 text-center text-xs text-[var(--pd-text-muted)] font-mono">Loading Requirements Explorer...</div>}>
          {activeSection === "requirements" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <RequirementSummaryHeader
                metrics={requirementMetrics}
                traceabilityMetrics={traceabilityMetrics}
                hasRepository={Boolean(repoConnection?.current_snapshot)}
                activeCommitSha={repoConnection?.current_snapshot?.commit_sha}
                isExtracting={isExtractingRequirements}
                isGeneratingTraceability={isGeneratingTraceability}
                onExtract={handleExtractRequirements}
                onGenerateTraceability={handleGenerateTraceability}
              />
              <RequirementList
                requirements={requirements}
                traceabilityMap={traceabilityMap}
                hasRepository={Boolean(repoConnection?.current_snapshot)}
                onSelectRequirement={(reqId) => setSelectedRequirementId(reqId)}
              />
              {selectedRequirementId && (
                <RequirementEvidenceDrawer
                  projectId={project.id}
                  requirementId={selectedRequirementId}
                  onClose={() => setSelectedRequirementId(null)}
                />
              )}
            </div>
          )}

          {/* VIEW 3: CODEBASE & REPOSITORY */}
          {activeSection === "codebase" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <RepositoryConnectionCard
                connection={repoConnection}
                isLoading={isLoadingRepo}
                onConnect={handleConnectRepo}
                onDisconnect={handleDisconnectRepo}
              />
              {repoConnection && repoConnection.current_snapshot && (
                <>
                  <RepositorySnapshotHeader
                    connection={repoConnection}
                    snapshot={repoConnection.current_snapshot}
                    onSync={handleSyncRepo}
                    isSyncing={isSyncingRepo}
                    syncMessage={repoSyncMessage}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RepositoryFileTree
                      files={repoFiles}
                      repoUrl={repoConnection.repo_url}
                      commitSha={repoConnection.current_snapshot.commit_sha}
                      includeIgnored={includeIgnoredFiles}
                      onToggleIncludeIgnored={setIncludeIgnoredFiles}
                    />
                    <RepositoryEvidenceList
                      evidence={repoEvidence}
                      repoUrl={repoConnection.repo_url}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW 4: DOCUMENTS & UNDERSTANDING */}
          {activeSection === "documents" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-[var(--pd-hairline)]">
                <div>
                  <h2 className="text-xl font-display font-medium text-[var(--pd-text-primary)] tracking-tight">
                    Project Documents & Understanding
                  </h2>
                  <p className="text-xs sm:text-sm font-sans text-[var(--pd-text-muted)] mt-1">
                    Uploaded artifacts, extraction status, and synthesized architectural understanding.
                  </p>
                </div>
                {project.artifacts && project.artifacts.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBatchExtract}
                    disabled={isBatchExtracting}
                    className="text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] hover:bg-[var(--pd-hairline)] gap-1.5"
                  >
                    {isBatchExtracting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--pd-accent)]" />
                        Extracting...
                      </>
                    ) : (
                      "Batch Extract Documents"
                    )}
                  </Button>
                )}
              </div>

              <ArtifactUploadSection
                projectId={project.id}
                onUploadSuccess={loadDeskData}
              />
              <ArtifactList
                projectId={project.id}
                artifacts={project.artifacts || []}
                extractions={extractions}
                onExtractionUpdated={(ext) =>
                  setExtractions((prev) => ({ ...prev, [ext.artifact_id]: ext }))
                }
              />
              <ProjectUnderstandingCard
                projectId={project.id}
                initialUnderstanding={understanding}
                onUnderstandingUpdated={setUnderstanding}
              />
            </div>
          )}
        </React.Suspense>
      </div>
    </ReviewDeskLayout>
  );
};

export default ReviewDeskPage;
