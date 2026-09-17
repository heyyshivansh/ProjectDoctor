import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getBackendHealth } from "@/services/api";
import { getProjects } from "@/services/projects";
import { ProjectListItem } from "@/types/project";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  Check,
  Plus,
  FolderGit2,
  Loader2,
} from "lucide-react";
import { ResponsiveContainer } from "recharts";

export const HomePage: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Projects state
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setBackendStatus("checking");
    const health = await getBackendHealth();
    if (health && health.status === "ok") {
      setBackendStatus("connected");
    } else {
      setBackendStatus("disconnected");
    }
    setLastChecked(new Date());
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectError(null);
    try {
      const res = await getProjects(0, 20);
      setProjects(res.items);
    } catch {
      setProjectError("Unable to fetch projects from backend.");
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    loadProjects();
  }, [checkStatus, loadProjects]);

  const techStack = [
    { name: "React 19", role: "UI Library", verified: true },
    { name: "TypeScript", role: "Type Safety", verified: true },
    { name: "Vite", role: "Bundler & Dev Server", verified: true },
    { name: "Tailwind CSS", role: "Styling Framework", verified: true },
    { name: "shadcn/ui", role: "Component Primitives", verified: true },
    { name: "React Router", role: "Client Routing", verified: true },
    { name: "Recharts", role: "Data Visualization Foundation", verified: typeof ResponsiveContainer === "function" },
    { name: "FastAPI", role: "Backend Framework", verified: backendStatus === "connected" },
    { name: "PostgreSQL & SQLite", role: "Relational Persistence", verified: backendStatus === "connected" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Project Doctor
        </h1>
        <p className="text-slate-600 text-lg">
          AI-Powered Technical Project Evaluation & Diagnosis Platform
        </p>
      </div>

      {/* Projects Overview Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-blue-600" />
                Evaluated Projects
              </CardTitle>
              <CardDescription>
                Manage projects and upload documentation artifacts for technical evaluation.
              </CardDescription>
            </div>
            <Link
              to="/projects/new"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProjects ? (
            <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Loading projects...
            </div>
          ) : projectError ? (
            <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              <p>{projectError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadProjects}
                className="mt-3 gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-3">
              <FolderGit2 className="h-10 w-10 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-700">No projects created yet</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create your first technical project to start submitting artifacts.
                </p>
              </div>
              <Link
                to="/projects/new"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary System Status Box */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">System Status</CardTitle>
              <CardDescription>
                Live verification of application runtime & API connectivity
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkStatus}
              disabled={backendStatus === "checking"}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backendStatus === "checking" ? "animate-spin" : ""}`} />
              Recheck
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frontend Status */}
            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-emerald-800">
                  Frontend
                </div>
                <div className="text-xl font-bold text-emerald-950 mt-1">Running</div>
              </div>
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </Badge>
            </div>

            {/* Backend Status */}
            <div
              className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${
                backendStatus === "connected"
                  ? "bg-emerald-50/70 border-emerald-200"
                  : backendStatus === "disconnected"
                  ? "bg-rose-50/70 border-rose-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div>
                <div
                  className={`text-xs uppercase tracking-wider font-semibold ${
                    backendStatus === "connected"
                      ? "text-emerald-800"
                      : backendStatus === "disconnected"
                      ? "text-rose-800"
                      : "text-slate-600"
                  }`}
                >
                  Backend
                </div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    backendStatus === "connected"
                      ? "text-emerald-950"
                      : backendStatus === "disconnected"
                      ? "text-rose-950"
                      : "text-slate-800"
                  }`}
                >
                  {backendStatus === "connected"
                    ? "Connected"
                    : backendStatus === "disconnected"
                    ? "Disconnected"
                    : "Checking..."}
                </div>
              </div>

              {backendStatus === "connected" && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Online
                </Badge>
              )}
              {backendStatus === "disconnected" && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Offline
                </Badge>
              )}
              {backendStatus === "checking" && (
                <Badge variant="secondary" className="gap-1">
                  Checking
                </Badge>
              )}
            </div>
          </div>

          {lastChecked && (
            <p className="text-xs text-slate-500 text-right">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Technology Foundation Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Foundation Technology Stack
          </CardTitle>
          <CardDescription>
            Core technologies initialized for Checkpoint 1 & Checkpoint 2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="p-3 bg-white rounded-md border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{tech.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{tech.role}</div>
                </div>
                <div className="mt-2.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  Verified
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
