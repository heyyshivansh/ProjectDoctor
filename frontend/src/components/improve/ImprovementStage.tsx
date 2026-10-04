import React, { useEffect, useState } from "react";
import { getImprovementPlan, updateImprovementItemStatus } from "@/services/improvement";
import { ImprovementPlan, ImprovementItem } from "@/types/improvement";
import { Loader2, AlertCircle, CheckCircle, Clock, Circle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogDescription,
} from "@/components/motion-primitives/morphing-dialog";

interface ImprovementStageProps {
  projectId: string;
  onStartAnalysis: () => void;
}

export const ImprovementStage: React.FC<ImprovementStageProps> = ({ projectId, onStartAnalysis }) => {
  const [plan, setPlan] = useState<ImprovementPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, [projectId]);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getImprovementPlan(projectId);
      setPlan(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load improvement plan");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: "not_started" | "in_progress" | "completed") => {
    setUpdatingId(itemId);
    setUpdateError(null);
    try {
      const updatedItem = await updateImprovementItemStatus(projectId, itemId, newStatus);
      setPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => item.id === itemId ? updatedItem : item)
        };
      });
    } catch (err: any) {
      setUpdateError(`Failed to update task: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-[var(--pd-ai)] animate-spin" />
        <p className="text-sm text-[var(--pd-text-muted)]">Loading improvement plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-sm">Error Loading Plan</h3>
          <p className="text-sm mt-1">{error}</p>
          <Button onClick={loadPlan} variant="outline" className="mt-3 bg-white text-red-700 border-red-200 hover:bg-red-50">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  if (plan.latest_verification_run_id === null) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Improve</h2>
          <p className="text-sm text-[var(--pd-text-body)] mt-1">Turn findings into actionable next steps.</p>
        </div>
        <div className="p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-center space-y-3">
          <p className="text-base font-semibold text-[var(--pd-text-primary)]">No completed analysis yet.</p>
          <p className="text-sm text-[var(--pd-text-muted)]">
            Run an analysis first to generate findings. Improve will help you address each finding with concrete actions.
          </p>
          <Button onClick={onStartAnalysis} className="bg-[var(--pd-ai)] text-white mt-2 hover:bg-[var(--pd-ai-hover)]">
            Analyze Project
          </Button>
        </div>
      </div>
    );
  }

  if (plan.is_empty || plan.items.length === 0) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Improve</h2>
          <p className="text-sm text-[var(--pd-text-body)] mt-1">Turn findings into actionable next steps.</p>
        </div>
        <div className="p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-center space-y-3">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
          <p className="text-base font-semibold text-[var(--pd-text-primary)]">No actionable findings!</p>
          <p className="text-sm text-[var(--pd-text-muted)]">
            The latest analysis did not produce any findings that require improvement. Great job!
          </p>
        </div>
      </div>
    );
  }

  const renderEvidence = (item: ImprovementItem) => {
    if (!item.hydrated_evidence || item.hydrated_evidence.length === 0) {
      return (
        <div className="p-8 bg-[var(--pd-surface)] rounded-xl text-center border border-[var(--pd-border)]">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-[var(--pd-text-muted)]">No source evidence is linked yet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto pr-2 text-left">
        {item.hydrated_evidence.map((ev: any, i: number) => (
          <div key={i} className="p-4 bg-[var(--pd-surface)] rounded-xl border border-[var(--pd-border)] text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {(ev.role || "").replace(/_/g, " ")}
              </span>
              <span className="text-xs font-medium text-[var(--pd-text-muted)] capitalize">
                {(ev.target_type || "").replace(/_/g, " ")}
              </span>
            </div>
            {ev.snippet ? (
              <pre className="p-3 bg-white rounded-lg text-xs font-mono text-gray-800 overflow-x-auto border border-gray-100 whitespace-pre-wrap">
                {ev.snippet}
              </pre>
            ) : ev.details ? (
              <div className="text-sm text-[var(--pd-text-body)] space-y-2 bg-white p-3 rounded-lg border border-gray-100">
                {ev.details.file_path && <p><strong className="text-gray-900">Path:</strong> {ev.details.file_path}</p>}
                {ev.details.content_status === "security_omitted" && (
                  <p className="text-amber-700 bg-amber-50 p-2 rounded flex items-center gap-2 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Contents safely omitted for security.
                  </p>
                )}
                {ev.details.line_start && ev.details.line_end && (
                  <p><strong className="text-gray-900">Lines:</strong> {ev.details.line_start} - {ev.details.line_end}</p>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-32">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Improvement Plan</h2>
        <p className="text-sm text-[var(--pd-text-body)] mt-1">Track and resolve the actionable findings from your latest analysis.</p>
      </div>

      {updateError && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {updateError}
        </div>
      )}

      <div className="space-y-4">
        {plan.items.map(item => (
          <div key={item.id} className="p-5 rounded-2xl bg-white border border-[var(--pd-border)] shadow-sm flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    item.severity === "critical" ? "bg-red-100 text-red-800" :
                    item.severity === "major" ? "bg-orange-100 text-orange-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {item.severity.replace("_", " ")}
                  </span>
                  <h3 className="font-semibold text-[var(--pd-text-primary)]">{item.title}</h3>
                </div>
                <p className="text-sm text-[var(--pd-text-body)]">{item.summary}</p>
              </div>

              <div className="flex items-center bg-[var(--pd-surface-raised)] rounded-lg p-1 border border-[var(--pd-border)] shrink-0">
                <button
                  onClick={() => handleStatusChange(item.id, "not_started")}
                  disabled={updatingId === item.id}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    item.status === "not_started" ? "bg-white shadow-sm text-gray-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" />
                  To Do
                </button>
                <button
                  onClick={() => handleStatusChange(item.id, "in_progress")}
                  disabled={updatingId === item.id}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    item.status === "in_progress" ? "bg-blue-50 shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  In Progress
                </button>
                <button
                  onClick={() => handleStatusChange(item.id, "completed")}
                  disabled={updatingId === item.id}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    item.status === "completed" ? "bg-green-50 shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Done
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--pd-surface)] p-4 rounded-xl border border-[var(--pd-border)]">
              <div>
                <h4 className="text-xs font-semibold text-[var(--pd-text-muted)] uppercase tracking-wider mb-2">Why It Matters</h4>
                <p className="text-sm text-[var(--pd-text-body)]">{item.why_it_matters}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[var(--pd-text-muted)] uppercase tracking-wider mb-2">Recommended Action</h4>
                <p className="text-sm text-[var(--pd-text-body)]">{item.suggested_action}</p>
              </div>
            </div>
            
            <div className="flex justify-end border-t border-[var(--pd-border)] pt-3">
              <MorphingDialog
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              >
                <MorphingDialogTrigger className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)] shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inspect Evidence</span>
                  </MorphingDialogTrigger>
                <MorphingDialogContainer>
                  <MorphingDialogContent
                    className="pointer-events-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <MorphingDialogTitle className="text-lg font-semibold text-[var(--pd-text-primary)] pr-8">
                        {item.title}
                      </MorphingDialogTitle>
                      <MorphingDialogClose className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </MorphingDialogClose>
                    </div>
                    <MorphingDialogDescription className="text-sm text-[var(--pd-text-muted)] mb-4">
                      Inspect the source evidence for this finding.
                    </MorphingDialogDescription>
                    {renderEvidence(item)}
                  </MorphingDialogContent>
                </MorphingDialogContainer>
              </MorphingDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

