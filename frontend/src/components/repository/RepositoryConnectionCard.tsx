import React, { useState } from "react";
import { RepositoryConnection, RepositoryConnectInput } from "@/types/repository";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                GitHub Repository Association
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Connect a remote repository to deterministically acquire structure, files, and implementation evidence.
              </CardDescription>
            </div>
          </div>

          {connection && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  connection.status === "synced" || connection.status === "connected"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs font-semibold"
                    : "bg-amber-50 text-amber-700 border-amber-200 gap-1 text-xs font-semibold"
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {connection.status.toUpperCase()}
              </Badge>
              {connection.is_private ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" /> Private
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Unlock className="h-3 w-3" /> Public
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {formError && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {connection && !isEditing ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <a
                  href={connection.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-900 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors text-base"
                >
                  {connection.owner}/{connection.repo_name}
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Default Branch: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">{connection.default_branch}</code></span>
                <span>&bull;</span>
                <span>Token: {connection.has_token ? "Configured (Masked)" : "None (Public API)"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs"
              >
                Change Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isSubmitting || isLoading}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="repoUrl" className="text-xs font-semibold text-slate-700">
                GitHub Repository URL <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="repoUrl"
                placeholder="https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Supported format: <code className="bg-slate-100 px-1 py-0.5 rounded">https://github.com/owner/repo</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="token" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Key className="h-3 w-3 text-slate-500" />
                  Personal Access Token (Optional)
                </Label>
                <span className="text-[11px] text-slate-400">Required only for private repositories or elevated rate limits</span>
              </div>
              <Input
                id="token"
                type="password"
                placeholder={connection?.has_token ? "•••••••••••••••• (Leave blank to keep existing token)" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Credentials are encrypted/masked and never sent back in API responses.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                size="sm"
                className="text-xs gap-1.5"
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
                  className="text-xs"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
