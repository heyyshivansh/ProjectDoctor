import React from "react";
import { FindingSummary, FindingSeverity } from "@/types/diagnosis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";

interface FindingCardProps {
  finding: FindingSummary;
  onInspect: (findingId: string) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onInspect }) => {
  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold gap-1 hover:bg-rose-100">
            <AlertCircle className="h-3 w-3 text-rose-600" />
            Critical
          </Badge>
        );
      case "major":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-semibold gap-1 hover:bg-orange-100">
            <AlertTriangle className="h-3 w-3 text-orange-600" />
            Major Gap
          </Badge>
        );
      case "needs_attention":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold gap-1 hover:bg-amber-100">
            <HelpCircle className="h-3 w-3 text-amber-600" />
            Needs Attention
          </Badge>
        );
      case "improvement":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold gap-1 hover:bg-blue-100">
            <Lightbulb className="h-3 w-3 text-blue-600" />
            Improvement
          </Badge>
        );
      case "strength":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold gap-1 hover:bg-emerald-100">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Strength
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {severity}
          </Badge>
        );
    }
  };

  const getBorderColor = (severity: FindingSeverity) => {
    switch (severity) {
      case "critical":
        return "border-rose-200 hover:border-rose-300";
      case "major":
        return "border-orange-200 hover:border-orange-300";
      case "needs_attention":
        return "border-amber-200 hover:border-amber-300";
      case "improvement":
        return "border-blue-200 hover:border-blue-300";
      default:
        return "border-slate-200 hover:border-slate-300";
    }
  };

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between gap-4 ${getBorderColor(
        finding.severity
      )}`}
    >
      <div className="space-y-3">
        {/* Header: Severity badge & Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getSeverityBadge(finding.severity)}
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {finding.title}
            </h3>
          </div>
        </div>

        {/* Plain-language summary */}
        <p className="text-sm text-slate-600 leading-relaxed">
          {finding.summary}
        </p>

        {/* Why this matters for evaluation */}
        {finding.why_it_matters && (
          <div className="rounded-lg bg-slate-50 border border-slate-150 p-3 text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              Why this matters for evaluation
            </div>
            <p className="leading-relaxed text-slate-600 pl-5">
              {finding.why_it_matters.replace(/^Why this matters for evaluation:\s*/i, "")}
            </p>
          </div>
        )}

        {/* Suggested immediate action from backend */}
        {finding.suggested_action && (
          <div className="text-xs text-slate-600 flex items-baseline gap-1.5 pt-1">
            <span className="font-semibold text-slate-800 shrink-0">Suggested action:</span>
            <span>{finding.suggested_action}</span>
          </div>
        )}
      </div>

      {/* CTA Button: Inspect Finding & Evidence */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onInspect(finding.id)}
          className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
        >
          Inspect Finding & Evidence
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </div>
    </div>
  );
};
