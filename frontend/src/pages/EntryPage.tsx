import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { getProjects } from "@/services/projects";
import { ProjectListItem } from "@/types/project";
import { ProjectApertureInput, ProjectApertureSubmitData } from "@/components/entry/ProjectApertureInput";
import { RecentSpecimensDeck } from "@/components/entry/RecentSpecimensDeck";
import { DiagnosticInstrument } from "@/components/analysis/DiagnosticInstrument";
import { cn } from "@/lib/utils";

const IridescentRibbon = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-20 dark:opacity-25 motion-safe:animate-[wave_60s_linear_infinite] motion-reduce:animate-none"
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="iridescent-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path
          d="M 0 250 C 200 100 300 400 500 250 C 700 100 800 400 1000 250"
          fill="none"
          stroke="url(#iridescent-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          filter="blur(16px)"
        />
        <path
          d="M 0 300 C 200 150 300 450 500 300 C 700 150 800 450 1000 300"
          fill="none"
          stroke="url(#iridescent-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          filter="blur(12px)"
          opacity="0.7"
        />
      </svg>
      <style>{`
        @keyframes wave {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const PipelineVisualization = () => {
  const steps = ["Documents", "Code", "Evidence", "Diagnosis"];
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 opacity-70">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <span className="text-[var(--pd-text-muted)] text-xs font-mono uppercase tracking-widest">{step}</span>
          {idx < steps.length - 1 && (
            <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent via-[var(--pd-hairline)] to-transparent" />
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
      <IridescentRibbon />
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--pd-surface)]/80 border border-[var(--pd-hairline)] text-xs font-medium text-[var(--pd-text-primary)] shadow-sm backdrop-blur-sm">
                  <span className="text-[var(--pd-accent)]">✦</span> AI-Powered Technical Project Evaluation
                </div>
                
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[var(--pd-text-primary)] leading-[1.15]">
                  See what your project is really saying.
                </h1>
                
                <p className="text-base sm:text-lg text-[var(--pd-text-body)] font-sans font-normal leading-relaxed max-w-xl mx-auto">
                  Project Doctor finds hidden risks, missing details and real issues across your project — from documents, to code, to evidence, to diagnosis.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                  <button
                    onClick={handleStartDiagnosis}
                    className="bg-[var(--pd-accent)] text-white rounded-full px-8 py-3.5 font-medium hover:bg-[#4F46E5] transition-colors shadow-sm flex items-center gap-2"
                  >
                    Start diagnosis <span aria-hidden="true">&rarr;</span>
                  </button>
                  <button
                    onClick={handleViewExample}
                    disabled={projects.length === 0}
                    className={cn(
                      "border border-[var(--pd-hairline)] text-[var(--pd-text-body)] rounded-full px-8 py-3.5 font-medium transition-colors flex items-center gap-2",
                      projects.length > 0 ? "hover:border-[var(--pd-accent)] hover:text-[var(--pd-text-primary)]" : "opacity-50 cursor-not-allowed"
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
            className="pt-16 border-t border-[var(--pd-hairline)]"
          >
            <div className="mb-6 text-left">
              <h2 className="text-lg font-display text-[var(--pd-text-primary)]">Recent Projects</h2>
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
