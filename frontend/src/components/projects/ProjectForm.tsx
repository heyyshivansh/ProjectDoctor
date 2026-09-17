import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "@/services/projects";
import { ProjectCreateInput } from "@/types/project";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

export const ProjectForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ProjectCreateInput>({
    title: "",
    problem_statement: "",
    description: "",
    requirements: "",
    tech_stack: [],
    architecture_summary: "",
    github_repo_url: "",
  });

  const [techStackInput, setTechStackInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTechStackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTechStackInput(e.target.value);
    const parsed = e.target.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setFormData((prev) => ({ ...prev, tech_stack: parsed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setErrorMessage("Title must be at least 3 characters long.");
      return;
    }
    if (!formData.problem_statement.trim() || formData.problem_statement.trim().length < 10) {
      setErrorMessage("Problem Statement must be at least 10 characters long.");
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setErrorMessage("Description must be at least 10 characters long.");
      return;
    }
    if (
      formData.github_repo_url &&
      !formData.github_repo_url.startsWith("http://") &&
      !formData.github_repo_url.startsWith("https://")
    ) {
      setErrorMessage("GitHub Repository URL must start with http:// or https://");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ProjectCreateInput = {
        title: formData.title.trim(),
        problem_statement: formData.problem_statement.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements?.trim() || undefined,
        tech_stack: formData.tech_stack?.length ? formData.tech_stack : undefined,
        architecture_summary: formData.architecture_summary?.trim() || undefined,
        github_repo_url: formData.github_repo_url?.trim() || undefined,
      };

      const created = await createProject(payload);
      navigate(`/projects/${created.id}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create project. Please check inputs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Create New Project
        </CardTitle>
        <CardDescription>
          Provide technical project metadata to establish the evaluation baseline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Project Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Autonomous Smart Grid Optimizer"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Problem Statement */}
          <div className="space-y-2">
            <Label htmlFor="problem_statement">
              Problem Statement <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="problem_statement"
              name="problem_statement"
              value={formData.problem_statement}
              onChange={handleChange}
              placeholder="What technical problem or inefficiency does this project solve?"
              rows={3}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Project Description <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Comprehensive summary of what the project does and how it works."
              rows={4}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements">
              Project Requirements <span className="text-xs text-slate-500 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="requirements"
              name="requirements"
              value={formData.requirements || ""}
              onChange={handleChange}
              placeholder="List known functional or non-functional requirements (e.g. R1: <50ms telemetry, R2: JWT auth)"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Technology Stack */}
          <div className="space-y-2">
            <Label htmlFor="tech_stack">
              Technology Stack <span className="text-xs text-slate-500 font-normal">(Optional, comma-separated)</span>
            </Label>
            <Input
              id="tech_stack"
              name="tech_stack"
              value={techStackInput}
              onChange={handleTechStackChange}
              placeholder="FastAPI, React, PostgreSQL, Tailwind, Docker"
              disabled={isSubmitting}
            />
          </div>

          {/* Architecture Summary */}
          <div className="space-y-2">
            <Label htmlFor="architecture_summary">
              Architecture Summary <span className="text-xs text-slate-500 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="architecture_summary"
              name="architecture_summary"
              value={formData.architecture_summary || ""}
              onChange={handleChange}
              placeholder="Key architectural components, data pipelines, or external service interactions."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* GitHub Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="github_repo_url">
              GitHub Repository URL <span className="text-xs text-slate-500 font-normal">(Optional)</span>
            </Label>
            <Input
              id="github_repo_url"
              name="github_repo_url"
              type="url"
              value={formData.github_repo_url || ""}
              onChange={handleChange}
              placeholder="https://github.com/organization/repository"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
