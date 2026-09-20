import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AtmosphericSurface } from "@/components/common/AtmosphericSurface";
import { AsyncStepFeedback, StepState } from "@/components/common/AsyncStepFeedback";
import { createProject, uploadArtifact } from "@/services/projects";
import { connectRepository } from "@/services/repository";
import { batchExtractDocuments } from "@/services/documents";
import { generateProjectDiagnosis } from "@/services/diagnosis";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export interface AnalysisInputData {
  title: string;
  description: string;
  problemStatement: string;
  files: File[];
  githubUrl?: string;
}

interface AnalysisStageProps {
  data: AnalysisInputData;
  onEditInputs: () => void;
}

export const AnalysisStage: React.FC<AnalysisStageProps> = ({ data, onEditInputs }) => {
  const navigate = useNavigate();

  // Preserved Project ID once created
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const projectIdRef = useRef<string | null>(null);

  // Step States
  const [createStep, setCreateStep] = useState<{ state: StepState; error?: string }>({
    state: "idle",
  });
  const [uploadStep, setUploadStep] = useState<{ state: StepState; error?: string }>({
    state: data.files.length > 0 ? "idle" : "skipped",
  });
  const [repoStep, setRepoStep] = useState<{ state: StepState; error?: string }>({
    state: data.githubUrl ? "idle" : "skipped",
  });
  const [extractStep, setExtractStep] = useState<{ state: StepState; error?: string }>({
    state: data.files.length > 0 ? "idle" : "skipped",
  });
  const [diagStep, setDiagStep] = useState<{ state: StepState; error?: string }>({
    state: "idle",
  });

  const isRunningRef = useRef(false);

  // Execute Step 1: Create Project
  const runCreateProject = useCallback(async (): Promise<string | null> => {
    if (projectIdRef.current) return projectIdRef.current;

    setCreateStep({ state: "running" });
    try {
      const project = await createProject({
        title: data.title.trim(),
        description: data.description.trim(),
        problem_statement: data.problemStatement.trim() || data.description.trim(),
        github_repo_url: data.githubUrl?.trim() || undefined,
      });

      projectIdRef.current = project.id;
      setCreatedProjectId(project.id);
      setCreateStep({ state: "success" });
      return project.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register project record";
      setCreateStep({ state: "error", error: msg });
      return null;
    }
  }, [data]);

  // Execute Step 2: Upload Artifacts
  const runUploadArtifacts = useCallback(async (projectId: string): Promise<boolean> => {
    if (data.files.length === 0) {
      setUploadStep({ state: "skipped" });
      return true;
    }

    setUploadStep({ state: "running" });
    try {
      for (const file of data.files) {
        await uploadArtifact(projectId, file, "specification");
      }
      setUploadStep({ state: "success" });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload project materials";
      setUploadStep({ state: "error", error: msg });
      return false;
    }
  }, [data.files]);

  // Execute Step 3: Connect Repository
  const runConnectRepo = useCallback(async (projectId: string): Promise<boolean> => {
    if (!data.githubUrl || !data.githubUrl.trim()) {
      setRepoStep({ state: "skipped" });
      return true;
    }

    setRepoStep({ state: "running" });
    try {
      await connectRepository(projectId, {
        repo_url: data.githubUrl.trim(),
      });
      setRepoStep({ state: "success" });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect GitHub repository";
      setRepoStep({ state: "error", error: msg });
      return false;
    }
  }, [data.githubUrl]);

  // Execute Step 4: Batch Extract Documents
  const runExtractDocuments = useCallback(async (projectId: string): Promise<boolean> => {
    if (data.files.length === 0) {
      setExtractStep({ state: "skipped" });
      return true;
    }

    setExtractStep({ state: "running" });
    try {
      await batchExtractDocuments(projectId);
      setExtractStep({ state: "success" });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to extract document requirements";
      setExtractStep({ state: "error", error: msg });
      return false;
    }
  }, [data.files.length]);

  // Execute Step 5: Generate Diagnosis
  const runDiagnosis = useCallback(async (projectId: string): Promise<boolean> => {
    setDiagStep({ state: "running" });
    try {
      await generateProjectDiagnosis(projectId, true);
      setDiagStep({ state: "success" });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to synthesize diagnosis";
      setDiagStep({ state: "error", error: msg });
      return false;
    }
  }, []);

  // Main Pipeline Runner
  const runPipeline = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Step 1: Create Project
    let pId = projectIdRef.current;
    if (!pId) {
      pId = await runCreateProject();
      if (!pId) {
        isRunningRef.current = false;
        return;
      }
    }

    // Step 2: Upload Files (if any)
    const uploadOk = await runUploadArtifacts(pId);
    if (!uploadOk && uploadStep.state === "error") {
      // Pause on upload error so user can retry or continue
      isRunningRef.current = false;
      return;
    }

    // Step 3: Connect GitHub (if any)
    const repoOk = await runConnectRepo(pId);
    if (!repoOk && repoStep.state === "error") {
      // Pause on repo error so user can retry or continue
      isRunningRef.current = false;
      return;
    }

    // Step 4: Extract Documents (if files exist and uploaded)
    if (data.files.length > 0) {
      const extractOk = await runExtractDocuments(pId);
      if (!extractOk && extractStep.state === "error") {
        isRunningRef.current = false;
        return;
      }
    }

    // Step 5: Generate Diagnosis
    const diagOk = await runDiagnosis(pId);
    if (!diagOk) {
      isRunningRef.current = false;
      return;
    }

    // All steps done: transition to Project Studio
    isRunningRef.current = false;
    setTimeout(() => {
      navigate(`/projects/${pId}`);
    }, 600);
  }, [
    runCreateProject,
    runUploadArtifacts,
    runConnectRepo,
    runExtractDocuments,
    runDiagnosis,
    data.files.length,
    uploadStep.state,
    repoStep.state,
    extractStep.state,
    navigate,
  ]);

  useEffect(() => {
    runPipeline();
  }, [runPipeline]);

  // Handler to continue past optional failures
  const handleProceedAfterUploadError = async () => {
    setUploadStep({ state: "skipped" });
    const pId = projectIdRef.current;
    if (!pId) return;

    // Resume pipeline
    const repoOk = await runConnectRepo(pId);
    if (!repoOk) return;

    const diagOk = await runDiagnosis(pId);
    if (diagOk) {
      navigate(`/projects/${pId}`);
    }
  };

  const handleProceedAfterRepoError = async () => {
    setRepoStep({ state: "skipped" });
    const pId = projectIdRef.current;
    if (!pId) return;

    if (data.files.length > 0 && extractStep.state === "idle") {
      const extractOk = await runExtractDocuments(pId);
      if (!extractOk) return;
    }

    const diagOk = await runDiagnosis(pId);
    if (diagOk) {
      navigate(`/projects/${pId}`);
    }
  };

  const handleProceedAfterExtractError = async () => {
    setExtractStep({ state: "skipped" });
    const pId = projectIdRef.current;
    if (!pId) return;

    const diagOk = await runDiagnosis(pId);
    if (diagOk) {
      navigate(`/projects/${pId}`);
    }
  };

  const handleGoToStudioWithoutDiagnosis = () => {
    const pId = projectIdRef.current;
    if (pId) {
      navigate(`/projects/${pId}`);
    }
  };

  const isAllComplete =
    createStep.state === "success" &&
    diagStep.state === "success";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-2xl mx-auto"
      role="region"
      aria-label="Project Analysis Progress"
    >
      <AtmosphericSurface variant="active" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Project Doctor
              </span>
              {isAllComplete && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  Complete
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              {data.title || "New Project Analysis"}
            </h2>
          </div>

          {!createdProjectId && createStep.state === "error" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEditInputs}
              className="text-xs text-slate-500 hover:text-slate-900 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Edit Inputs
            </Button>
          )}
        </div>

        <div className="space-y-2.5" aria-live="polite">
          <AsyncStepFeedback
            label="Creating project record"
            state={createStep.state}
            errorMessage={createStep.error}
            onRetry={runPipeline}
            retryLabel="Retry creation"
          />

          {data.files.length > 0 && (
            <AsyncStepFeedback
              label={`Uploading project materials (${data.files.length} ${
                data.files.length === 1 ? "file" : "files"
              })`}
              state={uploadStep.state}
              errorMessage={uploadStep.error}
              onRetry={() => projectIdRef.current && runUploadArtifacts(projectIdRef.current)}
              onContinue={handleProceedAfterUploadError}
              continueLabel="Continue without files"
            />
          )}

          {data.githubUrl && (
            <AsyncStepFeedback
              label="Connecting GitHub repository"
              state={repoStep.state}
              errorMessage={repoStep.error}
              onRetry={() => projectIdRef.current && runConnectRepo(projectIdRef.current)}
              onContinue={handleProceedAfterRepoError}
              continueLabel="Continue without repository"
            />
          )}

          {data.files.length > 0 && (
            <AsyncStepFeedback
              label="Extracting document requirements & architecture"
              state={extractStep.state}
              errorMessage={extractStep.error}
              onRetry={() => projectIdRef.current && runExtractDocuments(projectIdRef.current)}
              onContinue={handleProceedAfterExtractError}
              continueLabel="Skip extraction"
            />
          )}

          <AsyncStepFeedback
            label="Synthesizing technical diagnosis"
            state={diagStep.state}
            errorMessage={diagStep.error}
            onRetry={() => projectIdRef.current && runDiagnosis(projectIdRef.current)}
            onContinue={createdProjectId ? handleGoToStudioWithoutDiagnosis : undefined}
            continueLabel="Open Project Studio"
          />
        </div>

        {diagStep.state === "error" && createdProjectId && (
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900">
            <span>
              Your project was created safely. You can inspect requirements and repository now, or retry diagnosis.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGoToStudioWithoutDiagnosis}
              className="shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50 text-xs gap-1"
            >
              Open Studio
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}

        {isAllComplete && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 font-medium py-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Opening Project Studio...
          </div>
        )}
      </AtmosphericSurface>
    </motion.div>
  );
};
