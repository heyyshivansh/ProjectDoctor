import React, { useEffect, useState } from "react";
import { RequirementDetail } from "@/types/requirement";
import { getRequirement } from "@/services/requirements";
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
  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requirementId) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getRequirement(projectId, requirementId)
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
    };
  }, [projectId, requirementId]);

  if (!requirementId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {detail?.requirement_id || requirementId}
            </span>
            <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
              {detail?.title || "Requirement Evidence & Traceability"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs">Loading requirement evidence...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {detail && (
            <>
              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="capitalize text-xs font-semibold bg-slate-50 text-slate-700"
                >
                  Category: {detail.category}
                </Badge>

                {detail.priority ? (
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${
                      detail.priority === "high"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : detail.priority === "medium"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    Priority: {detail.priority}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Priority: Unspecified</span>
                )}

                {detail.actor ? (
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                    <User className="h-3 w-3 mr-1" />
                    Actor: {detail.actor}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Actor: Unspecified</span>
                )}

                {detail.is_ambiguous && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Ambiguous Specification
                  </Badge>
                )}

                {detail.status === "conflicted" && (
                  <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Conflicting Evidence
                  </Badge>
                )}
              </div>

              {/* Requirement Statement */}
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Full Requirement Statement
                </p>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {detail.description}
                </p>
              </div>

              {/* Conflict Explanation if present */}
              {detail.conflict_summary && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Contradiction Warning
                  </div>
                  <p className="text-xs leading-relaxed">{detail.conflict_summary}</p>
                </div>
              )}

              {/* Supporting Evidence Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5 text-blue-600" />
                    Verifiable Evidence Sources ({detail.evidence.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Fingerprint: <span className="font-mono">{detail.content_hash.slice(0, 10)}...</span>
                  </span>
                </div>

                {detail.evidence.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No direct physical evidence records attached.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detail.evidence.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="p-4 rounded-lg border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {ev.source_type === "project_metadata"
                                ? "Project Metadata"
                                : ev.artifact_name || "Document Artifact"}
                            </span>
                            {ev.section_title && (
                              <span className="text-slate-400 truncate">
                                &gt; {ev.section_title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ev.page_number && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                                Page {ev.page_number}
                              </span>
                            )}
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-mono px-1.5 py-0.5 rounded border border-blue-200">
                              {Math.round(ev.confidence * 100)}% Confidence
                            </span>
                          </div>
                        </div>

                        {/* Exact Snippet Quote */}
                        <div className="relative pl-3 border-l-2 border-blue-500 bg-slate-50/70 p-2.5 rounded-r text-xs text-slate-700 italic leading-relaxed">
                          <Quote className="h-3 w-3 text-slate-300 absolute -top-1.5 -left-1 bg-white" />
                          "{ev.exact_snippet}"
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Method: <span className="font-mono text-slate-500">{ev.extraction_method}</span></span>
                          <span>Timestamp: {new Date(ev.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
