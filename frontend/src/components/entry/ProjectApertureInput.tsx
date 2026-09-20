import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Paperclip, Github, X, FileText, CheckCircle2 } from "lucide-react";
import { TactileSurface } from "@/components/shared/TactileSurface";
import { SpotlightAperture } from "@/components/shared/SpotlightAperture";
import { cn } from "@/lib/utils";

export interface ProjectApertureSubmitData {
  title: string;
  problemStatement: string;
  description: string;
  githubRepoUrl?: string;
  files: File[];
}

interface ProjectApertureInputProps {
  onSubmit: (data: ProjectApertureSubmitData) => void;
  isSubmitting?: boolean;
}

/**
 * ProjectApertureInput: The central conversational input aperture on the Entry page.
 * Styled with Project Doctor obsidian tactile surfaces and iridescent focus highlights.
 */
export const ProjectApertureInput: React.FC<ProjectApertureInputProps> = ({
  onSubmit,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showGithub, setShowGithub] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isTitleValid = title.trim().length >= 3;
  const isDescriptionValid = description.trim().length >= 10;
  const canSubmit = isTitleValid && isDescriptionValid && !isSubmitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      title: title.trim(),
      problemStatement: description.trim(),
      description: description.trim(),
      githubRepoUrl: githubUrl.trim() || undefined,
      files,
    });
  };

  return (
    <SpotlightAperture className="w-full max-w-2xl mx-auto shadow-2xl shadow-black/80">
      <TactileSurface elevation="floating" className="p-6 sm:p-8 bg-[var(--pd-surface)]/95 border-[var(--pd-hairline)] text-[var(--pd-text-primary)] rounded-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Title Field */}
          <div className="space-y-2 text-left">
            <label
              htmlFor="aperture-title"
              className="block text-xs font-mono uppercase tracking-widest text-[var(--pd-text-muted)]"
            >
              Project Name
            </label>
            <input
              id="aperture-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Autonomous Dispatch Engine"
              disabled={isSubmitting}
              className="w-full text-lg sm:text-2xl font-display font-medium text-[var(--pd-text-primary)] placeholder:[var(--pd-text-muted)] bg-transparent border-b border-[var(--pd-hairline)] focus:border-[var(--pd-accent)] focus:outline-none py-2 transition-colors"
              required
            />
          </div>

          {/* Project Overview / Objectives */}
          <div className="space-y-2 text-left">
            <label
              htmlFor="aperture-description"
              className="block text-xs font-mono uppercase tracking-widest text-[var(--pd-text-muted)]"
            >
              System Scope & Architecture Overview
            </label>
            <textarea
              id="aperture-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail your system architecture, technical objectives, core modules, and primary user flows..."
              rows={3}
              disabled={isSubmitting}
              className="w-full text-sm sm:text-base font-sans text-[var(--pd-text-body)] placeholder:[var(--pd-text-muted)] bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] rounded-xl p-4 focus:border-[var(--pd-accent)] focus:outline-none transition-all resize-none leading-relaxed"
              required
            />
          </div>

          {/* Optional Disclosures */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowFiles((prev) => !prev)}
                disabled={isSubmitting}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-mono px-3.5 py-2 rounded-lg border transition-all",
                  showFiles || files.length > 0
                    ? "bg-[var(--pd-accent)]/20 text-[var(--pd-accent)] border-[var(--pd-accent)]/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                    : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)] hover:text-[var(--pd-text-primary)]"
                )}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Specifications</span>
                {files.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-[var(--pd-accent)]/30 rounded-full text-[10px] text-[var(--pd-text-primary)]">
                    {files.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowGithub((prev) => !prev)}
                disabled={isSubmitting}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-mono px-3.5 py-2 rounded-lg border transition-all",
                  showGithub || githubUrl
                    ? "bg-[var(--pd-accent)]/20 text-[var(--pd-accent)] border-[var(--pd-accent)]/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                    : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-hairline)] hover:text-[var(--pd-text-primary)]"
                )}
              >
                <Github className="w-3.5 h-3.5" />
                <span>Connect GitHub Repository</span>
              </button>
            </div>

            {/* GitHub URL Disclosure */}
            <AnimatePresence>
              {showGithub && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-1.5 text-left"
                >
                  <label
                    htmlFor="aperture-github"
                    className="block text-xs font-mono uppercase tracking-widest text-[var(--pd-text-muted)]"
                  >
                    Public or Private GitHub Repository
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--pd-text-muted)]" />
                    <input
                      id="aperture-github"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/organization/repository"
                      disabled={isSubmitting}
                      className="w-full text-xs font-mono text-[var(--pd-text-primary)] placeholder:[var(--pd-text-muted)] bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] rounded-xl py-3 pl-10 pr-4 focus:border-[var(--pd-accent)] focus:outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File Upload Attachment Disclosure */}
            <AnimatePresence>
              {showFiles && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-2.5"
                >
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border border-dashed border-[var(--pd-hairline)] hover:border-[var(--pd-accent)]/50 rounded-xl p-4 text-center bg-[var(--pd-surface-raised)]/60 hover:bg-[var(--pd-surface-raised)] transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.md"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs font-mono text-[var(--pd-text-muted)]">
                      Drop SRS, architecture specs, or requirement docs here (PDF, DOCX, TXT, MD)
                    </p>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-mono px-3.5 py-2 bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] rounded-lg text-[var(--pd-text-primary)]"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-[var(--pd-accent)]" />
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-[var(--pd-text-muted)] hover:text-[var(--pd-critical)] ml-2"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-[var(--pd-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-mono text-[var(--pd-text-muted)] text-left">
              {title.length > 0 && title.length < 3 && "Project name requires 3+ characters"}
              {title.length >= 3 && description.length < 10 && "Overview requires 10+ characters"}
              {canSubmit && (
                <span className="text-[#10B981] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for diagnosis
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all",
                canSubmit
                  ? "bg-[var(--pd-accent)] text-white font-semibold hover:bg-[var(--pd-accent-hover)] shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.98]"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] cursor-not-allowed border border-[var(--pd-hairline)]"
              )}
            >
              <span>Begin Technical Diagnosis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </TactileSurface>
    </SpotlightAperture>
  );
};
