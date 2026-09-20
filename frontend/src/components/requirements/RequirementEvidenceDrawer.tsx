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
  CheckCircle2,
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
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#10B981]/15 px-2.5 py-1 rounded-full border border-[#10B981]/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
            Candidate Code & Tests Located
          </span>
        );
      case "candidate":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/15 px-2.5 py-1 rounded-full border border-[#F59E0B]/30">
            <Code2 className="h-3.5 w-3.5 text-[#F59E0B]" />
            Candidate Code Located
          </span>
        );
      case "ambiguous":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F43F5E] bg-[#F43F5E]/15 px-2.5 py-1 rounded-full border border-[#F43F5E]/30">
            <AlertTriangle className="h-3.5 w-3.5 text-[#F43F5E]" />
            Ambiguous Code Evidence
          </span>
        );
      case "unmatched":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--pd-text-muted)] bg-[var(--pd-surface-raised)] px-2.5 py-1 rounded-full border border-[var(--pd-hairline)]">
            No Candidate Code Match
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[var(--pd-surface-overlay)] rounded-2xl shadow-2xl border border-[var(--pd-hairline)] max-w-3xl w-full h-[85vh] max-h-[85vh] flex flex-col overflow-hidden overscroll-contain text-[var(--pd-text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--pd-hairline)] bg-[var(--pd-surface)]">
          <div className="flex items-center gap-2.5 truncate max-w-xl">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--pd-surface-raised)] text-[var(--pd-accent)] border border-[var(--pd-hairline)] shrink-0">
              {detail?.requirement_code || requirementId}
            </span>
            <h3 className="text-base font-display font-medium text-[var(--pd-text-primary)] truncate">
              {detail?.title || "Requirement Traceability & Evidence"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-bar: Status and Tabs */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-[var(--pd-surface)] border-b border-[var(--pd-hairline)] text-xs gap-3">
          <div className="flex items-center gap-2">
            {renderStatusBadge(detail?.status)}
            {detail?.commit_sha && (
              <span className="font-mono text-[11px] text-[var(--pd-text-muted)] bg-[var(--pd-surface-raised)] px-2 py-0.5 rounded border border-[var(--pd-hairline)]">
                Commit: {detail.commit_sha.slice(0, 7)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "code"
                  ? "bg-[var(--pd-accent)] text-white shadow-sm"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] border border-[var(--pd-hairline)]"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code & Tests ({(detail?.implementation_links.length ?? 0) + (detail?.test_links.length ?? 0)})
            </button>
            <button
              onClick={() => setActiveTab("spec")}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "spec"
                  ? "bg-[var(--pd-accent)] text-white shadow-sm"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] border border-[var(--pd-hairline)]"
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
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-[var(--pd-text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--pd-accent)]" />
              <p className="text-xs font-mono">Loading requirement traceability...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-[var(--pd-critical)]/10 border border-[var(--pd-critical)]/25 text-[var(--pd-critical)] text-xs font-mono">
              {error}
            </div>
          )}

          {detail && (
            <>
              {/* Requirement Statement Card */}
              <div className="space-y-2 bg-[var(--pd-surface)] p-5 rounded-xl border border-[var(--pd-hairline)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                    Requirement Statement
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[11px] bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-body)]">
                      {detail.category}
                    </Badge>
                    {detail.priority && (
                      <Badge variant="outline" className="capitalize text-[11px] bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-body)]">
                        {detail.priority}
                      </Badge>
                    )}
                    {detail.actor && (
                      <Badge variant="outline" className="text-[11px] bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-body)]">
                        <User className="h-3 w-3 mr-1 text-[var(--pd-text-muted)]" />
                        {detail.actor}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[var(--pd-text-body)] leading-relaxed font-normal pt-1">
                  {detail.description}
                </p>
              </div>

              {/* Technical Verification Note */}
              {detail.verification_note && (
                <div className="p-4 rounded-xl bg-[var(--pd-accent)]/10 border border-[var(--pd-accent)]/25 text-[var(--pd-text-body)] flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[var(--pd-accent)] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold text-[var(--pd-text-primary)]">Technical Verification Note: </span>
                    <span>{detail.verification_note}</span>
                  </div>
                </div>
              )}

              {/* TAB 1: Code & Test Evidence */}
              {activeTab === "code" && (
                <div className="space-y-6">
                  {/* Implementation Candidates */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-[var(--pd-accent)]" />
                      Candidate Implementation Files ({detail.implementation_links.length})
                    </h4>

                    {detail.implementation_links.length === 0 ? (
                      <div className="p-6 text-center rounded-xl border border-dashed border-[var(--pd-hairline)] bg-[var(--pd-surface)]/50 text-xs text-[var(--pd-text-muted)] font-mono">
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
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                      Candidate Automated Test Suites ({detail.test_links.length})
                    </h4>

                    {detail.test_links.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-xs text-[#F59E0B] space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" />
                          Missing Automated Tests
                        </div>
                        <p className="text-[var(--pd-text-body)]">
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
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5 text-[var(--pd-accent)]" />
                    Document Specification Provenance ({detail.specification_evidence.length})
                  </h4>

                  {detail.specification_evidence.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-[var(--pd-hairline)] bg-[var(--pd-surface)]/50 text-xs text-[var(--pd-text-muted)] font-mono">
                      No document quotes attached. Requirement declared in project metadata.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detail.specification_evidence.map((ev, idx) => (
                        <div
                          key={ev.id || idx}
                          className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface)] space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-1.5 font-medium text-[var(--pd-text-primary)] truncate">
                              <FileText className="h-3.5 w-3.5 text-[var(--pd-accent)] shrink-0" />
                              <span className="truncate">
                                {ev.source_type === "project_metadata"
                                  ? "Project Metadata"
                                  : ev.artifact_name || "Document Specification"}
                              </span>
                              {ev.section_title && (
                                <span className="text-[var(--pd-text-muted)] truncate">
                                  &gt; {ev.section_title}
                                </span>
                              )}
                            </div>

                            {ev.page_number && (
                              <span className="text-[10px] bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] font-semibold px-2 py-0.5 rounded border border-[var(--pd-hairline)]">
                                Page {ev.page_number}
                              </span>
                            )}
                          </div>

                          <div className="relative pl-3 border-l-2 border-[var(--pd-accent)] bg-[var(--pd-surface-raised)]/60 p-3 rounded-r text-xs text-[var(--pd-text-body)] italic leading-relaxed">
                            <Quote className="h-3 w-3 text-[var(--pd-text-muted)] absolute -top-1.5 -left-1" />
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
        <div className="px-6 py-3.5 border-t border-[var(--pd-hairline)] bg-[var(--pd-surface)] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] hover:bg-[var(--pd-hairline)]">
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
    <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface)] space-y-2.5 shadow-sm hover:border-[var(--pd-accent)]/40 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono text-xs font-semibold text-[var(--pd-text-primary)] truncate">
            {link.file_path}
          </span>
          {link.line_start && (
            <span className="text-[11px] font-mono text-[var(--pd-text-muted)]">
              Lines {link.line_start}-{link.line_end}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] font-mono uppercase font-semibold ${
              link.match_level === "strong_match"
                ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                : link.match_level === "candidate_match"
                ? "bg-[var(--pd-accent)]/15 text-[var(--pd-accent)] border-[var(--pd-accent)]/30"
                : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)]"
            }`}
          >
            {Math.round(link.match_confidence * 100)}% Confidence
          </Badge>

          {link.github_url && (
            <a
              href={link.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--pd-accent)] hover:underline"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--pd-text-muted)] pt-0.5">
        <span className="truncate max-w-lg">
          <strong className="text-[var(--pd-text-primary)]">Rationale:</strong> {link.match_rationale}
        </span>

        {link.code_snippet && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-0.5 text-[var(--pd-accent)] hover:underline text-[11px] font-mono ml-2 shrink-0"
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
        <div className="mt-2 rounded-xl bg-[var(--pd-canvas)] border border-[var(--pd-hairline)] p-3 text-[var(--pd-text-body)] text-xs font-mono overflow-x-auto relative">
          <div className="flex justify-end pb-1">
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1 text-[10px] font-mono text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)]"
            >
              {copiedId === link.id ? (
                <>
                  <Check className="h-3 w-3 text-[#10B981]" />
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
