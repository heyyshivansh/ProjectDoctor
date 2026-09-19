import React, { useState } from "react";
import { RepositoryFile } from "@/types/repository";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-blue-600" />
            Repository File Catalog ({filteredFiles.length} of {files.length})
          </h3>
          <p className="text-xs text-slate-500">
            Catalog of files indexed in commit <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{commitSha.slice(0, 7)}</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Extension Filter */}
          <select
            value={selectedExtension}
            onChange={(e) => setSelectedExtension(e.target.value)}
            className="text-xs h-9 border border-slate-200 rounded-md bg-white px-2.5 text-slate-700 font-medium"
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
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search file path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>
      </div>

      {/* Ignored toggle */}
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeIgnored}
            onChange={(e) => onToggleIncludeIgnored(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Show ignored directories (node_modules, .venv, etc.)</span>
        </label>
      </div>

      {/* Files List Card */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No files found matching the search criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {file.is_binary ? (
                      <FileArchive className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : file.content_status === "security_omitted" ? (
                      <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                    ) : file.language ? (
                      <FileCode2 className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <File className="h-4 w-4 text-slate-400 shrink-0" />
                    )}

                    <span className="font-mono text-slate-800 truncate" title={file.file_path}>
                      {file.file_path}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.language && (
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                        {file.language}
                      </Badge>
                    )}

                    {file.is_binary && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Binary
                      </Badge>
                    )}

                    {file.content_status === "security_omitted" && (
                      <Badge variant="secondary" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                        Secret Omitted
                      </Badge>
                    )}

                    {file.is_ignored && (
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500">
                        Ignored
                      </Badge>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono w-16 text-right">
                      {formatSize(file.file_size_bytes)}
                    </span>

                    <a
                      href={`${repoUrl}/blob/${commitSha}/${file.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View file on GitHub"
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
