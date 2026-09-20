import React, { useEffect, useState } from "react";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { ProjectListItem } from "@/types/project";
import { DiagnosisStatus } from "@/types/diagnosis";
import { getProjectDiagnosis } from "@/services/diagnosis";
import { TactileSurface } from "@/components/shared/TactileSurface";
import { QualitativeStatusBadge } from "@/components/shared/QualitativeStatusBadge";

interface RecentProjectSpecimenProps {
  project: ProjectListItem;
  onSelect: (projectId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Updated recently";
    if (diffHours === 1) return "1h ago";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "Recently";
  }
}

/**
 * RecentProjectSpecimen: Tactile card representing a recent project dossier.
 * Shows only essential human-level metadata and settled qualitative diagnosis status.
 * Strictly omits database UUIDs, commit SHAs, and raw forensic hashes.
 */
export const RecentProjectSpecimen: React.FC<RecentProjectSpecimenProps> = ({
  project,
  onSelect,
}) => {
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    getProjectDiagnosis(project.id)
      .then((diag) => {
        if (isMounted && diag && diag.status && diag.status !== "not_analyzed") {
          setDiagnosisStatus(diag.status);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [project.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(project.id);
    }
  };

  return (
    <TactileSurface
      interactive
      elevation="raised"
      layoutId={`project-specimen-${project.id}`}
      onClick={() => onSelect(project.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open project ${project.title}`}
      className="p-5 flex flex-col justify-between group h-full bg-[var(--pd-surface)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] hover:border-[var(--pd-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent)]"
    >
      <div className="space-y-3 text-left">
        {/* Top Row: Settled qualitative badge or quiet indicator */}
        <div className="flex items-center justify-between gap-2 min-h-[26px]">
          {diagnosisStatus ? (
            <QualitativeStatusBadge status={diagnosisStatus} size="sm" />
          ) : (
            <span className="text-xs font-mono text-[var(--pd-text-muted)]">Ready for review</span>
          )}
          <span className="text-[var(--pd-text-muted)] group-hover:text-[var(--pd-accent)] transition-colors">
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Project Title in Fraunces / font-display */}
        <h3 className="text-base sm:text-lg font-display font-medium text-[var(--pd-text-primary)] line-clamp-1 group-hover:text-[var(--pd-accent)] transition-colors">
          {project.title}
        </h3>
      </div>

      {/* Bottom Metadata Row */}
      <div className="pt-3.5 mt-3 border-t border-[var(--pd-hairline)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)]">
        <span className="flex items-center gap-1.5 truncate">
          <FileText className="w-3.5 h-3.5 text-[var(--pd-text-muted)]" />
          {project.artifact_count === 1
            ? "1 specification"
            : `${project.artifact_count} specifications`}
        </span>
        <span className="flex items-center gap-1 text-[var(--pd-text-muted)] shrink-0">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(project.updated_at)}
        </span>
      </div>
    </TactileSurface>
  );
};
