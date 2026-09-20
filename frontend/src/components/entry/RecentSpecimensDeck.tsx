import React from "react";
import { motion } from "motion/react";
import { ProjectListItem } from "@/types/project";
import { RecentProjectSpecimen } from "./RecentProjectSpecimen";

interface RecentSpecimensDeckProps {
  projects: ProjectListItem[];
  onSelectProject: (projectId: string) => void;
}

/**
 * RecentSpecimensDeck: Displays up to 4 recent project specimens.
 * Staggered entrance animation without overwhelming the initial invitation screen.
 * Returns null if no projects exist (zero empty state noise).
 */
export const RecentSpecimensDeck: React.FC<RecentSpecimensDeckProps> = ({
  projects,
  onSelectProject,
}) => {
  if (!projects || projects.length === 0) {
    return null;
  }

  const displayProjects = projects.slice(0, 4);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-8 pb-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#9aa0aa]">
          Recent Project Dossiers
        </h2>
        <span className="text-xs font-mono text-[#5c626f]">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {displayProjects.map((project) => (
          <motion.div key={project.id} variants={itemVariants}>
            <RecentProjectSpecimen
              project={project}
              onSelect={onSelectProject}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
