import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProject } from "@/services/projects";
import {
  getProjectDiagnosis,
  generateProjectDiagnosis,
} from "@/services/diagnosis";
import { ProjectDetail } from "@/types/project";
import { ProjectDiagnosis } from "@/types/diagnosis";

// Studio Spatial Dossier Primary Components
import { StudioHeader } from "@/components/studio/StudioHeader";
import { StudioViewport } from "@/components/studio/StudioViewport";
import { SubsystemsDock, StudioTab } from "@/components/studio/SubsystemsDock";

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

export const ProjectStudioPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // Studio Primary State
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [diagnosis, setDiagnosis] = useState<ProjectDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReevaluating, setIsReevaluating] = useState(false);

  // Active Subsystem Dock Tab
  const [activeTab, setActiveTab] = useState<StudioTab>("diagnosis");

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
  const loadStudioData = useCallback(async () => {
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
        // Diagnosis might not exist yet
        setDiagnosis(null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  // Re-evaluation Handler
  const handleReevaluate = async () => {
    if (!projectId) return;
    setIsReevaluating(true);
    try {
      const res = await generateProjectDiagnosis(projectId, true);
      setDiagnosis(res.diagnosis);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate diagnosis");
    } finally {
      setIsReevaluating(false);
    }
  };

  // Secondary Tab Hydration
  useEffect(() => {
    if (!projectId) return;

    if (activeTab === "requirements") {
      listRequirements(projectId)
        .then((items) => setRequirements(items))
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
        .then((res) => setTraceabilityMetrics(res))
        .catch(() => {});
    } else if (activeTab === "repository") {
      setIsLoadingRepo(true);
      getRepository(projectId)
        .then((conn) => {
          setRepoConnection(conn);
          if (conn && conn.current_snapshot) {
            getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles })
              .then((files) => setRepoFiles(files))
              .catch(() => {});
            getRepositoryEvidence(projectId)
              .then((evidence) => setRepoEvidence(evidence))
              .catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingRepo(false));
    } else if (activeTab === "documents") {
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
  }, [projectId, activeTab]);

  // Secondary Actions: Document Extraction
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

  const handleExtractionUpdated = (ext: DocumentExtractionSummary) => {
    setExtractions((prev) => ({ ...prev, [ext.artifact_id]: ext }));
  };

  // Secondary Actions: Requirements
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

  // Secondary Actions: Repository
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

  // Deep-link Explorer Bridges from Diagnostic Finding Cards
  const handleInspectCodebase = useCallback((_filePath?: string) => {
    setActiveTab("repository");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleInspectRequirements = useCallback((requirementId?: string) => {
    setActiveTab("requirements");
    if (requirementId) {
      setSelectedRequirementId(requirementId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleInspectDocuments = useCallback((_artifactId?: string) => {
    setActiveTab("documents");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#d4924f] animate-spin" />
        <p className="text-sm font-mono text-[#888e9b]">Opening Diagnostic Studio...</p>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl bg-[#181a1f] border border-[#2c303a] text-center space-y-4 text-[#f2efe9]">
        <AlertCircle className="w-10 h-10 text-[#e06c75] mx-auto" />
        <h2 className="text-lg font-display font-medium text-[#f2efe9]">Unable to load project</h2>
        <p className="text-sm font-sans text-[#888e9b]">{loadError || "Project was not found"}</p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/">
            <Button variant="outline" size="sm" className="bg-[#20232a] border-[#2c303a] text-[#f2efe9] hover:bg-[#2c303a]">Back to Entry</Button>
          </Link>
          <Button size="sm" onClick={loadStudioData} className="bg-[#d4924f] text-[#111317] hover:bg-[#e2a15f]">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-24">
      {/* Quiet Top Navigation Header */}
      <StudioHeader
        projectTitle={project.title}
        diagnosisStatus={diagnosis?.status}
        isReevaluating={isReevaluating}
        onReevaluate={handleReevaluate}
      />

      {/* Chapter: DIAGNOSTIC STACK */}
      {activeTab === "diagnosis" && (
        <div className="animate-in fade-in duration-200">
          <StudioViewport
            project={project}
            diagnosis={diagnosis}
            onInspectCodebase={handleInspectCodebase}
            onInspectRequirements={handleInspectRequirements}
            onInspectDocuments={handleInspectDocuments}
          />
        </div>
      )}

      {/* Secondary Chapters (Lazy Loaded via React.Suspense) */}
      <React.Suspense
        fallback={
          <div className="p-12 text-center text-xs text-[#888e9b] font-mono">
            Loading evidence explorer modules...
          </div>
        }
      >
        {/* Chapter: REQUIREMENTS (Specification & Traceability Explorer) */}
        {activeTab === "requirements" && (
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
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

        {/* Chapter: CODEBASE (Repository Evidence Explorer) */}
        {activeTab === "repository" && (
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
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

        {/* Chapter: DOCUMENTS (Specification & Understanding Explorer) */}
        {activeTab === "documents" && (
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-[#2c303a]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#d4924f]" />
                  <h2 className="text-xl font-display font-medium text-[#f2efe9] tracking-tight">
                    Project Documents & Understanding Explorer
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-sans text-[#c4c8d0] mt-1">
                  Answers: <span className="text-[#f2efe9] italic">"What does the submitted documentation contain?"</span> — uploaded artifacts, sections, and structured understanding.
                </p>
              </div>
              {project.artifacts && project.artifacts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchExtract}
                  disabled={isBatchExtracting}
                  className="text-xs font-mono bg-[#181a1f] border-[#2c303a] text-[#f2efe9] hover:bg-[#20232a] gap-1.5"
                >
                  {isBatchExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d4924f]" />
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
              onUploadSuccess={loadStudioData}
            />
            <ArtifactList
              projectId={project.id}
              artifacts={project.artifacts || []}
              extractions={extractions}
              onExtractionUpdated={handleExtractionUpdated}
            />
            <ProjectUnderstandingCard
              projectId={project.id}
              initialUnderstanding={understanding}
              onUnderstandingUpdated={setUnderstanding}
            />
          </div>
        )}
      </React.Suspense>

      {/* Secondary Floating Dock */}
      <SubsystemsDock activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
};

export default ProjectStudioPage;
