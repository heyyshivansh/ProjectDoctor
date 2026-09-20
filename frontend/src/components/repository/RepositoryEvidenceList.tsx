import React, { useState } from "react";
import { RepositoryEvidence } from "@/types/repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  FileCode,
  Layers,
  Settings,
  ShieldCheck,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";

interface RepositoryEvidenceListProps {
  evidence: RepositoryEvidence[];
  repoUrl: string;
}

export const RepositoryEvidenceList: React.FC<RepositoryEvidenceListProps> = ({
  evidence,
  repoUrl,
}) => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySnippet = (id: string, snippet?: string | null) => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    manifest: { label: "Manifests & Packages", icon: Layers, color: "bg-[var(--pd-accent)]/15 text-[var(--pd-accent)] border-[var(--pd-accent)]/30" },
    configuration: { label: "Configurations", icon: Settings, color: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30" },
    entrypoint: { label: "Entry Points", icon: FileCode, color: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" },
    test_suite: { label: "Test Suites", icon: ShieldCheck, color: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30" },
    documentation: { label: "Documentation", icon: BookOpen, color: "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)]" },
  };

  const filteredEvidence = evidence.filter((item) => {
    if (selectedType !== "all" && item.evidence_type !== selectedType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPath = item.file_path.toLowerCase().includes(q);
      const matchSnippet = (item.content_snippet || "").toLowerCase().includes(q);
      if (!matchPath && !matchSnippet) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-display font-medium text-[var(--pd-text-primary)] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--pd-accent)]" />
            Structured Repository Evidence ({evidence.length})
          </h3>
          <p className="text-xs font-mono text-[var(--pd-text-muted)] mt-0.5">
            Verifiable facts deterministically extracted from repository manifests, configurations, and code entrypoints.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--pd-text-muted)]" />
          <input
            placeholder="Search evidence path or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs font-mono h-9 w-full rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-[var(--pd-text-primary)] placeholder-[var(--pd-text-muted)] focus:outline-none focus:border-[var(--pd-accent)]"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          variant={selectedType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("all")}
          className={`text-xs font-mono h-7 px-2.5 rounded-lg transition-colors ${
            selectedType === "all"
              ? "bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)]"
              : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)] hover:text-[var(--pd-text-primary)]"
          }`}
        >
          All Types ({evidence.length})
        </Button>
        {Object.entries(typeConfig).map(([key, config]) => {
          const count = evidence.filter((e) => e.evidence_type === key).length;
          if (count === 0) return null;
          const IconComponent = config.icon;
          const isSelected = selectedType === key;
          return (
            <Button
              key={key}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(key)}
              className={`text-xs font-mono h-7 px-2.5 gap-1.5 rounded-lg transition-colors ${
                isSelected
                  ? "bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)]"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)] hover:text-[var(--pd-text-primary)]"
              }`}
            >
              <IconComponent className="h-3 w-3" />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Evidence Items List */}
      {filteredEvidence.length === 0 ? (
        <div className="border border-[var(--pd-hairline)] bg-[var(--pd-surface)] rounded-xl p-8 text-center text-xs font-mono text-[var(--pd-text-muted)]">
          No repository evidence found matching the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((item) => {
            const config = typeConfig[item.evidence_type] || {
              label: item.evidence_type,
              icon: FileCode,
              color: "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)]",
            };
            const IconComponent = config.icon;
            const isExpanded = expandedIds[item.id] ?? false;

            return (
              <div key={item.id} className="border border-[var(--pd-hairline)] bg-[var(--pd-surface)] rounded-xl p-4 space-y-3 shadow-sm hover:border-[var(--pd-accent)]/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[var(--pd-surface-raised)] rounded-lg text-[var(--pd-accent)] shrink-0 border border-[var(--pd-hairline)]">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <a
                        href={`${repoUrl}/blob/${item.commit_sha}/${item.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-[var(--pd-text-primary)] hover:text-[var(--pd-accent)] transition-colors"
                      >
                        {item.file_path}
                      </a>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--pd-text-muted)] mt-0.5">
                        {item.language && <span>{item.language}</span>}
                        {item.end_line && (
                          <>
                            <span>&bull;</span>
                            <span>Lines {item.start_line ?? 1}-{item.end_line}</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="font-mono text-[10px]">Hash: {item.evidence_hash.slice(0, 10)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge variant="outline" className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${config.color}`}>
                      {item.evidence_type}
                    </Badge>
                    {item.content_snippet && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                        className="text-xs font-mono h-7 px-2 text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Inspect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Code Snippet Box */}
                {isExpanded && item.content_snippet && (
                  <div className="relative rounded-xl bg-[var(--pd-canvas)] p-3.5 text-[var(--pd-text-body)] text-xs font-mono border border-[var(--pd-hairline)] overflow-x-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--pd-hairline)] text-[11px] text-[var(--pd-text-muted)]">
                      <span>Verbatim Content Extract</span>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(item.id, item.content_snippet)}
                        className="flex items-center gap-1 text-[11px] hover:text-[var(--pd-text-primary)] transition-colors"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 text-[#10B981]" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="pt-2 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                      {item.content_snippet}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
