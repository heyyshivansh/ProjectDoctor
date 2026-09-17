import React from "react";
import { RequirementMetrics } from "@/types/requirement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Shield,
  AlertTriangle,
  Sparkles,
  Loader2,
} from "lucide-react";


interface RequirementSummaryHeaderProps {
  metrics: RequirementMetrics | null;
  isExtracting: boolean;
  onExtract: (forceRegenerate?: boolean) => void;
}

export const RequirementSummaryHeader: React.FC<RequirementSummaryHeaderProps> = ({
  metrics,
  isExtracting,
  onExtract,
}) => {
  const total = metrics?.total ?? 0;
  const functional = metrics?.by_category?.functional ?? 0;
  const security = metrics?.by_category?.security ?? 0;
  const performance = metrics?.by_category?.performance ?? 0;
  const ambiguous = metrics?.ambiguous_count ?? 0;
  const conflict = metrics?.conflict_count ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Requirement Extraction & Traceability
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomic requirements extracted deterministically from declared project metadata and uploaded specifications.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => onExtract(false)}
            disabled={isExtracting}
            className="gap-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {total > 0 ? "Re-Extract Requirements" : "Extract Requirements"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Requirements</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{total}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Functional</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{functional}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Security & Perf</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{security + performance}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Ambiguous / Conflicts</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {ambiguous + conflict}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
