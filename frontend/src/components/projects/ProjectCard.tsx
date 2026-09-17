import React from "react";
import { Link } from "react-router-dom";
import { ProjectListItem } from "@/types/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, ArrowRight, Calendar } from "lucide-react";

interface ProjectCardProps {
  project: ProjectListItem;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const formattedDate = new Date(project.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="hover:shadow-md transition-shadow border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-1">
            {project.title}
          </CardTitle>
          <Badge variant="secondary" className="capitalize text-xs font-normal">
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            <span>
              {project.artifact_count} {project.artifact_count === 1 ? "artifact" : "artifacts"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <Link
            to={`/projects/${project.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 text-xs")}
          >
            View Project <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
