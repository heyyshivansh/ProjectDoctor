import React, { useState, useMemo } from "react";
import { Requirement } from "@/types/requirement";
import { RequirementTraceabilitySummary, TraceabilityStatus } from "@/types/traceability";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Bookmark,
  Layers,
  AlertTriangle,
  User,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FileCode,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface RequirementListProps {
  requirements: Requirement[];
  traceabilityMap?: Record<string, RequirementTraceabilitySummary>;
  hasRepository?: boolean;
  onSelectRequirement: (requirementId: string) => void;
}

export const RequirementList: React.FC<RequirementListProps> = ({
  requirements,
  traceabilityMap = {},
  hasRepository = false,
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

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "security":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "performance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "interface":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "non_functional":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getPriorityBadgeClass = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "";
    }
  };

  const renderTraceabilityBadge = (status?: TraceabilityStatus) => {
    if (!status || !hasRepository) return null;

    switch (status) {
      case "candidate_with_tests":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Candidate Code & Tests Located
          </span>
        );
      case "candidate":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <HelpCircle className="h-3 w-3 text-blue-600" />
            Candidate Code Located (No Tests)
          </span>
        );
      case "ambiguous":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Ambiguous Candidate Evidence
          </span>
        );
      case "unmatched":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            <XCircle className="h-3 w-3 text-slate-400" />
            No Candidate Evidence Found
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter requirements by keyword, ID, or title..."
              className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {[
              { id: "all", label: "All Categories" },
              { id: "functional", label: "Functional" },
              { id: "security", label: "Security" },
              { id: "performance", label: "Performance" },
              { id: "ambiguous", label: "Ambiguous Specs" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Traceability Filter Bar (if repository connected) */}
        {hasRepository && Object.keys(traceabilityMap).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              Trace Status:
            </span>
            {[
              { id: "all", label: "All Statuses" },
              { id: "candidate_with_tests", label: "Candidate Code & Tests" },
              { id: "candidate", label: "Candidate Code (No Tests)" },
              { id: "ambiguous", label: "Ambiguous Evidence" },
              { id: "unmatched", label: "No Candidate Evidence" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedTraceStatus(st.id)}
                className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors ${
                  selectedTraceStatus === st.id
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requirements Cards List */}
      {filteredRequirements.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <Layers className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No requirements found</p>
          <p className="text-xs text-slate-500">
            {requirements.length === 0
              ? "Click 'Extract Requirements' above to analyze specifications and generate atomic requirements."
              : "No requirements match your current search or category/status filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequirements.map((req) => {
            const trace = traceabilityMap[req.requirement_id] || traceabilityMap[req.id];

            return (
              <Card
                key={req.id}
                className="border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
                onClick={() => onSelectRequirement(req.requirement_id)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Bar: IDs, Badges, Status Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {req.requirement_id}
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[11px] capitalize font-semibold ${getCategoryBadgeClass(
                          req.category
                        )}`}
                      >
                        {req.category}
                      </Badge>

                      {req.priority && (
                        <Badge
                          variant="outline"
                          className={`text-[11px] capitalize font-semibold ${getPriorityBadgeClass(
                            req.priority
                          )}`}
                        >
                          {req.priority}
                        </Badge>
                      )}

                      {req.actor && (
                        <Badge
                          variant="outline"
                          className="text-[11px] bg-slate-50 text-slate-600 border-slate-200"
                        >
                          <User className="h-3 w-3 mr-1 text-slate-400" />
                          {req.actor}
                        </Badge>
                      )}

                      {req.is_ambiguous && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          Ambiguous Spec
                        </span>
                      )}

                      {req.status === "conflicted" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          Conflicted
                        </span>
                      )}
                    </div>

                    <div className="shrink-0">
                      {renderTraceabilityBadge(trace?.status)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                      {req.title}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1">
                      {req.description}
                    </p>
                  </div>

                  {/* Student-Friendly 3-Part Evidence Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    {/* 1. Specification Evidence */}
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-50/70 text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">Specification: </span>
                        {req.evidence_count > 0 ? (
                          <span className="text-emerald-700 font-medium">✓ Found in Docs ({req.evidence_count})</span>
                        ) : (
                          <span className="text-slate-400 italic">No document quote</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Implementation Evidence */}
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-50/70 text-slate-700">
                      <FileCode className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">Implementation: </span>
                        {trace && trace.implementation_count > 0 ? (
                          <span className="text-indigo-700 font-medium truncate" title={trace.candidate_files.join(", ")}>
                            ✓ {trace.implementation_count} file(s) located
                          </span>
                        ) : hasRepository ? (
                          <span className="text-slate-400">✕ No candidate code</span>
                        ) : (
                          <span className="text-slate-400 italic">Repo not linked</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Automated Test Evidence */}
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-50/70 text-slate-700">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">Testing: </span>
                        {trace && trace.test_count > 0 ? (
                          <span className="text-emerald-700 font-medium truncate" title={trace.test_files.join(", ")}>
                            ✓ {trace.test_count} test file(s)
                          </span>
                        ) : hasRepository ? (
                          <span className="text-amber-600 font-medium">⚠ No tests found</span>
                        ) : (
                          <span className="text-slate-400 italic">Repo not linked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Summary note & Link */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="text-[11px] text-slate-400 truncate max-w-lg">
                      {trace?.summary_notes || `Fingerprint: ${req.content_hash.slice(0, 8)}...`}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRequirement(req.requirement_id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>View Technical Evidence</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
