import React, { useEffect, useState, useCallback, useRef } from "react";
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
  getProjectDiagnosis,
  generateProjectDiagnosis,
} from "@/services/diagnosis";
import { ProjectDetail, Artifact } from "@/types/project";
import { DocumentExtractionSummary } from "@/types/document";
import { ProjectUnderstanding } from "@/types/understanding";
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
import { ProjectDiagnosis } from "@/types/diagnosis";

import { DiagnosisHeroSummary } from "@/components/diagnosis/DiagnosisHeroSummary";
import { FindingsSection } from "@/components/diagnosis/FindingsSection";
import { StrengthsSection } from "@/components/diagnosis/StrengthsSection";
import { FindingDetailDrawer } from "@/components/diagnosis/FindingDetailDrawer";

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

type SecondaryTab = "overview" | "requirements" | "repository" | "understanding";

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // Primary Diagnosis & Project State
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [diagnosis, setDiagnosis] = useState<ProjectDiagnosis | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState<boolean>(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Secondary Project Details State (Lazy Loaded)
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>("overview");
  const [loadedTabs, setLoadedTabs] = useState<Record<SecondaryTab, boolean>>({
    overview: false,
    requirements: false,
    repository: false,
    understanding: false,
  });

  // Secondary Data: Documents & Artifacts
  const [extractions, setExtractions] = useState<Record<string, DocumentExtractionSummary>>({});
  const [isBatchExtracting, setIsBatchExtracting] = useState<boolean>(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  // Secondary Data: Understanding
  const [understanding, setUnderstanding] = useState<ProjectUnderstanding | null>(null);
  const [isLoadingUnderstanding, setIsLoadingUnderstanding] = useState<boolean>(false);

  // Secondary Data: Requirements & Traceability
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementMetrics, setRequirementMetrics] = useState<RequirementMetrics | null>(null);
  const [traceabilityMap, setTraceabilityMap] = useState<Record<string, RequirementTraceabilitySummary>>({});
  const [traceabilityMetrics, setTraceabilityMetrics] = useState<TraceabilityMetrics | null>(null);
  const [isExtractingRequirements, setIsExtractingRequirements] = useState<boolean>(false);
  const [isGeneratingTraceability, setIsGeneratingTraceability] = useState<boolean>(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState<boolean>(false);

  // Secondary Data: Repository
  const [repoConnection, setRepoConnection] = useState<RepositoryConnection | null>(null);
  const [repoFiles, setRepoFiles] = useState<RepositoryFile[]>([]);
  const [repoEvidence, setRepoEvidence] = useState<RepositoryEvidence[]>([]);
  const [isSyncingRepo, setIsSyncingRepo] = useState<boolean>(false);
  const [repoSyncMessage, setRepoSyncMessage] = useState<string | null>(null);
  const [includeIgnoredFiles, setIncludeIgnoredFiles] = useState<boolean>(false);
  const [isLoadingRepository, setIsLoadingRepository] = useState<boolean>(false);

  const secondarySectionRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // 1. INITIAL LOAD (PRIORITIZES PROJECT & DIAGNOSIS ONLY)
  // -------------------------------------------------------------
  const fetchInitialData = useCallback(async () => {
    if (!projectId) return;

    setIsLoadingInitial(true);
    setError(null);

    try {
      // Prioritize Project and Diagnosis (STRICTLY READ-ONLY GET)
      const [projectData, diagnosisData] = await Promise.all([
        getProject(projectId),
        getProjectDiagnosis(projectId).catch((err) => {
          console.warn("Could not load initial diagnosis:", err);
          return null;
        }),
      ]);

      setProject(projectData);
      setDiagnosis(diagnosisData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load project details."
      );
    } finally {
      setIsLoadingInitial(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // -------------------------------------------------------------
  // 2. EXPLICIT DIAGNOSIS GENERATION (POST)
  // -------------------------------------------------------------
  const handleReevaluateDiagnosis = async () => {
    if (!projectId) return;
    setIsGeneratingDiagnosis(true);
    try {
      const result = await generateProjectDiagnosis(projectId, true);
      setDiagnosis(result.diagnosis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to evaluate project diagnosis."
      );
    } finally {
      setIsGeneratingDiagnosis(false);
    }
  };

  // -------------------------------------------------------------
  // 3. LAZY-LOADING FOR SECONDARY SECTIONS
  // -------------------------------------------------------------
  const loadSecondaryTabData = useCallback(
    async (tab: SecondaryTab) => {
      if (!projectId || loadedTabs[tab]) return;

      if (tab === "overview") {
        try {
          const extractionList = await listDocumentExtractions(projectId).catch(() => []);
          const extractionMap: Record<string, DocumentExtractionSummary> = {};
          extractionList.forEach((item) => {
            extractionMap[item.artifact_id] = item;
          });
          setExtractions(extractionMap);
          setLoadedTabs((prev) => ({ ...prev, overview: true }));
        } catch (err) {
          console.error("Failed to load document extractions", err);
        }
      } else if (tab === "understanding") {
        setIsLoadingUnderstanding(true);
        try {
          const underData = await getProjectUnderstanding(projectId).catch(() => null);
          setUnderstanding(underData);
          setLoadedTabs((prev) => ({ ...prev, understanding: true }));
        } catch (err) {
          console.error("Failed to load project understanding", err);
        } finally {
          setIsLoadingUnderstanding(false);
        }
      } else if (tab === "requirements") {
        setIsLoadingRequirements(true);
        try {
          const [requirementsList, metricsData, traceabilityList, traceMetrics, repoData] =
            await Promise.all([
              listRequirements(projectId).catch(() => [] as Requirement[]),
              getRequirementMetrics(projectId).catch(() => null),
              listProjectTraceability(projectId).catch(() => [] as RequirementTraceabilitySummary[]),
              getTraceabilitySummary(projectId).catch(() => null),
              repoConnection ? Promise.resolve(repoConnection) : getRepository(projectId).catch(() => null),
            ]);

          setRequirements(requirementsList);
          setRequirementMetrics(metricsData);

          const traceMap: Record<string, RequirementTraceabilitySummary> = {};
          traceabilityList.forEach((item) => {
            traceMap[item.requirement_code] = item;
            traceMap[item.requirement_id] = item;
          });
          setTraceabilityMap(traceMap);
          setTraceabilityMetrics(traceMetrics);

          if (!repoConnection && repoData) {
            setRepoConnection(repoData);
          }

          setLoadedTabs((prev) => ({ ...prev, requirements: true }));
        } catch (err) {
          console.error("Failed to load requirements & traceability", err);
        } finally {
          setIsLoadingRequirements(false);
        }
      } else if (tab === "repository") {
        setIsLoadingRepository(true);
        try {
          const repoData = repoConnection || (await getRepository(projectId).catch(() => null));
          setRepoConnection(repoData);

          if (repoData?.current_snapshot) {
            const [files, evidenceList] = await Promise.all([
              getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles }).catch(() => []),
              getRepositoryEvidence(projectId).catch(() => []),
            ]);
            setRepoFiles(files);
            setRepoEvidence(evidenceList);
          }
          setLoadedTabs((prev) => ({ ...prev, repository: true }));
        } catch (err) {
          console.error("Failed to load repository data", err);
        } finally {
          setIsLoadingRepository(false);
        }
      }
    },
    [projectId, loadedTabs, repoConnection, includeIgnoredFiles]
  );

  const handleSelectSecondaryTab = (tab: SecondaryTab) => {
    setSecondaryTab(tab);
    loadSecondaryTabData(tab);
  };

  const handleNavigateToSubsystem = (tab: SecondaryTab) => {
    handleSelectSecondaryTab(tab);
    secondarySectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // -------------------------------------------------------------
  // 4. SECONDARY SECTION MUTATION HANDLERS
  // -------------------------------------------------------------
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

      const [updatedConn, files, evidenceList, traces, traceMetrics] = await Promise.all([
        getRepository(projectId),
        getRepositoryTree(projectId, { include_ignored: includeIgnoredFiles }).catch(() => []),
        getRepositoryEvidence(projectId).catch(() => []),
        listProjectTraceability(projectId).catch(() => []),
        getTraceabilitySummary(projectId).catch(() => null),
      ]);
      setRepoConnection(updatedConn);
      setRepoFiles(files);
      setRepoEvidence(evidenceList);

      const traceMap: Record<string, RequirementTraceabilitySummary> = {};
      traces.forEach((item) => {
        traceMap[item.requirement_code] = item;
        traceMap[item.requirement_id] = item;
      });
      setTraceabilityMap(traceMap);
      setTraceabilityMetrics(traceMetrics);

      // Refresh diagnosis after repo sync
      const freshDiag = await getProjectDiagnosis(projectId).catch(() => null);
      if (freshDiag) setDiagnosis(freshDiag);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync repository.");
      const updatedConn = await getRepository(projectId).catch(() => null);
      if (updatedConn) setRepoConnection(updatedConn);
    } finally {
      setIsSyncingRepo(false);
    }
  };

  const handleGenerateTraceability = async () => {
    if (!projectId) return;
    setIsGeneratingTraceability(true);
    try {
      await generateTraceability(projectId, true);
      const [traces, traceMetrics] = await Promise.all([
        listProjectTraceability(projectId).catch(() => []),
        getTraceabilitySummary(projectId).catch(() => null),
      ]);
      const traceMap: Record<string, RequirementTraceabilitySummary> = {};
      traces.forEach((item) => {
        traceMap[item.requirement_code] = item;
        traceMap[item.requirement_id] = item;
      });
      setTraceabilityMap(traceMap);
      setTraceabilityMetrics(traceMetrics);

      // In CP7a backend, traceability generation automatically updates diagnosis
      const freshDiag = await getProjectDiagnosis(projectId).catch(() => null);
      if (freshDiag) setDiagnosis(freshDiag);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate requirement traceability.");
    } finally {
      setIsGeneratingTraceability(false);
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

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading project & diagnosis...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm inline-flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Project not found."}</span>
        </div>
        <div>
          <Button variant="outline" onClick={fetchInitialData} className="gap-1.5">
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

  if (!project) return null;

  const createdDate = new Date(project.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
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
              <span>
                ID: <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{project.id}</code>
              </span>
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

      {/* ============================================================= */}
      {/* PRIMARY SECTION: DIAGNOSIS & FINDINGS (DIAGNOSIS-FIRST UX)    */}
      {/* ============================================================= */}
      <section className="space-y-8" aria-label="Project Diagnosis & Findings">
        {/* Diagnosis Hero Banner */}
        <DiagnosisHeroSummary
          diagnosis={diagnosis}
          isGenerating={isGeneratingDiagnosis}
          onReevaluate={handleReevaluateDiagnosis}
          onNavigateToSubsystem={handleNavigateToSubsystem}
        />

        {/* What Needs Attention? (Issues Section) */}
        {diagnosis && (
          <FindingsSection
            findings={diagnosis.top_findings}
            onInspectFinding={(fId) => setSelectedFindingId(fId)}
          />
        )}

        {/* What Is Going Well? (Strengths Section) */}
        {diagnosis && diagnosis.strengths.length > 0 && (
          <StrengthsSection
            strengths={diagnosis.strengths}
            onInspectFinding={(fId) => setSelectedFindingId(fId)}
          />
        )}
      </section>

      {/* ============================================================= */}
      {/* SECONDARY SECTION: SUPPORTING PROJECT DETAILS & EVIDENCE      */}
      {/* ============================================================= */}
      <section
        ref={secondarySectionRef}
        className="pt-8 border-t border-slate-200 space-y-6"
        aria-labelledby="secondary-details-heading"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="secondary-details-heading" className="text-xl font-bold text-slate-900 tracking-tight">
              Supporting Project Details & Raw Evidence
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect project overview, extracted specifications, requirement traceability matrix, and GitHub repository files.
            </p>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => handleSelectSecondaryTab("overview")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2",
              secondaryTab === "overview"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Overview & Artifacts
            {project.artifacts.length > 0 && (
              <span className={cn(
                "py-0.5 px-1.5 rounded-full text-[10px]",
                secondaryTab === "overview" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
              )}>
                {project.artifacts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectSecondaryTab("requirements")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2",
              secondaryTab === "requirements"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Requirements & Traceability
            {loadedTabs.requirements && requirements.length > 0 && (
              <span className={cn(
                "py-0.5 px-1.5 rounded-full text-[10px]",
                secondaryTab === "requirements" ? "bg-indigo-800 text-white" : "bg-slate-200 text-slate-700"
              )}>
                {requirements.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectSecondaryTab("repository")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2",
              secondaryTab === "repository"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <GitFork className="h-3.5 w-3.5" />
            GitHub Repository
            {repoConnection?.current_snapshot && (
              <span className={cn(
                "py-0.5 px-1.5 rounded-full text-[10px]",
                secondaryTab === "repository" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"
              )}>
                Synced
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectSecondaryTab("understanding")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2",
              secondaryTab === "understanding"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Structured Understanding
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Secondary Subsystem Tab 1: Overview & Artifacts              */}
        {/* ------------------------------------------------------------- */}
        {secondaryTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-150">
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

            {/* Tech Stack, Initial Requirements, & Architecture */}
            {(project.requirements ||
              project.architecture_summary ||
              (project.tech_stack && project.tech_stack.length > 0)) && (
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
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Project Artifacts & Documents
                  </h3>
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

        {/* ------------------------------------------------------------- */}
        {/* Secondary Subsystem Tab 2: Requirements & Traceability        */}
        {/* ------------------------------------------------------------- */}
        {secondaryTab === "requirements" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {isLoadingRequirements ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <p className="text-xs">Loading requirements matrix & traceability...</p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Secondary Subsystem Tab 3: GitHub Repository Evidence         */}
        {/* ------------------------------------------------------------- */}
        {secondaryTab === "repository" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {isLoadingRepository ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-xs">Loading repository files & code evidence...</p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Secondary Subsystem Tab 4: Structured Understanding           */}
        {/* ------------------------------------------------------------- */}
        {secondaryTab === "understanding" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {isLoadingUnderstanding ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-xs">Loading 11-dimension project understanding...</p>
              </div>
            ) : (
              <ProjectUnderstandingCard
                projectId={project.id}
                initialUnderstanding={understanding}
                onUnderstandingUpdated={(updated) => setUnderstanding(updated)}
              />
            )}
          </div>
        )}
      </section>

      {/* ============================================================= */}
      {/* DRAWERS & MODALS                                              */}
      {/* ============================================================= */}
      {/* Finding Detail Progressive Disclosure Drawer */}
      <FindingDetailDrawer
        projectId={project.id}
        findingId={selectedFindingId}
        onClose={() => setSelectedFindingId(null)}
        onOpenRequirementEvidence={(reqId) => {
          setSelectedFindingId(null);
          setSelectedRequirementId(reqId);
        }}
      />

      {/* Requirement Evidence Drawer (CP6 Traceability Inspection) */}
      <RequirementEvidenceDrawer
        projectId={project.id}
        requirementId={selectedRequirementId}
        onClose={() => setSelectedRequirementId(null)}
      />
    </div>
  );
};
