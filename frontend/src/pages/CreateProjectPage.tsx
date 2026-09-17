import React from "react";
import { Link } from "react-router-dom";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ArrowLeft } from "lucide-react";

export const CreateProjectPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>
      </div>

      <ProjectForm />
    </div>
  );
};
