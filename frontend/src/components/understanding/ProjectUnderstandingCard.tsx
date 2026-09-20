import React, { useState } from "react";
import { ProjectUnderstanding } from "@/types/understanding";
import { generateProjectUnderstanding } from "@/services/documents";
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
    <span className="text-xs font-mono text-[var(--pd-text-muted)] italic flex items-center gap-1">
      <HelpCircle className="h-3 w-3 text-[var(--pd-text-muted)]" />
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
          className="text-[10px] text-[var(--pd-text-muted)] font-mono bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] px-1.5 py-0.5 rounded"
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
          className="text-[10px] text-[var(--pd-text-muted)] font-mono bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] px-1.5 py-0.5 rounded"
          title={`Source: ${prov.source_type}`}
        >
          Source: {label}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="border border-[var(--pd-hairline)] bg-[var(--pd-surface)] rounded-2xl shadow-sm overflow-hidden text-left">
      <div className="bg-[var(--pd-surface-raised)]/60 border-b border-[var(--pd-hairline)] flex flex-col sm:flex-row sm:items-center justify-between py-4 px-6 gap-3">
        <div>
          <h3 className="text-lg font-display font-medium text-[var(--pd-text-primary)] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--pd-accent)]" />
            Structured Project Understanding
          </h3>
          <p className="text-xs font-mono text-[var(--pd-text-muted)] mt-0.5">
            Deterministic 11-dimensional synthesis backed strictly by metadata and extracted documents.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2 bg-[var(--pd-accent)] hover:bg-[var(--pd-accent-hover)] text-white text-xs font-mono h-9 shrink-0"
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
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-[var(--pd-critical)]/10 border border-[var(--pd-critical)]/25 text-[var(--pd-critical)] text-xs font-mono">
            {error}
          </div>
        )}

        {!understanding ? (
          <div className="text-center py-12 px-4 border border-dashed border-[var(--pd-hairline)] rounded-xl bg-[var(--pd-surface-raised)]/30 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-[var(--pd-accent)]/15 text-[var(--pd-accent)] flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-display font-medium text-[var(--pd-text-primary)]">
              No Structured Representation Generated Yet
            </h4>
            <p className="text-xs font-sans text-[var(--pd-text-muted)] max-w-md mx-auto">
              Synthesize an initial 11-dimensional understanding model combining your declared project
              metadata with extracted text from uploaded proposal and specification documents.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-accent)] hover:bg-[var(--pd-hairline)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Initial Understanding
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[var(--pd-surface-raised)] rounded-xl border border-[var(--pd-hairline)] text-xs font-mono text-[var(--pd-text-body)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 font-medium text-[#10B981]">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  Status: Completed
                </span>
                <span>•</span>
                <span>{understanding.source_artifact_ids.length} Analyzed Artifacts</span>
                <span>•</span>
                <span>{understanding.extracted_sections_count} Sections Processed</span>
                <span>•</span>
                <span>{understanding.total_words_analyzed.toLocaleString()} Total Words</span>
              </div>
              <span className="text-[11px] text-[var(--pd-accent)] font-mono">
                No-Invention Rule Enforced
              </span>
            </div>

            {/* 11 Dimensions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Problem Statement */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-[var(--pd-accent)]" />
                    1. Problem Statement
                  </span>
                  {renderProvenanceBadge("problem")}
                </div>
                <p className="text-xs font-sans text-[var(--pd-text-body)] leading-relaxed">
                  {understanding.problem || renderNotSpecified()}
                </p>
              </div>

              {/* 2. Target Users */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[var(--pd-accent)]" />
                    2. Target Users
                  </span>
                  {renderProvenanceBadge("target_users")}
                </div>
                {understanding.target_users && understanding.target_users.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.target_users.map((user, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-body)] border border-[var(--pd-hairline)]">
                        {user}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 3. Objectives */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[var(--pd-accent)]" />
                    3. Objectives
                  </span>
                  {renderProvenanceBadge("objectives")}
                </div>
                {understanding.objectives && understanding.objectives.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-xs font-sans text-[var(--pd-text-body)]">
                    {understanding.objectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 4. Requirements Summary */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-[var(--pd-accent)]" />
                    4. Requirements Summary
                  </span>
                  {renderProvenanceBadge("requirements_summary")}
                </div>
                <p className="text-xs font-sans text-[var(--pd-text-body)] leading-relaxed max-h-32 overflow-y-auto">
                  {understanding.requirements_summary || renderNotSpecified()}
                </p>
                <p className="text-[10px] font-mono text-[var(--pd-text-muted)] italic">
                  Raw document summary (atomic R1/RN decomposition available in Requirements explorer).
                </p>
              </div>

              {/* 5. Modules */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-[var(--pd-accent)]" />
                    5. Modules & Components
                  </span>
                  {renderProvenanceBadge("modules")}
                </div>
                {understanding.modules && understanding.modules.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.modules.map((mod, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-body)] border border-[var(--pd-hairline)]">
                        {mod}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 6. Technology Stack */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-[var(--pd-accent)]" />
                    6. Technology Stack
                  </span>
                  {renderProvenanceBadge("tech_stack")}
                </div>
                {understanding.tech_stack && understanding.tech_stack.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.tech_stack.map((tech, idx) => (
                      <Badge key={idx} className="bg-[var(--pd-surface-raised)] text-[var(--pd-text-primary)] border border-[var(--pd-hairline)] font-mono text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 7. Architecture Overview */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-[var(--pd-accent)]" />
                    7. Architecture Overview
                  </span>
                  {renderProvenanceBadge("architecture_overview")}
                </div>
                <p className="text-xs font-sans text-[var(--pd-text-body)] leading-relaxed">
                  {understanding.architecture_overview || renderNotSpecified()}
                </p>
              </div>

              {/* 8. Dependencies */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-[var(--pd-accent)]" />
                    8. Dependencies
                  </span>
                  {renderProvenanceBadge("dependencies")}
                </div>
                {understanding.dependencies && understanding.dependencies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {understanding.dependencies.map((dep, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-body)] border border-[var(--pd-hairline)]">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  renderNotSpecified()
                )}
              </div>

              {/* 9. Expected Scale */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-[var(--pd-accent)]" />
                    9. Expected Scale
                  </span>
                  {renderProvenanceBadge("expected_scale")}
                </div>
                <p className="text-xs font-sans text-[var(--pd-text-body)]">
                  {understanding.expected_scale || renderNotSpecified()}
                </p>
              </div>

              {/* 10. Deployment */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Cloud className="h-4 w-4 text-[var(--pd-accent)]" />
                    10. Deployment Strategy
                  </span>
                  {renderProvenanceBadge("deployment")}
                </div>
                <p className="text-xs font-sans text-[var(--pd-text-body)]">
                  {understanding.deployment || renderNotSpecified()}
                </p>
              </div>

              {/* 11. Team */}
              <div className="p-4 rounded-xl border border-[var(--pd-hairline)] bg-[var(--pd-surface-raised)]/40 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--pd-text-primary)] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[var(--pd-accent)]" />
                    11. Team Members
                  </span>
                  {renderProvenanceBadge("team")}
                </div>
                {understanding.team && understanding.team.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {understanding.team.map((member, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-xs font-mono flex items-center gap-1.5"
                      >
                        <span className="font-medium text-[var(--pd-text-primary)]">{member.name}</span>
                        {member.role && (
                          <span className="text-[var(--pd-text-muted)] font-normal">({member.role})</span>
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
      </div>
    </div>
  );
};
