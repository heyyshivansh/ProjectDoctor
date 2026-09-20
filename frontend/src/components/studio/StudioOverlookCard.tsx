import React from "react";
import { ProjectDetail } from "@/types/project";
import { ProjectDiagnosis } from "@/types/diagnosis";
import { QualitativeStatusBadge } from "@/components/shared/QualitativeStatusBadge";
import { Clock, FileText, Github, Sparkles } from "lucide-react";

interface StudioOverlookCardProps {
  project: ProjectDetail;
  diagnosis: ProjectDiagnosis | null;
}

export const StudioOverlookCard: React.FC<StudioOverlookCardProps> = ({
  project,
  diagnosis,
}) => {
  const status = diagnosis?.status || "not_analyzed";
  const summary = diagnosis?.summary || project.problem_statement || project.description || "Project diagnosis overview pending synthesis.";

  return (
    <div id="scene-overlook" className="w-full scroll-mt-20">
      <div className="p-8 sm:p-12 rounded-2xl bg-[#181a1f] border border-[#2c303a] text-[#f2efe9] shadow-pd-deck relative overflow-hidden text-left">
        {/* Ambient specular corner light */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full opacity-10"
          style={{
            background:
              status === "looks_solid"
                ? "radial-gradient(circle, #56b68b 0%, transparent 70%)"
                : status === "needs_attention"
                ? "radial-gradient(circle, #e5a84b 0%, transparent 70%)"
                : "radial-gradient(circle, #e06c75 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="space-y-6 relative z-10">
          {/* Top metadata kicker: Qualitative state & Evaluation Date */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2c303a]/70">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#888e9b]">
                Diagnostic Overlook
              </span>
              <span className="text-[#2c303a]">•</span>
              <QualitativeStatusBadge status={status} size="md" />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#888e9b]">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {diagnosis?.analyzed_at
                  ? new Date(diagnosis.analyzed_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Latest Evaluation"}
              </span>
            </div>
          </div>

          {/* Project Title */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-display font-medium text-[#f2efe9] tracking-tight leading-[1.12]">
              {project.title}
            </h1>
            <p className="text-base sm:text-xl font-sans text-[#c4c8d0] leading-relaxed max-w-3xl font-normal">
              {summary}
            </p>
          </div>

          {/* Anchor Context Rails */}
          <div className="pt-6 border-t border-[#2c303a]/70 flex flex-wrap items-center gap-6 text-xs font-mono text-[#888e9b]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#d4924f]" />
              <span>
                {project.artifacts?.length || 0}{" "}
                {project.artifacts?.length === 1 ? "Specification Document" : "Specification Documents"}
              </span>
            </div>

            {project.github_repo_url && (
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-[#d4924f]" />
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f2efe9] hover:text-[#d4924f] hover:underline underline-offset-4 transition-colors"
                >
                  {project.github_repo_url.replace("https://github.com/", "")}
                </a>
              </div>
            )}

            {diagnosis?.top_findings && diagnosis.top_findings.length > 0 && (
              <div className="flex items-center gap-2 ml-auto text-[#f2efe9]">
                <Sparkles className="w-3.5 h-3.5 text-[#d4924f]" />
                <span>
                  {diagnosis.top_findings.length} High-Priority{" "}
                  {diagnosis.top_findings.length === 1 ? "Finding" : "Findings"} in Deck
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
