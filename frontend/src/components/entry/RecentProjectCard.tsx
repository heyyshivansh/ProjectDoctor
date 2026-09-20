import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ProjectListItem } from "@/types/project";
import { DiagnosisStatus } from "@/types/diagnosis";
import { DiagnosisStateIndicator } from "@/components/studio/DiagnosisStateIndicator";
import { FileText, ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentProjectCardProps {
  project: ProjectListItem;
  diagnosisStatus?: DiagnosisStatus | null;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export const RecentProjectCard: React.FC<RecentProjectCardProps> = ({
  project,
  diagnosisStatus,
  className,
}) => {
  const navigate = useNavigate();

  const handleSelect = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect();
    }
  };

  return (
    <motion.div
      layoutId={`project-card-${project.id}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open studio for project: ${project.title}`}
      className={cn(
        "group relative flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm",
        "hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
            {project.title}
          </h3>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>

        {diagnosisStatus && diagnosisStatus !== "not_analyzed" && (
          <div>
            <DiagnosisStateIndicator status={diagnosisStatus} size="sm" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatRelativeTime(project.updated_at || project.created_at)}</span>
        </div>

        {project.artifact_count > 0 && (
          <div className="flex items-center gap-1 text-slate-500 font-normal">
            <FileText className="w-3 h-3 text-slate-400" />
            <span>
              {project.artifact_count} {project.artifact_count === 1 ? "doc" : "docs"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
