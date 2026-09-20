import React, { useState } from "react";
import { RepositoryConnection, RepositoryConnectInput } from "@/types/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GitFork,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Lock,
  Unlock,
  Key,
  Trash2,
} from "lucide-react";

interface RepositoryConnectionCardProps {
  connection: RepositoryConnection | null;
  onConnect: (input: RepositoryConnectInput) => Promise<void>;
  onDisconnect: () => Promise<void>;
  isLoading: boolean;
}

export const RepositoryConnectionCard: React.FC<RepositoryConnectionCardProps> = ({
  connection,
  onConnect,
  onDisconnect,
  isLoading,
}) => {
  const [repoUrl, setRepoUrl] = useState(connection?.repo_url || "");
  const [token, setToken] = useState("");
  const [isEditing, setIsEditing] = useState(!connection);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!repoUrl.trim()) {
      setFormError("Repository URL is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConnect({
        repo_url: repoUrl.trim(),
        access_token: token.trim() || undefined,
      });
      setIsEditing(false);
      setToken("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to connect repository.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect this repository? All snapshots and evidence will be removed.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onDisconnect();
      setIsEditing(true);
      setRepoUrl("");
      setToken("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to disconnect repository.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-[var(--pd-hairline)] bg-[var(--pd-surface)] rounded-xl p-5 sm:p-6 shadow-sm text-left space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--pd-hairline)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--pd-surface-raised)] text-[var(--pd-accent)] rounded-lg shrink-0 border border-[var(--pd-hairline)]">
            <GitFork className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-display font-medium text-[var(--pd-text-primary)]">
              GitHub Repository Association
            </h3>
            <p className="text-xs font-mono text-[var(--pd-text-muted)] mt-0.5">
              Connect a remote repository to deterministically acquire structure, files, and implementation evidence.
            </p>
          </div>
        </div>

        {connection && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-mono font-semibold ${
                connection.status === "synced" || connection.status === "connected"
                  ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 gap-1"
                  : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30 gap-1"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {connection.status.toUpperCase()}
            </Badge>
            {connection.is_private ? (
              <Badge variant="secondary" className="gap-1 text-xs font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border border-[var(--pd-hairline)]">
                <Lock className="h-3 w-3" /> Private
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs font-mono bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border border-[var(--pd-hairline)]">
                <Unlock className="h-3 w-3" /> Public
              </Badge>
            )}
          </div>
        )}
      </div>

      {formError && (
        <div className="p-3 text-xs font-mono bg-[var(--pd-critical)]/10 border border-[var(--pd-critical)]/25 text-[var(--pd-critical)] rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {connection && !isEditing ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] rounded-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <a
                href={connection.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-[var(--pd-text-primary)] hover:text-[var(--pd-accent)] inline-flex items-center gap-1.5 transition-colors text-base"
              >
                {connection.owner}/{connection.repo_name}
                <ExternalLink className="h-3.5 w-3.5 text-[var(--pd-text-muted)]" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--pd-text-muted)]">
              <span>Default Branch: <code className="bg-[var(--pd-canvas)] px-1.5 py-0.5 rounded border border-[var(--pd-hairline)] font-semibold text-[var(--pd-text-primary)]">{connection.default_branch}</code></span>
              <span>&bull;</span>
              <span>Token: {connection.has_token ? "Configured (Masked)" : "None (Public API)"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs font-mono bg-[var(--pd-surface)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] hover:bg-[var(--pd-hairline)]"
            >
              Change Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isSubmitting || isLoading}
              className="text-xs font-mono text-[var(--pd-critical)] hover:bg-[var(--pd-critical)]/10 border-[var(--pd-critical)]/30"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="repoUrl" className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
              GitHub Repository URL <span className="text-[var(--pd-critical)]">*</span>
            </Label>
            <Input
              id="repoUrl"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isSubmitting || isLoading}
              className="font-mono text-xs bg-[var(--pd-canvas)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] focus:border-[var(--pd-accent)]"
            />
            <p className="text-[11px] font-mono text-[var(--pd-text-muted)]">
              Format: <code className="bg-[var(--pd-surface-raised)] px-1 py-0.5 rounded border border-[var(--pd-hairline)]">https://github.com/owner/repo</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="token" className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1">
                <Key className="h-3 w-3 text-[var(--pd-text-muted)]" />
                Personal Access Token (Optional)
              </Label>
              <span className="text-[11px] font-mono text-[var(--pd-text-muted)]">Required for private repos</span>
            </div>
            <Input
              id="token"
              type="password"
              placeholder={connection?.has_token ? "•••••••••••••••• (Leave blank to keep existing)" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isSubmitting || isLoading}
              className="font-mono text-xs bg-[var(--pd-canvas)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] focus:border-[var(--pd-accent)]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              size="sm"
              className="text-xs font-mono bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)] gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <GitFork className="h-3.5 w-3.5" />
                  {connection ? "Update Association" : "Connect Repository"}
                </>
              )}
            </Button>
            {connection && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs font-mono text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)]"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
