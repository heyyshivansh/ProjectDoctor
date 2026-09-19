import React, { useEffect, useState } from "react";
import { DocumentExtraction } from "@/types/document";
import { getExtractedText } from "@/services/documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Copy,
  Check,
  Download,
  Loader2,
  FileText,
  Hash,
  BookOpen,
} from "lucide-react";

interface ExtractedTextViewerModalProps {
  projectId: string;
  artifactId: string;
  artifactName: string;
  extraction: DocumentExtraction;
  isOpen: boolean;
  onClose: () => void;
}

export const ExtractedTextViewerModal: React.FC<ExtractedTextViewerModalProps> = ({
  projectId,
  artifactId,
  artifactName,
  extraction,
  isOpen,
  onClose,
}) => {
  const [fullText, setFullText] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (extraction.status !== "completed") {
      setIsLoadingText(false);
      return;
    }

    let isMounted = true;
    setIsLoadingText(true);
    setError(null);

    getExtractedText(projectId, artifactId)
      .then((text) => {
        if (isMounted) {
          setFullText(text);
          setIsLoadingText(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load full extracted text.");
          setIsLoadingText(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId, artifactId, extraction.status]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifactName}_extracted.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="extracted-text-title"
    >
      <div
        className="relative w-full max-w-4xl h-[85vh] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="extracted-text-title" className="text-lg font-semibold text-slate-900 leading-tight">
                {artifactName}
              </h2>
              <p className="text-xs text-slate-500">
                Extracted via {extraction.extractor_name} •{" "}
                {extraction.word_count.toLocaleString()} words •{" "}
                {extraction.character_count.toLocaleString()} characters
                {extraction.page_count ? ` • ${extraction.page_count} pages` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Sub-bar: Metrics & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            {extraction.sha256_hash && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500" title="SHA-256 Content Hash">
                <Hash className="h-3.5 w-3.5" />
                {extraction.sha256_hash.slice(0, 16)}...
              </span>
            )}
            <Badge variant="outline" className="text-[11px]">
              {extraction.sections.length} Outline Sections
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isLoadingText || !fullText}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Text
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isLoadingText || !fullText}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download .txt
            </Button>
          </div>
        </div>

        {/* Modal Body: Split view (Sections outline + Full text) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Outline Sidebar (if sections exist) */}
          {extraction.sections.length > 0 && (
            <div className="w-64 border-r border-slate-200 p-4 bg-slate-50/50 overflow-y-auto overscroll-contain min-h-0 hidden md:block">
              <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Outline & Headings
              </h3>
              <ul className="space-y-1 text-xs">
                {extraction.sections.map((sec, idx) => (
                  <li
                    key={idx}
                    className="p-1.5 rounded hover:bg-slate-200/60 text-slate-700 truncate cursor-default transition-colors"
                    title={sec.title}
                    style={{ paddingLeft: `${Math.max(6, sec.level * 10)}px` }}
                  >
                    <span className="font-medium text-slate-800">• </span>
                    {sec.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Text Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto overscroll-contain min-h-0 bg-white font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-blue-100">
            {isLoadingText ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>Loading extracted text from disk...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            ) : extraction.status === "skipped_unsupported_type" ? (
              <div className="text-center py-16 text-slate-500">
                {extraction.error_message || "Non-text artifact. Extraction was skipped."}
              </div>
            ) : extraction.status === "failed" ? (
              <div className="p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <p className="font-semibold mb-1">Extraction Failed</p>
                <p>{extraction.error_message || "An unknown error occurred during extraction."}</p>
              </div>
            ) : (
              fullText || <span className="text-slate-400 italic">No text content extracted.</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
