import React, { useState } from "react";
import { RepositoryEvidence } from "@/types/repository";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    manifest: { label: "Manifests & Packages", icon: Layers, color: "bg-purple-50 text-purple-700 border-purple-200" },
    configuration: { label: "Configurations", icon: Settings, color: "bg-blue-50 text-blue-700 border-blue-200" },
    entrypoint: { label: "Entry Points", icon: FileCode, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    test_suite: { label: "Test Suites", icon: ShieldCheck, color: "bg-amber-50 text-amber-700 border-amber-200" },
    documentation: { label: "Documentation", icon: BookOpen, color: "bg-slate-100 text-slate-700 border-slate-300" },
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Structured Repository Evidence ({evidence.length})
          </h3>
          <p className="text-xs text-slate-500">
            Verifiable facts deterministically extracted from repository manifests, configurations, and code entrypoints.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search evidence path or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          variant={selectedType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("all")}
          className="text-xs h-7 px-2.5"
        >
          All Types ({evidence.length})
        </Button>
        {Object.entries(typeConfig).map(([key, config]) => {
          const count = evidence.filter((e) => e.evidence_type === key).length;
          if (count === 0) return null;
          const IconComponent = config.icon;
          return (
            <Button
              key={key}
              variant={selectedType === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(key)}
              className="text-xs h-7 px-2.5 gap-1.5"
            >
              <IconComponent className="h-3 w-3" />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Evidence Items List */}
      {filteredEvidence.length === 0 ? (
        <Card className="border border-slate-200">
          <CardContent className="p-8 text-center text-xs text-slate-500">
            No repository evidence found matching the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((item) => {
            const config = typeConfig[item.evidence_type] || {
              label: item.evidence_type,
              icon: FileCode,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };
            const IconComponent = config.icon;
            const isExpanded = expandedIds[item.id] ?? false;

            return (
              <Card key={item.id} className="border border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded text-slate-700 shrink-0">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <a
                          href={`${repoUrl}/blob/${item.commit_sha}/${item.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {item.file_path}
                        </a>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
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
                      <Badge variant="outline" className={`text-[11px] uppercase tracking-wider font-semibold ${config.color}`}>
                        {item.evidence_type}
                      </Badge>
                      {item.content_snippet && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(item.id)}
                          className="text-xs h-7 px-2 text-slate-600 gap-1"
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
                    <div className="relative rounded-md bg-slate-950 p-3 pt-2 text-slate-200 text-xs font-mono border border-slate-800 overflow-x-auto">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                        <span>Verbatim Content Extract</span>
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(item.id, item.content_snippet)}
                          className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
