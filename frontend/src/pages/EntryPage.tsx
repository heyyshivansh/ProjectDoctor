import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { getProjects } from "@/services/projects";
import { ProjectListItem } from "@/types/project";
import { ProjectApertureInput, ProjectApertureSubmitData } from "@/components/entry/ProjectApertureInput";
import { RecentSpecimensDeck } from "@/components/entry/RecentSpecimensDeck";
import { DiagnosticInstrument } from "@/components/analysis/DiagnosticInstrument";

/**
 * EntryPage: The minimal invitational entry experience for Project Doctor.
 * Replaces dashboard complexity with a commanding editorial question:
 * "What are you building?" in Fraunces typography.
 */
export const EntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [activeSubmitData, setActiveSubmitData] = useState<ProjectApertureSubmitData | null>(null);

  const fetchRecentProjects = useCallback(async () => {
    try {
      const res = await getProjects(0, 4);
      setProjects(res.items || []);
    } catch {
      // Quiet fallback if backend is momentarily unreachable
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  const handleSelectProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-160px)] py-8 sm:py-16 px-4">
      <div className="w-full max-w-3xl mx-auto space-y-12 text-center">
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
          ) : (
            <motion.div
              key="entry-aperture"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              {/* Editorial Invitational Headline */}
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20232a] border border-[#262a33] text-xs font-mono text-[#d4924f]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4924f] animate-pulse" />
                  <span>Technical Project Evaluation Platform</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#f2efe9] leading-[1.12]">
                  What are you building?
                </h1>
                <p className="text-sm sm:text-base text-[#888e9b] font-sans font-normal leading-relaxed max-w-xl mx-auto px-2">
                  Provide your project's objectives, specification documents, or repository link to begin deep architectural diagnosis.
                </p>
              </div>

              {/* Central Project Input Aperture */}
              <ProjectApertureInput onSubmit={(data) => setActiveSubmitData(data)} />

              {/* Returning Users: Tactile Recent Project Specimens */}
              <RecentSpecimensDeck
                projects={projects}
                onSelectProject={handleSelectProject}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
