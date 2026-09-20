import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { QualitativeStatusBadge } from "@/components/shared/QualitativeStatusBadge";
import { DiagnosisStatus } from "@/types/diagnosis";

interface StudioHeaderProps {
  projectTitle: string;
  diagnosisStatus?: DiagnosisStatus | string;
  isReevaluating?: boolean;
  onReevaluate?: () => void;
}

/**
 * StudioHeader: Clean top navigation bar for Diagnostic Studio.
 * Shows project identity, qualitative status badge, and re-evaluation trigger.
 */
export const StudioHeader: React.FC<StudioHeaderProps> = ({
  projectTitle,
  diagnosisStatus,
  isReevaluating = false,
  onReevaluate,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#111317]/90 backdrop-blur-md border-b border-[#2c303a] px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between transition-colors">
      {/* Left: Back Link + Project Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-mono text-[#888e9b] hover:text-[#f2efe9] transition-colors py-1 px-1.5 -ml-1 rounded-lg"
          aria-label="Return to Entry"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Projects</span>
        </Link>

        <span className="text-[#2c303a] font-mono">/</span>

        <h1 className="text-sm sm:text-base font-display font-medium text-[#f2efe9] truncate max-w-[130px] sm:max-w-xs md:max-w-md">
          {projectTitle}
        </h1>
      </div>

      {/* Right: Qualitative Status + Re-evaluate action */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {diagnosisStatus && (
          <QualitativeStatusBadge status={diagnosisStatus} size="sm" />
        )}

        {onReevaluate && (
          <button
            type="button"
            onClick={onReevaluate}
            disabled={isReevaluating}
            className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-[#2c303a] text-[#888e9b] bg-[#181a1f] hover:text-[#f2efe9] hover:border-[#d4924f]/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isReevaluating ? "animate-spin text-[#d4924f]" : "text-[#888e9b]"}`}
            />
            <span className="hidden sm:inline">Re-evaluate</span>
          </button>
        )}
      </div>
    </header>
  );
};
