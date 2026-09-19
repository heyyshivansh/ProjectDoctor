import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProject } from "@/services/projects";
import {
  listDocumentExtractions,
  batchExtractDocuments,
  getProjectUnderstanding,
} from "@/services/documents";
import {
  listRequirements,
  extractRequirements,
  getRequirementMetrics,
} from "@/services/requirements";
import { ProjectDetail, Artifact } from "@/types/project";
import { DocumentExtractionSummary } from "@/types/document";
import { ProjectUnderstanding } from "@/types/understanding";
import { Requirement, RequirementMetrics } from "@/types/requirement";
import {
  RepositoryConnection,
  RepositoryFile,
  RepositoryEvidence,
  RepositoryConnectInput,
} from "@/types/repository";
import {
  getRepository,
  connectRepository,
  syncRepository,
  getRepositoryTree,
  getRepositoryEvidence,
  disconnectRepository,
} from "@/services/repository";
import { ArtifactUploadSection } from "@/components/projects/ArtifactUploadSection";
import { ArtifactList } from "@/components/projects/ArtifactList";
import { ProjectUnderstandingCard } from "@/components/understanding/ProjectUnderstandingCard";
import { RequirementSummaryHeader } from "@/components/requirements/RequirementSummaryHeader";
import { RequirementList } from "@/components/requirements/RequirementList";
import { RequirementEvidenceDrawer } from "@/components/requirements/RequirementEvidenceDrawer";
import { RepositoryConnectionCard } from "@/components/repository/RepositoryConnectionCard";
import { RepositorySnapshotHeader } from "@/components/repository/RepositorySnapshotHeader";
import { RepositoryEvidenceList } from "@/components/repository/RepositoryEvidenceList";
import { RepositoryFileTree } from "@/components/repository/RepositoryFileTree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Layers,
  FileCode,
  Loader2,
  AlertCircle,
  RefreshCw,
  Cpu,
  FileText,
  Sparkles,
  CheckCircle2,
  GitFork,
} from "lucide-react";


export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [extractions, setExtractions] = useState<Record<string, DocumentExtractionSummary>>({});
  const [understanding, setUnderstanding] = useState<ProjectUnderstanding | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementMetrics, setRequirementMetrics] = useState<RequirementMetrics | null>(null);
  const [isExtractingRequirements, setIsExtractingRequirements] = useState<boolean>(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "understanding" | "requirements" | "repository">("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Repository State
  const [repoConnection, setRepoConnection] = useState<RepositoryConnection | null>(null);
  const [repoFiles, setRepoFiles] = useState<RepositoryFile[]>([]);
  const [repoEvidence, setRepoEvidence] = useState<RepositoryEvidence[]>([]);
  const [isSyncingRepo, setIsSyncingRepo] = useState<boolean>(false);
  const [repoSyncMessage, setRepoSyncMessage] = useState<string | null>(null);
  const [includeIgnoredFiles, setIncludeIgnoredFiles] = useState<boolean>(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    try {
      const [
        projectData,
        extractionList,
        understandingData,
        requirementsList,
        metricsData,
        repositoryData,
      ] = await Promise.all([
        getProject(projectId),
        listDocumentExtractions(projectId).catch(() => [] as DocumentExtractionSummary[]),
        getProjectUnderstanding(projectId).catch(() => null),
        listRequirements(projectId).catch(() => [] as Requirement[]),
        getRequirementMetrics(projectId).catch(() => null),
        getRepository(projectId).catch(() => null),
      ]);

      setProject(projectData);

      const extractionMap: Record<string, DocumentExtractionSummary> = {};
      extractionList.forEach((item) => {
        extractionMap[item.artifact_id] = item;
      });
      setExtractions(extractionMap);
      setUnderstanding(understandingData);
      setRequirements(requirementsList);
      setRequirementMetrics(metricsData);
      setRepoConnection(repositoryData);

      if (repositoryData?.current_snapshot) {
        const [files, evidenceList] = await Promise.all([
          getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles }).catch(() => [] as RepositoryFile[]),
          getRepositoryEvidence(projectId).catch(() => [] as RepositoryEvidence[]),
        ]);
        setRepoFiles(files);
        setRepoEvidence(evidenceList);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load project details."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, includeIgnoredFiles]);

  const handleExtractRequirements = async (forceRegenerate: boolean = false) => {
    if (!projectId) return;
    setIsExtractingRequirements(true);
    try {
      const summary = await extractRequirements(projectId, forceRegenerate);
      setRequirements(summary.requirements);
      const metrics = await getRequirementMetrics(projectId).catch(() => null);
      if (metrics) setRequirementMetrics(metrics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract requirements."
      );
    } finally {
      setIsExtractingRequirements(false);
    }
  };

  const handleConnectRepository = async (input: RepositoryConnectInput) => {
    if (!projectId) return;
    const connection = await connectRepository(projectId, input);
    setRepoConnection(connection);
  };

  const handleDisconnectRepository = async () => {
    if (!projectId) return;
    await disconnectRepository(projectId);
    setRepoConnection(null);
    setRepoFiles([]);
    setRepoEvidence([]);
    setRepoSyncMessage(null);
  };

  const handleSyncRepository = async (force: boolean = false) => {
    if (!projectId) return;
    setIsSyncingRepo(true);
    setRepoSyncMessage(null);
    try {
      const result = await syncRepository(projectId, force);
      setRepoSyncMessage(result.message);

      // Refresh connection, files, and evidence
      const [updatedConn, files, evidenceList] = await Promise.all([
        getRepository(projectId),
        getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles }).catch(() => [] as RepositoryFile[]),
        getRepositoryEvidence(projectId).catch(() => [] as RepositoryEvidence[]),
      ]);
      setRepoConnection(updatedConn);
      setRepoFiles(files);
      setRepoEvidence(evidenceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync repository.");
      // Refresh connection to catch error status
      const updatedConn = await getRepository(projectId).catch(() => null);
      if (updatedConn) setRepoConnection(updatedConn);
    } finally {
      setIsSyncingRepo(false);
    }
  };

  const handleToggleIncludeIgnored = async (val: boolean) => {
    setIncludeIgnoredFiles(val);
    if (!projectId || !repoConnection?.current_snapshot) return;
    try {
      const files = await getRepositoryTree(projectId, { include_ignored: val });
      setRepoFiles(files);
    } catch (err) {
      console.error("Failed to filter tree", err);
    }
  };



  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleArtifactUploaded = (newArtifact: Artifact) => {
    if (!project) return;
    setProject({
      ...project,
      artifacts: [newArtifact, ...project.artifacts],
    });
  };

  const handleExtractionUpdated = (updated: DocumentExtractionSummary) => {
    setExtractions((prev) => ({
      ...prev,
      [updated.artifact_id]: updated,
    }));
  };

  const handleBatchExtract = async () => {
    if (!projectId) return;
    setIsBatchExtracting(true);
    setBatchMessage(null);
    try {
      const result = await batchExtractDocuments(projectId);
      setBatchMessage(
        `Batch extraction finished: ${result.completed_count} completed, ${result.skipped_count} skipped, ${result.failed_count} failed.`
      );

      // Refresh extractions list and understanding
      const [newExtractions, newUnderstanding] = await Promise.all([
        listDocumentExtractions(projectId).catch(() => [] as DocumentExtractionSummary[]),
        getProjectUnderstanding(projectId).catch(() => null),
      ]);

      const map: Record<string, DocumentExtractionSummary> = {};
      newExtractions.forEach((item) => {
        map[item.artifact_id] = item;
      });
      setExtractions(map);
      if (newUnderstanding) {
        setUnderstanding(newUnderstanding);
      }
    } catch (err) {
      setBatchMessage(
        err instanceof Error ? err.message : "Failed to execute batch extraction."
      );
    } finally {
      setIsBatchExtracting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm inline-flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Project not found."}</span>
        </div>
        <div>
          <Button variant="outline" onClick={fetchProjectData} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
        <div>
          <Link to="/" className={buttonVariants({ variant: "link" })}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const createdDate = new Date(project.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>
        <Badge variant="secondary" className="capitalize text-xs">
          Status: {project.status}
        </Badge>
      </div>

      {/* Project Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {project.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Created on {createdDate}
              </span>
              <span>&bull;</span>
              <span>ID: <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{project.id}</code></span>
            </div>
          </div>

          {project.github_repo_url && (
            <a
              href={project.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs shrink-0")}
            >
              <FileCode className="h-4 w-4" />
              GitHub Repository
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors",
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <FileText className="h-4 w-4" />
            Overview & Artifacts
            {project.artifacts.length > 0 && (
              <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">
                {project.artifacts.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("understanding")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors",
              activeTab === "understanding"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Structured Understanding
            {understanding && (
              <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-blue-50 text-blue-600 font-medium border border-blue-200">
                Ready
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requirements")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors",
              activeTab === "requirements"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <Layers className="h-4 w-4" />
            Requirements & Traceability
            {requirements.length > 0 && (
              <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                {requirements.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("repository")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors",
              activeTab === "repository"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <GitFork className="h-4 w-4" />
            GitHub Evidence
            {repoConnection?.current_snapshot ? (
              <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                {repoEvidence.length > 0 ? `${repoEvidence.length} facts` : "Synced"}
              </span>
            ) : repoConnection ? (
              <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-blue-50 text-blue-600 font-medium border border-blue-200">
                Connected
              </span>
            ) : null}
          </button>
        </nav>
      </div>



      {/* Tab 1: Overview & Artifacts */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Project Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Problem Statement Card */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Problem Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {project.problem_statement}
              </CardContent>
            </Card>

            {/* Project Description Card */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Project Description
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </CardContent>
            </Card>
          </div>

          {/* Requirements & Architecture & Tech Stack Details */}
          {(project.requirements || project.architecture_summary || (project.tech_stack && project.tech_stack.length > 0)) && (
            <Card className="border border-slate-200">
              <CardContent className="pt-6 space-y-6">
                {project.tech_stack && project.tech_stack.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5" />
                      Technology Stack
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tech_stack.map((tech) => (
                        <Badge key={tech} variant="outline" className="bg-slate-50 text-slate-800">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.requirements && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Initial Requirements
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {project.requirements}
                    </p>
                  </div>
                )}

                {project.architecture_summary && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Architecture Overview
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {project.architecture_summary}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Artifacts Management Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Project Artifacts & Documents
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload, inspect, and extract text and outline structure from project specifications.
                </p>
              </div>

              {project.artifacts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchExtract}
                  disabled={isBatchExtracting}
                  className="gap-2 text-xs font-medium shrink-0 self-start sm:self-auto"
                >
                  {isBatchExtracting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      Extracting All...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Batch Extract All
                    </>
                  )}
                </Button>
              )}
            </div>

            {batchMessage && (
              <div className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{batchMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchMessage(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <ArtifactUploadSection
              projectId={project.id}
              onUploadSuccess={handleArtifactUploaded}
            />

            <ArtifactList
              projectId={project.id}
              artifacts={project.artifacts}
              extractions={extractions}
              onExtractionUpdated={handleExtractionUpdated}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Structured Project Understanding */}
      {activeTab === "understanding" && (
        <div className="space-y-6">
          <ProjectUnderstandingCard
            projectId={project.id}
            initialUnderstanding={understanding}
            onUnderstandingUpdated={(updated) => setUnderstanding(updated)}
          />
        </div>
      )}

      {/* Tab 3: Requirements & Traceability */}
      {activeTab === "requirements" && (
        <div className="space-y-6">
          <RequirementSummaryHeader
            metrics={requirementMetrics}
            isExtracting={isExtractingRequirements}
            onExtract={handleExtractRequirements}
          />
          <RequirementList
            requirements={requirements}
            onSelectRequirement={(reqId) => setSelectedRequirementId(reqId)}
          />
        </div>
      )}

      {/* Tab 4: GitHub Repository & Code Evidence */}
      {activeTab === "repository" && (
        <div className="space-y-6">
          <RepositoryConnectionCard
            connection={repoConnection}
            onConnect={handleConnectRepository}
            onDisconnect={handleDisconnectRepository}
            isLoading={isSyncingRepo}
          />

          {repoConnection && (
            <>
              <RepositorySnapshotHeader
                connection={repoConnection}
                snapshot={repoConnection.current_snapshot ?? null}
                onSync={handleSyncRepository}
                isSyncing={isSyncingRepo}
                syncMessage={repoSyncMessage}
              />

              {repoConnection.current_snapshot && (
                <div className="space-y-8 pt-2">
                  <RepositoryEvidenceList
                    evidence={repoEvidence}
                    repoUrl={repoConnection.repo_url}
                  />

                  <RepositoryFileTree
                    files={repoFiles}
                    repoUrl={repoConnection.repo_url}
                    commitSha={repoConnection.current_snapshot.commit_sha}
                    includeIgnored={includeIgnoredFiles}
                    onToggleIncludeIgnored={handleToggleIncludeIgnored}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* Evidence Provenance Modal / Drawer */}
      <RequirementEvidenceDrawer
        projectId={project.id}
        requirementId={selectedRequirementId}
        onClose={() => setSelectedRequirementId(null)}
      />
    </div>
  );
};

