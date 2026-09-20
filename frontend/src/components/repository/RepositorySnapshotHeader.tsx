import React, { useState } from "react";
import { RepositoryConnection, RepositorySnapshot } from "@/types/repository";
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
    <div className="space-y-4 text-left">
      {/* Error Alert if sync failed */}
      {connection.status === "error" && connection.error_message && (
        <div className="p-4 bg-[var(--pd-critical)]/10 border border-[var(--pd-critical)]/25 rounded-xl text-[var(--pd-critical)] text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Synchronization Error:</span>
            <p className="font-mono">{connection.error_message}</p>
            {snapshot && (
              <p className="text-[11px] text-[var(--pd-text-muted)]">
                Note: The previous valid snapshot (commit <code>{snapshot.commit_sha.slice(0, 7)}</code>) remains intact.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sync Success / Info Message */}
      {syncMessage && (
        <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl text-[#10B981] text-xs font-mono flex items-center justify-between">
          <span className="font-medium">{syncMessage}</span>
        </div>
      )}

      {/* Snapshot Details Card */}
      <div className="border border-[var(--pd-hairline)] rounded-xl bg-[var(--pd-surface)] p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {snapshot ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="bg-[var(--pd-accent)]/15 text-[var(--pd-accent)] border-[var(--pd-accent)]/30 gap-1.5 py-1 text-xs font-mono font-semibold">
                  <GitCommit className="h-3.5 w-3.5" />
                  Commit <span className="font-mono font-bold">{snapshot.commit_sha.slice(0, 7)}</span>
                </Badge>

                <button
                  type="button"
                  onClick={handleCopySha}
                  title="Copy full SHA"
                  className="p-1 hover:bg-[var(--pd-surface-raised)] rounded-md text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors"
                >
                  {copiedSha ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>

                <a
                  href={`${connection.repo_url}/commit/${snapshot.commit_sha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[var(--pd-text-muted)] hover:text-[var(--pd-accent)] inline-flex items-center gap-1 font-medium transition-colors"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>

                <Badge variant="secondary" className="gap-1 py-1 text-xs font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border border-[var(--pd-hairline)]">
                  <GitBranch className="h-3.5 w-3.5" />
                  {snapshot.branch}
                </Badge>
              </div>

              {snapshot.commit_message && (
                <p className="text-xs text-[var(--pd-text-body)] font-mono bg-[var(--pd-canvas)] p-2.5 rounded-lg border border-[var(--pd-hairline)] max-w-2xl truncate">
                  {snapshot.commit_message}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--pd-text-muted)]">
                <span className="flex items-center gap-1">
                  <Files className="h-3.5 w-3.5" />
                  <strong className="text-[var(--pd-text-primary)]">{snapshot.total_files}</strong> files cataloged
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  {formatSize(snapshot.total_size_bytes)}
                </span>
                {syncDate && (
                  <>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Synchronized {syncDate}
                    </span>
                  </>
                )}
              </div>

              {/* Detected Languages */}
              {snapshot.structure_summary?.languages && Object.keys(snapshot.structure_summary.languages).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-mono font-semibold text-[var(--pd-text-muted)] uppercase tracking-wider flex items-center gap-1 mr-1">
                    <Code2 className="h-3 w-3" />
                    Languages:
                  </span>
                  {Object.entries(snapshot.structure_summary.languages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([lang, count]) => (
                      <span
                        key={lang}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-body)] border border-[var(--pd-hairline)]"
                      >
                        {lang} ({count})
                      </span>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <h3 className="text-sm font-display font-medium text-[var(--pd-text-primary)]">
                No Snapshot Synchronized Yet
              </h3>
              <p className="text-xs font-sans text-[var(--pd-text-muted)] max-w-lg">
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
              className="gap-2 text-xs font-mono bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)] font-medium"
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
                className="text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)]"
              >
                Force Re-sync
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
