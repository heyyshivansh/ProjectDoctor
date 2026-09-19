import React, { useState } from "react";
import { RepositoryConnection, RepositorySnapshot } from "@/types/repository";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitCommit,
  GitBranch,
  RefreshCw,
  Loader2,
  Calendar,
  Files,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Code2,
} from "lucide-react";

interface RepositorySnapshotHeaderProps {
  connection: RepositoryConnection;
  snapshot: RepositorySnapshot | null;
  onSync: (force?: boolean) => Promise<void>;
  isSyncing: boolean;
  syncMessage: string | null;
}

export const RepositorySnapshotHeader: React.FC<RepositorySnapshotHeaderProps> = ({
  connection,
  snapshot,
  onSync,
  isSyncing,
  syncMessage,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);

  const handleCopySha = () => {
    if (!snapshot) return;
    navigator.clipboard.writeText(snapshot.commit_sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const syncDate = connection.last_sync_at
    ? new Date(connection.last_sync_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Error Alert if sync failed */}
      {connection.status === "error" && connection.error_message && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Synchronization Error:</span>
            <p className="font-mono">{connection.error_message}</p>
            {snapshot && (
              <p className="text-[11px] text-rose-700">
                Note: The previous valid snapshot (commit <code>{snapshot.commit_sha.slice(0, 7)}</code>) remains intact.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sync Success / Info Message */}
      {syncMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
          <span className="font-medium">{syncMessage}</span>
        </div>
      )}

      {/* Snapshot Details Card */}
      <Card className="border border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-white">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {snapshot ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1.5 py-1 text-xs font-semibold">
                    <GitCommit className="h-3.5 w-3.5" />
                    Commit <span className="font-mono font-bold">{snapshot.commit_sha.slice(0, 7)}</span>
                  </Badge>

                  <button
                    type="button"
                    onClick={handleCopySha}
                    title="Copy full SHA"
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {copiedSha ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  <a
                    href={`${connection.repo_url}/commit/${snapshot.commit_sha}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 font-medium transition-colors"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <Badge variant="secondary" className="gap-1 py-1 text-xs">
                    <GitBranch className="h-3.5 w-3.5" />
                    {snapshot.branch}
                  </Badge>
                </div>

                {snapshot.commit_message && (
                  <p className="text-xs text-slate-700 font-mono bg-white p-2 rounded border border-slate-200 max-w-2xl truncate">
                    {snapshot.commit_message}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Files className="h-3.5 w-3.5 text-slate-400" />
                    <strong>{snapshot.total_files}</strong> files cataloged
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                    {formatSize(snapshot.total_size_bytes)}
                  </span>
                  {syncDate && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Synchronized {syncDate}
                      </span>
                    </>
                  )}
                </div>

                {/* Detected Languages */}
                {snapshot.structure_summary?.languages && Object.keys(snapshot.structure_summary.languages).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                      <Code2 className="h-3 w-3" />
                      Languages:
                    </span>
                    {Object.entries(snapshot.structure_summary.languages)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([lang, count]) => (
                        <span
                          key={lang}
                          className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-medium border border-slate-200"
                        >
                          {lang} ({count})
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  No Snapshot Synchronized Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-lg">
                  Click &ldquo;Synchronize Repository&rdquo; to fetch the latest commit, catalog the file tree, and extract deterministic implementation evidence.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                onClick={() => onSync(false)}
                disabled={isSyncing}
                size="sm"
                className="gap-2 text-xs font-semibold"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {snapshot ? "Sync Latest Commit" : "Synchronize Repository"}
                  </>
                )}
              </Button>

              {snapshot && (
                <Button
                  onClick={() => onSync(true)}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                  title="Force re-inspection even if commit SHA is unchanged"
                  className="text-xs text-slate-600"
                >
                  Force Re-sync
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
