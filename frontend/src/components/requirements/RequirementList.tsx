import React, { useState, useMemo } from "react";
import { Requirement } from "@/types/requirement";
import { RequirementTraceabilitySummary, TraceabilityStatus } from "@/types/traceability";
import {
  Search,
  ChevronRight,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RequirementListProps {
  requirements: Requirement[];
  traceabilityMap?: Record<string, RequirementTraceabilitySummary>;
  hasRepository?: boolean;
  onSelectRequirement: (requirementId: string) => void;
}

export const RequirementList: React.FC<RequirementListProps> = ({
  requirements,
  traceabilityMap = {},
  hasRepository: _hasRepository = false,
  onSelectRequirement,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTraceStatus, setSelectedTraceStatus] = useState<string>("all");

  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.requirement_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "ambiguous" && r.is_ambiguous) ||
        r.category === selectedCategory;

      const trace = traceabilityMap[r.requirement_id] || traceabilityMap[r.id];
      const traceStatus: TraceabilityStatus = trace ? trace.status : "unmatched";

      const matchesTraceStatus =
        selectedTraceStatus === "all" || traceStatus === selectedTraceStatus;

      return matchesSearch && matchesCategory && matchesTraceStatus;
    });
  }, [requirements, searchQuery, selectedCategory, selectedTraceStatus, traceabilityMap]);

  const getTraceabilityBadge = (status: TraceabilityStatus) => {
    switch (status) {
      case "candidate_with_tests":
        return {
          label: "Traced with Tests",
          classes: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
          icon: CheckCircle2,
        };
      case "candidate":
        return {
          label: "Candidate Code",
          classes: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
          icon: FileCode,
        };
      case "ambiguous":
        return {
          label: "Ambiguous Evidence",
          classes: "bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30",
          icon: AlertTriangle,
        };
      case "unmatched":
      default:
        return {
          label: "No Code Match",
          classes: "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)]",
          icon: Layers,
        };
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Search & Filter Controls */}
      <div className="p-4 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)] space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pd-text-muted)]" />
          <input
            type="text"
            placeholder="Search specification requirements by ID, title, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[var(--pd-canvas)] border border-[var(--pd-hairline)] text-sm text-[var(--pd-text-primary)] placeholder-[var(--pd-text-muted)] focus:outline-none focus:border-[var(--pd-accent)] font-sans"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--pd-text-muted)] mr-1">
            Category:
          </span>
          {["all", "functional", "security", "performance", "interface", "non_functional"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono rounded-lg transition-colors",
                  selectedCategory === cat
                    ? "bg-[var(--pd-accent)] text-white font-semibold"
                    : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] border border-[var(--pd-hairline)]"
                )}
              >
                {cat === "all" ? "All" : cat.replace("_", " ")}
              </button>
            )
          )}

          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--pd-text-muted)] ml-2 mr-1">
            Trace:
          </span>
          {[
            { id: "all", label: "All" },
            { id: "candidate_with_tests", label: "With Tests" },
            { id: "candidate", label: "Candidate" },
            { id: "unmatched", label: "Unmatched" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedTraceStatus(item.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-mono rounded-lg transition-colors",
                selectedTraceStatus === item.id
                  ? "bg-[var(--pd-accent)]/20 text-[var(--pd-accent)] border border-[var(--pd-accent)]/40 font-semibold"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] border border-[var(--pd-hairline)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements Specimen Cards */}
      {filteredRequirements.length === 0 ? (
        <div className="p-12 text-center bg-[var(--pd-surface)] border border-[var(--pd-hairline)] rounded-xl space-y-2">
          <Layers className="h-8 w-8 text-[var(--pd-text-muted)] mx-auto" />
          <p className="text-sm font-sans font-medium text-[var(--pd-text-primary)]">No requirements match your filter</p>
          <p className="text-xs font-mono text-[var(--pd-text-muted)]">
            Try adjusting your search query or category filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequirements.map((req) => {
            const trace = traceabilityMap[req.requirement_id] || traceabilityMap[req.id];
            const traceStatus: TraceabilityStatus = trace ? trace.status : "unmatched";
            const badge = getTraceabilityBadge(traceStatus);
            const BadgeIcon = badge.icon;

            const candidateFilesCount = trace?.candidate_files?.length ?? trace?.implementation_count ?? 0;
            const matchingTestsCount = trace?.test_files?.length ?? trace?.test_count ?? 0;

            return (
              <div
                key={req.id}
                onClick={() => onSelectRequirement(req.requirement_id)}
                className="group p-5 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)] hover:border-[var(--pd-accent)]/40 hover:bg-[var(--pd-surface-raised)] transition-all cursor-pointer space-y-3"
              >
                {/* Header Row: ID, Category, Traceability Status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--pd-surface-raised)] text-[var(--pd-accent)] border border-[var(--pd-hairline)]">
                      {req.requirement_id}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border border-[var(--pd-hairline)] capitalize">
                      {req.category}
                    </span>
                    {req.priority && (
                      <span className="text-[11px] font-mono text-[var(--pd-text-muted)]">
                        Priority: {req.priority}
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
                      badge.classes
                    )}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-display font-medium text-[var(--pd-text-primary)] group-hover:text-[var(--pd-accent)] transition-colors">
                    {req.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans text-[var(--pd-text-body)] leading-relaxed mt-1 line-clamp-2">
                    {req.description}
                  </p>
                </div>

                {/* Evidence Proof Grid */}
                <div className="pt-2 border-t border-[var(--pd-hairline)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[var(--pd-text-muted)]">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[var(--pd-accent)]" />
                      <span>Specification: Document Citation</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{candidateFilesCount} Implementation {candidateFilesCount === 1 ? "File" : "Files"}</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{matchingTestsCount} Matching {matchingTestsCount === 1 ? "Test" : "Tests"}</span>
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1 text-[11px] text-[var(--pd-accent)] group-hover:translate-x-0.5 transition-transform ml-auto font-medium">
                    <span>Inspect Traceability</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
