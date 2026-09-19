import React, { useEffect, useState } from "react";
import { FindingDetail, FindingSeverity } from "@/types/diagnosis";
import { getFindingDetail } from "@/services/diagnosis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  FileText,
  Code2,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface FindingDetailDrawerProps {
  projectId: string;
  findingId: string | null;
  onClose: () => void;
  onOpenRequirementEvidence?: (requirementId: string) => void;
}

export const FindingDetailDrawer: React.FC<FindingDetailDrawerProps> = ({
  projectId,
  findingId,
  onClose,
  onOpenRequirementEvidence,
}) => {
  const [detail, setDetail] = useState<FindingDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!findingId) {
      setDetail(null);
      return;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setShowTechnicalDetails(false);

    getFindingDetail(projectId, findingId)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load finding details.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [projectId, findingId, onClose]);

  if (!findingId) {
    return null;
  }

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold gap-1">
            <AlertCircle className="h-3 w-3 text-rose-600" />
            Critical Concern
          </Badge>
        );
      case "major":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-semibold gap-1">
            <AlertTriangle className="h-3 w-3 text-orange-600" />
            Major Gap
          </Badge>
        );
      case "needs_attention":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold gap-1">
            <HelpCircle className="h-3 w-3 text-amber-600" />
            Needs Attention
          </Badge>
        );
      case "improvement":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold gap-1">
            <Lightbulb className="h-3 w-3 text-blue-600" />
            Improvement Opportunity
          </Badge>
        );
      case "strength":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Verified Strength
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finding-detail-title"
    >
      <div
        className="w-full max-w-2xl h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden overscroll-contain animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            {detail && getSeverityBadge(detail.severity)}
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Finding Details
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 p-6 overflow-y-auto overscroll-contain space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Hydrating finding & canonical evidence...</p>
            </div>
          ) : error || !detail ? (
            <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">
              {error || "Finding details could not be loaded."}
            </div>
          ) : (
            <>
              {/* Finding Title & Plain Summary */}
              <div className="space-y-2">
                <h2
                  id="finding-detail-title"
                  className="text-xl font-bold text-slate-900 tracking-tight leading-snug"
                >
                  {detail.title}
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {detail.summary}
                </p>
              </div>

              {/* Evaluation Impact Section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Why this matters for evaluation
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {detail.why_it_matters.replace(/^Why this matters for evaluation:\s*/i, "")}
                </p>
              </div>

              {/* Recommended Next Action */}
              {detail.suggested_action && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    Recommended Next Action
                  </div>
                  <p className="text-xs text-blue-950 font-medium leading-relaxed">
                    {detail.suggested_action}
                  </p>
                </div>
              )}

              {/* Contextual Supporting Evidence */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Supporting Evidence ({detail.hydrated_evidence.length})
                </h3>

                {detail.hydrated_evidence.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    No discrete file snippets are associated with this system-level finding.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.hydrated_evidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5"
                      >
                        {/* Evidence Item Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            {item.target_type === "requirement" ? (
                              <FileText className="h-4 w-4 text-blue-600" />
                            ) : item.role === "sensitive_file" ? (
                              <Lock className="h-4 w-4 text-rose-600" />
                            ) : (
                              <Code2 className="h-4 w-4 text-indigo-600" />
                            )}
                            <span className="text-xs font-bold text-slate-900">
                              {item.title || item.file_path || `Evidence Item #${idx + 1}`}
                            </span>
                          </div>

                          <Badge variant="outline" className="capitalize text-[11px]">
                            {item.role?.replace(/_/g, " ") || item.target_type}
                          </Badge>
                        </div>

                        {/* Sensitive file notice */}
                        {item.role === "sensitive_file" && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-rose-950">
                              <Lock className="h-3.5 w-3.5 text-rose-600" />
                              Sensitive File Protection Active
                            </div>
                            <p className="text-[11px] leading-relaxed text-rose-800">
                              This file matched known secret or environment configuration patterns. In accordance with security standards, its file contents were safely omitted from ingestion and are never stored or displayed.
                            </p>
                          </div>
                        )}

                        {/* Specification quote snippet */}
                        {item.target_type === "requirement" && item.snippet && (
                          <div className="space-y-1">
                            {(item.page_number || item.section_title) && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                {item.page_number && <span>Page {item.page_number}</span>}
                                {item.section_title && <span>• {item.section_title}</span>}
                              </div>
                            )}
                            <blockquote className="text-xs text-slate-700 italic border-l-2 border-blue-400 pl-3 py-1 bg-slate-50 rounded-r">
                              "{item.snippet}"
                            </blockquote>

                            {onOpenRequirementEvidence && (
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onOpenRequirementEvidence(item.target_id)}
                                  className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                  View Requirement in Traceability Matrix
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Implementation code snippet */}
                        {item.target_type === "traceability" && item.snippet && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Path: <code className="font-mono">{item.file_path}</code></span>
                              {item.line_start && (
                                <span>Lines {item.line_start}–{item.line_end}</span>
                              )}
                            </div>
                            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed max-h-56">
                              <code>{item.snippet}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsed Technical Details (Level 5 Progressive Disclosure) */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span>Technical Details (SHAs, Rule Codes & Metadata)</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="mt-2 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Rule Code:</span>
                      <span className="font-bold text-slate-800">
                        {detail.technical_details?.rule_code || detail.finding_type}
                      </span>
                    </div>

                    {detail.commit_sha && (
                      <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Commit SHA:</span>
                        <span className="text-slate-800">{detail.commit_sha}</span>
                      </div>
                    )}

                    {detail.snapshot_id && (
                      <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Snapshot ID:</span>
                        <span className="text-slate-800 truncate max-w-[280px]">{detail.snapshot_id}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500">Finding Hash:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 text-[11px] truncate max-w-[200px]">
                          {detail.finding_hash}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyHash(detail.finding_hash)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                          title="Copy finding hash"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
