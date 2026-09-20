import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { getProjects } from "@/services/projects";
import { ProjectListItem } from "@/types/project";
import { ProjectApertureInput, ProjectApertureSubmitData } from "@/components/entry/ProjectApertureInput";
import { RecentSpecimensDeck } from "@/components/entry/RecentSpecimensDeck";
import { DiagnosticInstrument } from "@/components/analysis/DiagnosticInstrument";
import { cn } from "@/lib/utils";

const PipelineVisualization = () => {
  const steps = ["Documents", "Code", "Evidence", "Diagnosis"];
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 opacity-60">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <span className="text-[var(--pd-text-muted)] text-xs font-mono uppercase tracking-widest">{step}</span>
          {idx < steps.length - 1 && (
            <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent via-[var(--pd-border-hover)] to-transparent" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const EntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [activeSubmitData, setActiveSubmitData] = useState<ProjectApertureSubmitData | null>(null);
  const [showInput, setShowInput] = useState(false);

  const fetchRecentProjects = useCallback(async () => {
    try {
      const res = await getProjects(0, 4);
      setProjects(res.items || []);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  const handleSelectProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleStartDiagnosis = () => {
    setShowInput(true);
  };

  const handleViewExample = () => {
    if (projects.length > 0) {
      navigate(`/projects/${projects[0].id}`);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-160px)] py-8 sm:py-16 px-4 relative overflow-hidden">
      <div className="w-full max-w-4xl mx-auto space-y-12 text-center relative z-10">
        <AnimatePresence mode="wait">
          {activeSubmitData ? (
            <motion.div
              key="analysis-instrument"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <DiagnosticInstrument
                data={activeSubmitData}
                onCancel={() => setActiveSubmitData(null)}
              />
            </motion.div>
          ) : showInput ? (
            <motion.div
              key="entry-aperture"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              <ProjectApertureInput onSubmit={(data) => setActiveSubmitData(data)} />
            </motion.div>
          ) : (
            <motion.div
              key="hero-section"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              <div className="space-y-6 max-w-3xl mx-auto flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--pd-surface)]/80 border border-[var(--pd-border)] text-xs font-medium text-[var(--pd-text-primary)] backdrop-blur-sm">
                  <span className="text-[var(--pd-ai)]">✦</span> AI-Powered Technical Project Evaluation
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-[var(--pd-text-primary)] leading-[1.1]">
                  See what your project is really saying.
                </h1>

                <p className="text-base sm:text-lg text-[var(--pd-text-body)] font-sans font-normal leading-relaxed max-w-xl mx-auto">
                  Project Doctor finds hidden risks, missing details and real issues across your project — from documents, to code, to evidence, to diagnosis.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                  <button
                    onClick={handleStartDiagnosis}
                    className="bg-[var(--pd-ai)] text-white rounded-full px-8 py-3.5 font-medium hover:bg-[var(--pd-ai-hover)] transition-colors shadow-pd-glow-violet flex items-center gap-2"
                  >
                    Start diagnosis <span aria-hidden="true">&rarr;</span>
                  </button>
                  <button
                    onClick={handleViewExample}
                    disabled={projects.length === 0}
                    className={cn(
                      "border border-[var(--pd-border)] text-[var(--pd-text-body)] rounded-full px-8 py-3.5 font-medium transition-all flex items-center gap-2",
                      projects.length > 0 ? "hover:border-[var(--pd-ai)]/50 hover:text-[var(--pd-text-primary)]" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    View example <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>

                <PipelineVisualization />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(!activeSubmitData && !showInput && projects.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-16 border-t border-[var(--pd-border)]"
          >
            <div className="mb-6 text-left">
              <h2 className="text-lg font-display font-semibold text-[var(--pd-text-primary)]">Recent Projects</h2>
            </div>
            <RecentSpecimensDeck
              projects={projects}
              onSelectProject={handleSelectProject}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};
