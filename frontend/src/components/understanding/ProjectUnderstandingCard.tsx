import React, { useState } from "react";
import { ProjectUnderstanding } from "@/types/understanding";
import { generateProjectUnderstanding } from "@/services/documents";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Users,
  Target,
  FileCheck,
  Layers,
  Cpu,
  Share2,
  Boxes,
  Gauge,
  Cloud,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface ProjectUnderstandingCardProps {
  projectId: string;
  initialUnderstanding: ProjectUnderstanding | null;
  onUnderstandingUpdated: (understanding: ProjectUnderstanding) => void;
}

export const ProjectUnderstandingCard: React.FC<ProjectUnderstandingCardProps> = ({
  projectId,
  initialUnderstanding,
  onUnderstandingUpdated,
}) => {
  const [understanding, setUnderstanding] = useState<ProjectUnderstanding | null>(
    initialUnderstanding
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setUnderstanding(initialUnderstanding);
  }, [initialUnderstanding]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateProjectUnderstanding(projectId);
      setUnderstanding(result);
      onUnderstandingUpdated(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate project understanding."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const renderNotSpecified = () => (
    <span className="text-xs text-slate-400 italic flex items-center gap-1">
      <HelpCircle className="h-3 w-3 text-slate-300" />
      Not specified
    </span>
  );

  const renderProvenanceBadge = (fieldKey: string) => {
    if (!understanding?.provenance) return null;
    const prov = understanding.provenance[fieldKey];
    if (!prov) return null;

    if (Array.isArray(prov) && prov.length > 0) {
      return (
        <span
          className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded"
          title={JSON.stringify(prov)}
        >
          Source: {prov[0].source_type === "project_metadata" ? "Metadata" : "Document"}
        </span>
      );
    }

    if (prov.source_type) {
      const label =
        prov.source_type === "project_metadata"
          ? "Project Metadata"
          : `Artifact: ${prov.section || "Document"}`;
      return (
        <span
          className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded"
          title={`Source: ${prov.source_type}`}
        >
          Source: {label}
        </span>
      );
    }

    return null;
  };

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/70 border-b border-slate-200 flex flex-row items-center justify-between py-4 px-6">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Structured Project Understanding
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic 11-dimensional synthesis backed strictly by metadata and extracted documents.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Synthesizing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {understanding ? "Refresh Understanding" : "Generate Understanding"}
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {!understanding ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No Structured Representation Generated Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Synthesize an initial 11-dimensional understanding model combining your declared project
              metadata with extracted text from uploaded proposal and specification documents.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Generate Initial Understanding
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs text-indigo-900">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Status: Completed
                </span>
                <span>•</span>
                <span>{understanding.source_artifact_ids.length} Analyzed Artifacts</span>
                <span>•</span>
                <span>{understanding.extracted_sections_count} Sections Processed</span>
                <span>•</span>
                <span>{understanding.total_words_analyzed.toLocaleString()} Total Words</span>
              </div>
              <span className="text-[11px] text-indigo-700 font-mono">
                No-Invention Rule Enforced
              </span>
            </div>

            {/* 11 Dimensions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Problem Statement */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-slate-600" />
                    1. Problem Statement
                  </span>
                  {renderProvenanceBadge("problem")}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {understanding.problem || renderNotSpecified()}
                </p>
              </div>

              {/* 2. Target Users */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-600" />
                    2. Target Users
                  </span>
                  {renderProvenanceBadge("target_users")}
                </div>
                {understanding.target_users && understanding.target_users.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.target_users.map((user, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-normal">
                        {user}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 3. Objectives */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-slate-600" />
                    3. Objectives
                  </span>
                  {renderProvenanceBadge("objectives")}
                </div>
                {understanding.objectives && understanding.objectives.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                    {understanding.objectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 4. Requirements Summary */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-slate-600" />
                    4. Requirements Summary
                  </span>
                  {renderProvenanceBadge("requirements_summary")}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                  {understanding.requirements_summary || renderNotSpecified()}
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  Raw document summary (atomic R1/RN decomposition scheduled for Checkpoint 4).
                </p>
              </div>

              {/* 5. Modules */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-slate-600" />
                    5. Modules & Components
                  </span>
                  {renderProvenanceBadge("modules")}
                </div>
                {understanding.modules && understanding.modules.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.modules.map((mod, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {mod}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 6. Technology Stack */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-slate-600" />
                    6. Technology Stack
                  </span>
                  {renderProvenanceBadge("tech_stack")}
                </div>
                {understanding.tech_stack && understanding.tech_stack.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.tech_stack.map((tech, idx) => (
                      <Badge key={idx} className="bg-slate-900 text-white text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 7. Architecture Overview */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-slate-600" />
                    7. Architecture Overview
                  </span>
                  {renderProvenanceBadge("architecture_overview")}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {understanding.architecture_overview || renderNotSpecified()}
                </p>
              </div>

              {/* 8. Dependencies */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-slate-600" />
                    8. Dependencies
                  </span>
                  {renderProvenanceBadge("dependencies")}
                </div>
                {understanding.dependencies && understanding.dependencies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.dependencies.map((dep, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 9. Expected Scale */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-slate-600" />
                    9. Expected Scale
                  </span>
                  {renderProvenanceBadge("expected_scale")}
                </div>
                <p className="text-xs text-slate-700">
                  {understanding.expected_scale || renderNotSpecified()}
                </p>
              </div>

              {/* 10. Deployment */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Cloud className="h-4 w-4 text-slate-600" />
                    10. Deployment Strategy
                  </span>
                  {renderProvenanceBadge("deployment")}
                </div>
                <p className="text-xs text-slate-700">
                  {understanding.deployment || renderNotSpecified()}
                </p>
              </div>

              {/* 11. Team */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-600" />
                    11. Team Members
                  </span>
                  {renderProvenanceBadge("team")}
                </div>
                {understanding.team && understanding.team.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {understanding.team.map((member, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5"
                      >
                        <span className="font-medium text-slate-900">{member.name}</span>
                        {member.role && (
                          <span className="text-slate-500 font-normal">({member.role})</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
