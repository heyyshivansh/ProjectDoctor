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

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
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
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 touch-none overscroll-contain"
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
        className="relative w-full max-w-4xl h-[85vh] max-h-[85vh] bg-[var(--pd-surface)] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.75)] border border-[var(--pd-border)] flex flex-col overflow-hidden overscroll-contain text-[var(--pd-text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--pd-border)] bg-[var(--pd-surface-raised)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--pd-ai-wash)] text-[var(--pd-ai)] border border-[var(--pd-ai)]/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="extracted-text-title" className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)] leading-tight">
                {artifactName}
              </h2>
              <p className="text-xs text-[var(--pd-text-muted)] font-mono">
                Extracted via {extraction.extractor_name} &bull;{" "}
                {extraction.word_count.toLocaleString()} words &bull;{" "}
                {extraction.character_count.toLocaleString()} characters
                {extraction.page_count ? ` \u2022 ${extraction.page_count} pages` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--pd-text-muted)] hover:text-white hover:bg-[var(--pd-surface)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Sub-bar: Metrics & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-[var(--pd-surface)]/90 border-b border-[var(--pd-border)] text-xs text-[var(--pd-text-muted)]">
          <div className="flex items-center gap-3">
            {extraction.sha256_hash && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--pd-text-muted)]" title="SHA-256 Content Hash">
                <Hash className="h-3.5 w-3.5" />
                {extraction.sha256_hash.slice(0, 16)}...
              </span>
            )}
            <Badge variant="outline" className="text-[11px] font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-body)]">
              {extraction.sections.length} Outline Sections
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isLoadingText || !fullText}
              className="h-8 gap-1.5 text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-white hover:border-[var(--pd-border-hover)]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[var(--pd-mint)]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isLoadingText || !fullText}
              className="h-8 gap-1.5 text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-white hover:border-[var(--pd-border-hover)]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .txt</span>
            </Button>
          </div>
        </div>

        {/* Modal Body: Split view (Sections outline + Full text) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Outline Sidebar (if sections exist) */}
          {extraction.sections.length > 0 && (
            <div className="w-64 border-r border-[var(--pd-border)] p-4 bg-[var(--pd-surface-raised)]/30 overflow-y-auto overscroll-contain min-h-0 hidden md:block">
              <h3 className="text-xs font-semibold uppercase text-[var(--pd-text-muted)] tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                <BookOpen className="h-3.5 w-3.5 text-[var(--pd-ai)]" />
                Outline &amp; Headings
              </h3>
              <ul className="space-y-1 text-xs">
                {extraction.sections.map((sec, idx) => (
                  <li
                    key={idx}
                    className="p-1.5 rounded hover:bg-[var(--pd-surface-raised)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] truncate cursor-default transition-colors"
                    title={sec.title}
                    style={{ paddingLeft: `${Math.max(6, sec.level * 10)}px` }}
                  >
                    <span className="font-medium text-[var(--pd-text-muted)]">&bull; </span>
                    {sec.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Text Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto overscroll-contain min-h-0 bg-[var(--pd-canvas)] font-mono text-xs leading-relaxed text-[var(--pd-text-primary)] whitespace-pre-wrap selection:bg-[var(--pd-ai-wash)] selection:text-white">
            {isLoadingText ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-[var(--pd-text-muted)] space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--pd-ai)]" />
                <span>Loading extracted text from disk...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-[var(--pd-coral-wash)] text-[var(--pd-coral)] border border-[var(--pd-coral)]/30">
                {error}
              </div>
            ) : extraction.status === "skipped_unsupported_type" ? (
              <div className="text-center py-16 text-[var(--pd-text-muted)]">
                {extraction.error_message || "Non-text artifact. Extraction was skipped."}
              </div>
            ) : extraction.status === "failed" ? (
              <div className="p-4 rounded-xl bg-[var(--pd-coral-wash)] text-[var(--pd-coral)] border border-[var(--pd-coral)]/30">
                <p className="font-semibold mb-1">Extraction Failed</p>
                <p>{extraction.error_message || "An unknown error occurred during extraction."}</p>
              </div>
            ) : (
              fullText || <span className="text-[var(--pd-text-muted)] italic">No text content extracted.</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[var(--pd-border)] bg-[var(--pd-surface-raised)]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-mono bg-[var(--pd-surface)] border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-white hover:bg-[var(--pd-surface-overlay)]"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
