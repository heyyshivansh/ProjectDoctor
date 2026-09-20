import React, { useEffect, useState } from "react";
import { ProjectListItem } from "@/types/project";
import { DiagnosisStatus } from "@/types/diagnosis";
import { getProjectDiagnosis } from "@/services/diagnosis";
import { RecentProjectCard } from "./RecentProjectCard";

interface RecentProjectsDeckProps {
  projects: ProjectListItem[];
}

export const RecentProjectsDeck: React.FC<RecentProjectsDeckProps> = ({ projects }) => {
  const visibleProjects = projects.slice(0, 4);
  const [diagnosisMap, setDiagnosisMap] = useState<Record<string, DiagnosisStatus | null>>({});

  useEffect(() => {
    let isMounted = true;

    // Asynchronously hydrate diagnosis status without blocking the initial screen
    const hydrateDiagnoses = async () => {
      const promises = visibleProjects.map(async (p) => {
        try {
          const diag = await getProjectDiagnosis(p.id);
          return { id: p.id, status: diag.status };
        } catch {
          // If diagnosis not yet run or 404, omit badge cleanly
          return { id: p.id, status: null };
        }
      });

      const results = await Promise.allSettled(promises);
      if (!isMounted) return;

      const newMap: Record<string, DiagnosisStatus | null> = {};
      results.forEach((res) => {
        if (res.status === "fulfilled" && res.value) {
          newMap[res.value.id] = res.value.status;
        }
      });
      setDiagnosisMap(newMap);
    };

    if (visibleProjects.length > 0) {
      hydrateDiagnoses();
    }

    return () => {
      isMounted = false;
    };
  }, [projects]);

  if (visibleProjects.length === 0) {
    return null;
  }

  return (
    <section aria-label="Recent Projects" className="w-full max-w-2xl mx-auto mt-12 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recent Projects
        </h2>
        <span className="text-xs text-slate-400 font-normal">
          {projects.length} {projects.length === 1 ? "project" : "projects"} total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleProjects.map((project) => (
          <RecentProjectCard
            key={project.id}
            project={project}
            diagnosisStatus={diagnosisMap[project.id]}
          />
        ))}
      </div>
    </section>
  );
};
