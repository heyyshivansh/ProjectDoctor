import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ProjectApertureSubmitData } from "@/components/entry/ProjectApertureInput";
import { createProject, uploadArtifact } from "@/services/projects";
import { connectRepository } from "@/services/repository";
import { batchExtractDocuments } from "@/services/documents";
import { generateProjectDiagnosis } from "@/services/diagnosis";
import { TelemetryStep, StepState } from "./TelemetryStep";
import { AnalysisFailureRecovery } from "./AnalysisFailureRecovery";
import { TactileSurface } from "@/components/shared/TactileSurface";
import { Project } from "@/types/project";

interface DiagnosticInstrumentProps {
  data: ProjectApertureSubmitData;
  onCancel?: () => void;
}

interface PipelineStep {
  id: string;
  label: string;
  detail?: string;
  state: StepState;
  skipped?: boolean;
}

/**
 * DiagnosticInstrument: Active in-place scan surface.
 * Executes observable asynchronous pipeline steps with truthful telemetry
 * based strictly on real backend responses.
 */
export const DiagnosticInstrument: React.FC<DiagnosticInstrumentProps> = ({
  data,
}) => {
  const navigate = useNavigate();
  const hasStartedRef = useRef(false);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedStepIndex, setFailedStepIndex] = useState<number | null>(null);

  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: "create",
      label: "Register Project Entity",
      state: "waiting",
    },
    {
      id: "artifacts",
      label: "Upload Attached Specifications",
      state: "waiting",
      skipped: data.files.length === 0,
    },
    {
      id: "repository",
      label: "Connect GitHub Repository",
      state: "waiting",
      skipped: !data.githubRepoUrl,
    },
    {
      id: "extract",
      label: "Extract Specification Evidence",
      state: "waiting",
      skipped: data.files.length === 0,
    },
    {
      id: "diagnosis",
      label: "Synthesize Multi-Checkpoint Diagnosis",
      state: "waiting",
    },
  ]);

  const updateStep = (index: number, state: StepState, detail?: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, state, detail } : step))
    );
  };

  const runPipeline = useCallback(
    async (startIndex = 0, existingProjectId?: string) => {
      let currentId = existingProjectId || projectId;
      setErrorMessage(null);
      setFailedStepIndex(null);

      // STEP 0: Create Project Entity
      if (startIndex <= 0) {
        updateStep(0, "in_progress", "Creating project entity in database...");
        try {
          const proj = await createProject({
            title: data.title,
            problem_statement: data.problemStatement,
            description: data.description,
            github_repo_url: data.githubRepoUrl,
          });
          currentId = proj.id;
          setProjectId(proj.id);
          setCreatedProject(proj);
          updateStep(0, "completed", `Created project entity ${proj.id.slice(0, 8)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create project";
          updateStep(0, "error", msg);
          setErrorMessage(msg);
          setFailedStepIndex(0);
          return;
        }
      }

      if (!currentId) return;

      // STEP 1: Upload Artifacts
      if (startIndex <= 1) {
        if (data.files.length > 0) {
          updateStep(1, "in_progress", `Uploading ${data.files.length} specification file(s)...`);
          try {
            for (const file of data.files) {
              await uploadArtifact(currentId, file);
            }
            updateStep(1, "completed", `Uploaded ${data.files.length} document artifact(s)`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Artifact upload failed";
            updateStep(1, "error", msg);
            setErrorMessage(msg);
            setFailedStepIndex(1);
            return;
          }
        } else {
          updateStep(1, "completed", "No specification documents attached (skipped)");
        }
      }

      // STEP 2: Connect Repository
      if (startIndex <= 2) {
        if (data.githubRepoUrl) {
          updateStep(2, "in_progress", `Connecting to ${data.githubRepoUrl}...`);
          try {
            const repoRes = await connectRepository(currentId, {
              repo_url: data.githubRepoUrl,
            });
            updateStep(
              2,
              "completed",
              `Connected repository ${repoRes.repo_name || "successfully"}`
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Repository connection failed";
            updateStep(2, "error", msg);
            setErrorMessage(msg);
            setFailedStepIndex(2);
            return;
          }
        } else {
          updateStep(2, "completed", "No GitHub repository provided (skipped)");
        }
      }

      // STEP 3: Document Extraction
      if (startIndex <= 3) {
        if (data.files.length > 0) {
          updateStep(3, "in_progress", "Extracting specification text and sections...");
          try {
            await batchExtractDocuments(currentId);
            updateStep(3, "completed", "Specification evidence extracted");
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Document extraction failed";
            updateStep(3, "error", msg);
            setErrorMessage(msg);
            setFailedStepIndex(3);
            return;
          }
        } else {
          updateStep(3, "completed", "No documents to extract (skipped)");
        }
      }

      // STEP 4: Diagnosis Generation
      if (startIndex <= 4) {
        updateStep(4, "in_progress", "Evaluating architectural findings and qualitative status...");
        try {
          await generateProjectDiagnosis(currentId, true);
          updateStep(4, "completed", "Diagnosis generated successfully");

          // Short settle pause before opening the Studio
          setTimeout(() => {
            navigate(`/projects/${currentId}`);
          }, 600);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Diagnosis synthesis failed";
          updateStep(4, "error", msg);
          setErrorMessage(msg);
          setFailedStepIndex(4);
          return;
        }
      }
    },
    [data, navigate, projectId]
  );

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      runPipeline(0);
    }
  }, [runPipeline]);

  const handleRetry = () => {
    if (failedStepIndex !== null) {
      runPipeline(failedStepIndex, projectId || undefined);
    }
  };

  const handleContinueWithout = () => {
    if (failedStepIndex !== null && projectId) {
      if (failedStepIndex < steps.length - 1) {
        runPipeline(failedStepIndex + 1, projectId);
      } else {
        navigate(`/projects/${projectId}`);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <TactileSurface elevation="floating" className="p-6 sm:p-8 bg-[var(--pd-surface)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] rounded-2xl">
        {/* Header */}
        <div className="space-y-2 mb-6 pb-4 border-b border-[var(--pd-hairline)] text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-[11px] font-mono uppercase tracking-wider text-[var(--pd-accent)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--pd-accent)] animate-pulse" />
            <span>Active Diagnostic Instrument</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-medium text-[var(--pd-text-primary)]">
            {createdProject ? createdProject.title : data.title}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--pd-text-muted)] font-sans">
            Executing deterministic technical analysis across submitted project artifacts
          </p>
        </div>

        {/* Observable Step Telemetry */}
        <div className="space-y-2.5">
          {steps.map((step, idx) => (
            <TelemetryStep
              key={step.id}
              index={idx}
              label={step.label}
              detail={step.detail}
              state={step.state}
            />
          ))}
        </div>

        {/* Actionable Error Recovery */}
        {errorMessage && failedStepIndex !== null && (
          <AnalysisFailureRecovery
            errorMessage={errorMessage}
            onRetry={handleRetry}
            onContinue={handleContinueWithout}
            continueLabel={
              projectId && failedStepIndex === steps.length - 1
                ? "Open Studio Regardless"
                : "Skip & Continue Next Step"
            }
          />
        )}
      </TactileSurface>
    </motion.div>
  );
};
