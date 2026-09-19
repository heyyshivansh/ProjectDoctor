import React, { useEffect, useState } from "react";
import { RequirementTraceabilityDetail, TraceabilityLink } from "@/types/traceability";
import { getRequirementTraceability } from "@/services/traceability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  FileText,
  Bookmark,
  AlertTriangle,
  User,
  Quote,
  Loader2,
  ExternalLink,
  Code2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface RequirementEvidenceDrawerProps {
  projectId: string;
  requirementId: string | null;
  onClose: () => void;
}

export const RequirementEvidenceDrawer: React.FC<RequirementEvidenceDrawerProps> = ({
  projectId,
  requirementId,
  onClose,
}) => {
  const [detail, setDetail] = useState<RequirementTraceabilityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "spec">("code");
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!requirementId) {
      setDetail(null);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getRequirementTraceability(projectId, requirementId)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load requirement details.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [projectId, requirementId, onClose]);

  if (!requirementId) return null;

  const toggleSnippet = (id: string) => {
    setExpandedSnippets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySnippet = (id: string, text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "candidate_with_tests":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Candidate Code & Tests Located
          </span>
        );
      case "candidate":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            Candidate Code Located (No Tests)
          </span>
        );
      case "ambiguous":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Ambiguous Candidate Evidence
          </span>
        );
      case "unmatched":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <XCircle className="h-3.5 w-3.5 text-slate-400" />
            No Candidate Evidence Located
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full h-[85vh] max-h-[85vh] flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5 truncate max-w-xl">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
              {detail?.requirement_code || requirementId}
            </span>
            <h3 className="text-base font-bold text-slate-900 truncate">
              {detail?.title || "Requirement Traceability & Evidence"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-bar: Status and Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            {renderStatusBadge(detail?.status)}
            {detail?.commit_sha && (
              <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Commit: {detail.commit_sha.slice(0, 7)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "code"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code & Tests ({(detail?.implementation_links.length ?? 0) + (detail?.test_links.length ?? 0)})
            </button>
            <button
              onClick={() => setActiveTab("spec")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "spec"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Specification Quotes ({detail?.specification_evidence.length ?? 0})
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto overscroll-contain min-h-0 space-y-6">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs">Loading requirement traceability...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {detail && (
            <>
              {/* Requirement Statement Card */}
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Requirement Statement
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[11px] bg-white">
                      {detail.category}
                    </Badge>
                    {detail.priority && (
                      <Badge variant="outline" className="capitalize text-[11px] bg-white">
                        {detail.priority}
                      </Badge>
                    )}
                    {detail.actor && (
                      <Badge variant="outline" className="text-[11px] bg-white">
                        <User className="h-3 w-3 mr-1 text-slate-400" />
                        {detail.actor}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium pt-1">
                  {detail.description}
                </p>
              </div>

              {/* Technical Verification Note */}
              {detail.verification_note && (
                <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold text-blue-950">Technical Verification Note: </span>
                    <span>{detail.verification_note}</span>
                  </div>
                </div>
              )}

              {/* TAB 1: Code & Test Evidence */}
              {activeTab === "code" && (
                <div className="space-y-6">
                  {/* Implementation Candidates */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                      Candidate Implementation Files ({detail.implementation_links.length})
                    </h4>

                    {detail.implementation_links.length === 0 ? (
                      <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                        No candidate implementation files or route endpoints were detected in this snapshot.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detail.implementation_links.map((link) => (
                          <TraceabilityLinkCard
                            key={link.id}
                            link={link}
                            isExpanded={expandedSnippets[link.id] ?? false}
                            copiedId={copiedId}
                            onToggleExpand={() => toggleSnippet(link.id)}
                            onCopy={() => handleCopySnippet(link.id, link.code_snippet)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Test Evidence */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Candidate Automated Test Suites ({detail.test_links.length})
                    </h4>

                    {detail.test_links.length === 0 ? (
                      <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          Missing Automated Tests
                        </div>
                        <p>
                          No automated test files matching this requirement were located in the repository tree. Automated tests are recommended to verify requirement implementation.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detail.test_links.map((link) => (
                          <TraceabilityLinkCard
                            key={link.id}
                            link={link}
                            isExpanded={expandedSnippets[link.id] ?? false}
                            copiedId={copiedId}
                            onToggleExpand={() => toggleSnippet(link.id)}
                            onCopy={() => handleCopySnippet(link.id, link.code_snippet)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Specification Provenance */}
              {activeTab === "spec" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5 text-blue-600" />
                    Document Specification Provenance ({detail.specification_evidence.length})
                  </h4>

                  {detail.specification_evidence.length === 0 ? (
                    <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                      No document quotes attached. Requirement declared in project metadata.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detail.specification_evidence.map((ev, idx) => (
                        <div
                          key={ev.id || idx}
                          className="p-4 rounded-lg border border-slate-200 bg-white space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800 truncate">
                              <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {ev.source_type === "project_metadata"
                                  ? "Project Metadata"
                                  : ev.artifact_name || "Document Specification"}
                              </span>
                              {ev.section_title && (
                                <span className="text-slate-400 truncate">
                                  &gt; {ev.section_title}
                                </span>
                              )}
                            </div>

                            {ev.page_number && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                                Page {ev.page_number}
                              </span>
                            )}
                          </div>

                          <div className="relative pl-3 border-l-2 border-blue-500 bg-slate-50/70 p-2.5 rounded-r text-xs text-slate-700 italic leading-relaxed">
                            <Quote className="h-3 w-3 text-slate-300 absolute -top-1.5 -left-1 bg-white" />
                            "{ev.exact_snippet}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

interface TraceabilityLinkCardProps {
  link: TraceabilityLink;
  isExpanded: boolean;
  copiedId: string | null;
  onToggleExpand: () => void;
  onCopy: () => void;
}

const TraceabilityLinkCard: React.FC<TraceabilityLinkCardProps> = ({
  link,
  isExpanded,
  copiedId,
  onToggleExpand,
  onCopy,
}) => {
  return (
    <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono text-xs font-bold text-slate-900 truncate">
            {link.file_path}
          </span>
          {link.line_start && (
            <span className="text-[11px] text-slate-400">
              Lines {link.line_start}-{link.line_end}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] uppercase font-semibold ${
              link.match_level === "strong_match"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : link.match_level === "candidate_match"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {Math.round(link.match_confidence * 100)}% Confidence
          </Badge>

          {link.github_url && (
            <a
              href={link.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <span className="truncate max-w-lg">
          <strong className="text-slate-700">Rationale:</strong> {link.match_rationale}
        </span>

        {link.code_snippet && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-0.5 text-slate-600 hover:text-slate-900 text-[11px] font-medium ml-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide Snippet
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Inspect Snippet
              </>
            )}
          </button>
        )}
      </div>

      {isExpanded && link.code_snippet && (
        <div className="mt-2 rounded bg-slate-950 p-2.5 text-slate-200 text-xs font-mono overflow-x-auto relative">
          <div className="flex justify-end pb-1">
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
            >
              {copiedId === link.id ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {link.code_snippet}
          </pre>
        </div>
      )}
    </div>
  );
};
