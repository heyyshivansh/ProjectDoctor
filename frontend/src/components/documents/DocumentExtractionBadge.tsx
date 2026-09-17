import React from "react";
import { Badge } from "@/components/ui/badge";
import { ExtractionStatus } from "@/types/document";
import { CheckCircle2, Clock, Ban, AlertCircle } from "lucide-react";

interface DocumentExtractionBadgeProps {
  status?: ExtractionStatus;
  wordCount?: number;
  errorMessage?: string | null;
}

export const DocumentExtractionBadge: React.FC<DocumentExtractionBadgeProps> = ({
  status = "pending",
  wordCount = 0,
  errorMessage,
}) => {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-medium"
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Extracted ({wordCount.toLocaleString()} words)</span>
        </Badge>
      );
    case "skipped_unsupported_type":
      return (
        <Badge
          variant="secondary"
          className="bg-slate-100 text-slate-600 border-slate-200 gap-1 font-normal"
          title="Non-text file. OCR and archive unpacking are excluded in this checkpoint."
        >
          <Ban className="h-3 w-3 text-slate-400" />
          <span>Non-text (Skipped)</span>
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="destructive"
          className="bg-rose-50 text-rose-700 border-rose-200 gap-1"
          title={errorMessage || "Extraction failed"}
        >
          <AlertCircle className="h-3 w-3 text-rose-600" />
          <span>Extraction Failed</span>
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 gap-1"
        >
          <Clock className="h-3 w-3 text-amber-500" />
          <span>Pending Extraction</span>
        </Badge>
      );
  }
};
