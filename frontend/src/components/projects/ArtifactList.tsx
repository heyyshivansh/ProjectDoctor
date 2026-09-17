import React, { useState } from "react";
import { Artifact } from "@/types/project";
import { DocumentExtraction, DocumentExtractionSummary } from "@/types/document";
import { getArtifactDownloadUrl } from "@/services/projects";
import { getArtifactExtraction, extractArtifact } from "@/services/documents";
import { DocumentExtractionBadge } from "@/components/documents/DocumentExtractionBadge";
import { ExtractedTextViewerModal } from "@/components/documents/ExtractedTextViewerModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Download, Clock, Sparkles, Loader2, BookOpen } from "lucide-react";

interface ArtifactListProps {
  projectId: string;
  artifacts: Artifact[];
  extractions?: Record<string, DocumentExtractionSummary>;
  onExtractionUpdated?: (extraction: DocumentExtractionSummary) => void;
}

export const ArtifactList: React.FC<ArtifactListProps> = ({
  projectId,
  artifacts,
  extractions = {},
  onExtractionUpdated,
}) => {
  const [extractingMap, setExtractingMap] = useState<Record<string, boolean>>({});
  const [modalData, setModalData] = useState<{
    artifact: Artifact;
    extraction: DocumentExtraction;
  } | null>(null);
  const [loadingModalId, setLoadingModalId] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCategory = (cat: string): string => {
    return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleExtract = async (artifactId: string) => {
    setExtractingMap((prev) => ({ ...prev, [artifactId]: true }));
    try {
      const result = await extractArtifact(projectId, artifactId);
      if (onExtractionUpdated) {
        onExtractionUpdated(result);
      }
    } catch (err) {
      console.error("Failed to extract artifact:", err);
    } finally {
      setExtractingMap((prev) => ({ ...prev, [artifactId]: false }));
    }
  };

  const handleOpenModal = async (artifact: Artifact) => {
    setLoadingModalId(artifact.id);
    try {
      const fullExtraction = await getArtifactExtraction(projectId, artifact.id);
      setModalData({ artifact, extraction: fullExtraction });
    } catch (err) {
      console.error("Failed to fetch full extraction details:", err);
    } finally {
      setLoadingModalId(null);
    }
  };

  return (
    <>
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Project Artifacts & Documents ({artifacts.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {artifacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No artifacts uploaded yet. Upload proposals, architecture diagrams, or code bundles above.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {artifacts.map((artifact) => {
                const downloadUrl = getArtifactDownloadUrl(projectId, artifact.id);
                const uploadDate = new Date(artifact.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const extraction = extractions[artifact.id];
                const isExtracting = extractingMap[artifact.id] || false;
                const isLoadingModal = loadingModalId === artifact.id;

                return (
                  <div
                    key={artifact.id}
                    className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="p-2 rounded-md bg-blue-50 text-blue-600 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {artifact.original_filename}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{formatFileSize(artifact.file_size_bytes)}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {uploadDate}
                          </span>
                          <span>&bull;</span>
                          <Badge variant="secondary" className="text-[11px] capitalize font-normal">
                            {formatCategory(artifact.file_type)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Extraction Status Badge */}
                      <DocumentExtractionBadge
                        status={extraction?.status || "pending"}
                        wordCount={extraction?.word_count || 0}
                        errorMessage={extraction?.error_message}
                      />

                      {/* Action: View Extracted Text / Outline */}
                      {extraction && extraction.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(artifact)}
                          disabled={isLoadingModal}
                          className="h-8 gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          {isLoadingModal ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5" />
                          )}
                          View Text
                        </Button>
                      )}

                      {/* Action: Extract Text */}
                      {(!extraction || extraction.status === "pending" || extraction.status === "failed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtract(artifact.id)}
                          disabled={isExtracting}
                          className="h-8 gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                        >
                          {isExtracting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Extract
                        </Button>
                      )}

                      {/* Action: Download Raw File */}
                      <a
                        href={downloadUrl}
                        download
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-8 gap-1.5 text-xs text-slate-700"
                        )}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Text Viewer Modal */}
      {modalData && (
        <ExtractedTextViewerModal
          projectId={projectId}
          artifactId={modalData.artifact.id}
          artifactName={modalData.artifact.original_filename}
          extraction={modalData.extraction}
          isOpen={true}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  );
};
