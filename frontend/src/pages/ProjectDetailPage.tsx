import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProject } from "@/services/projects";
import { ProjectDetail, Artifact } from "@/types/project";
import { ArtifactUploadSection } from "@/components/projects/ArtifactUploadSection";
import { ArtifactList } from "@/components/projects/ArtifactList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Layers,
  FileCode,
  Loader2,
  AlertCircle,
  RefreshCw,
  Cpu,
} from "lucide-react";

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load project details."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleArtifactUploaded = (newArtifact: Artifact) => {
    if (!project) return;
    setProject({
      ...project,
      artifacts: [newArtifact, ...project.artifacts],
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm inline-flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Project not found."}</span>
        </div>
        <div>
          <Button variant="outline" onClick={fetchProjectData} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
        <div>
          <Link to="/" className={buttonVariants({ variant: "link" })}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const createdDate = new Date(project.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>
        <Badge variant="secondary" className="capitalize text-xs">
          Status: {project.status}
        </Badge>
      </div>

      {/* Project Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {project.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Created on {createdDate}
              </span>
              <span>&bull;</span>
              <span>ID: <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{project.id}</code></span>
            </div>
          </div>

          {project.github_repo_url && (
            <a
              href={project.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs shrink-0")}
            >
              <FileCode className="h-4 w-4" />
              GitHub Repository
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Project Metadata Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problem Statement Card */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Problem Statement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {project.problem_statement}
          </CardContent>
        </Card>

        {/* Project Description Card */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Project Description
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {project.description}
          </CardContent>
        </Card>
      </div>

      {/* Requirements & Architecture & Tech Stack Details */}
      {(project.requirements || project.architecture_summary || (project.tech_stack && project.tech_stack.length > 0)) && (
        <Card className="border border-slate-200">
          <CardContent className="pt-6 space-y-6">
            {project.tech_stack && project.tech_stack.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  Technology Stack
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {project.tech_stack.map((tech) => (
                    <Badge key={tech} variant="outline" className="bg-slate-50 text-slate-800">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {project.requirements && (
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Initial Requirements
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {project.requirements}
                </p>
              </div>
            )}

            {project.architecture_summary && (
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Architecture Overview
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {project.architecture_summary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Artifacts Management Section */}
      <div className="space-y-6">
        <ArtifactUploadSection
          projectId={project.id}
          onUploadSuccess={handleArtifactUploaded}
        />

        <ArtifactList
          projectId={project.id}
          artifacts={project.artifacts}
        />
      </div>
    </div>
  );
};
