import React, { useState } from "react";
import { RepositoryFile } from "@/types/repository";
import { Badge } from "@/components/ui/badge";
import {
  FolderTree,
  Search,
  FileCode2,
  File,
  ShieldAlert,
  FileArchive,
  ExternalLink,
} from "lucide-react";

interface RepositoryFileTreeProps {
  files: RepositoryFile[];
  repoUrl: string;
  commitSha: string;
  includeIgnored: boolean;
  onToggleIncludeIgnored: (val: boolean) => void;
}

export const RepositoryFileTree: React.FC<RepositoryFileTreeProps> = ({
  files,
  repoUrl,
  commitSha,
  includeIgnored,
  onToggleIncludeIgnored,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExtension, setSelectedExtension] = useState<string>("all");

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Collect distinct extensions
  const extensions = Array.from(
    new Set(files.map((f) => f.file_extension).filter((ext): ext is string => Boolean(ext)))
  ).sort();

  const filteredFiles = files.filter((file) => {
    if (selectedExtension !== "all" && file.file_extension !== selectedExtension) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!file.file_path.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-display font-medium text-[var(--pd-text-primary)] flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-[var(--pd-accent)]" />
            Repository File Catalog ({filteredFiles.length} of {files.length})
          </h3>
          <p className="text-xs font-mono text-[var(--pd-text-muted)] mt-0.5">
            Indexed commit <code className="font-mono text-[var(--pd-accent)] bg-[var(--pd-surface-raised)] px-1 py-0.5 rounded border border-[var(--pd-hairline)]">{commitSha.slice(0, 7)}</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Extension Filter */}
          <select
            value={selectedExtension}
            onChange={(e) => setSelectedExtension(e.target.value)}
            className="text-xs font-mono h-9 border border-[var(--pd-hairline)] rounded-lg bg-[var(--pd-surface-raised)] px-2.5 text-[var(--pd-text-body)] focus:outline-none focus:border-[var(--pd-accent)]"
          >
            <option value="all">All Extensions</option>
            {extensions.map((ext) => (
              <option key={ext} value={ext}>
                {ext}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--pd-text-muted)]" />
            <input
              type="text"
              placeholder="Search file path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs font-mono h-9 w-full rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-[var(--pd-text-primary)] placeholder-[var(--pd-text-muted)] focus:outline-none focus:border-[var(--pd-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Ignored toggle */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--pd-text-muted)]">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeIgnored}
            onChange={(e) => onToggleIncludeIgnored(e.target.checked)}
            className="rounded border-[var(--pd-hairline)] bg-[var(--pd-surface)] text-[var(--pd-accent)] focus:ring-[var(--pd-accent)]"
          />
          <span>Show ignored directories (node_modules, .venv, etc.)</span>
        </label>
      </div>

      {/* Files List Card */}
      <div className="border border-[var(--pd-hairline)] bg-[var(--pd-surface)] rounded-xl overflow-hidden shadow-sm">
        {filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[var(--pd-text-muted)]">
            No files found matching the search criteria.
          </div>
        ) : (
          <div className="divide-y divide-[var(--pd-hairline)] max-h-[500px] overflow-y-auto">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-3 flex items-center justify-between hover:bg-[var(--pd-surface-raised)] text-xs transition-colors gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {file.is_binary ? (
                    <FileArchive className="h-4 w-4 text-[#F59E0B] shrink-0" />
                  ) : file.content_status === "security_omitted" ? (
                    <ShieldAlert className="h-4 w-4 text-[#F43F5E] shrink-0" />
                  ) : file.language ? (
                    <FileCode2 className="h-4 w-4 text-[var(--pd-accent)] shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-[var(--pd-text-muted)] shrink-0" />
                  )}

                  <span className="font-mono text-[var(--pd-text-primary)] truncate" title={file.file_path}>
                    {file.file_path}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.language && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)]">
                      {file.language}
                    </Badge>
                  )}

                  {file.is_binary && (
                    <Badge variant="secondary" className="text-[10px] font-mono bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                      Binary
                    </Badge>
                  )}

                  {file.content_status === "security_omitted" && (
                    <Badge variant="secondary" className="text-[10px] font-mono bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30">
                      Secret Omitted
                    </Badge>
                  )}

                  {file.is_ignored && (
                    <Badge variant="secondary" className="text-[10px] font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border border-[var(--pd-hairline)]">
                      Ignored
                    </Badge>
                  )}

                  <span className="text-[11px] text-[var(--pd-text-muted)] font-mono w-16 text-right">
                    {formatSize(file.file_size_bytes)}
                  </span>

                  <a
                    href={`${repoUrl}/blob/${commitSha}/${file.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View file on GitHub"
                    className="p-1 text-[var(--pd-text-muted)] hover:text-[var(--pd-accent)] transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
