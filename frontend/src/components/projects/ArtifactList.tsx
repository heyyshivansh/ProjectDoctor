import React from "react";
import { Artifact } from "@/types/project";
import { getArtifactDownloadUrl } from "@/services/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Download, Clock } from "lucide-react";

interface ArtifactListProps {
  projectId: string;
  artifacts: Artifact[];
}

export const ArtifactList: React.FC<ArtifactListProps> = ({
  projectId,
  artifacts,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCategory = (cat: string): string => {
    return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Project Artifacts ({artifacts.length})
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

              return (
                <div
                  key={artifact.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-50 text-blue-600 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {artifact.original_filename}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{formatFileSize(artifact.file_size_bytes)}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {uploadDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs capitalize font-normal">
                      {formatCategory(artifact.file_type)}
                    </Badge>
                    <a
                      href={downloadUrl}
                      download
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs")}
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
  );
};
