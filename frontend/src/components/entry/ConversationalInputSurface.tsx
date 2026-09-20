import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AtmosphericSurface } from "@/components/common/AtmosphericSurface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Paperclip,
  GitBranch,
  ArrowRight,
  X,
  FileText,
} from "lucide-react";
import { AnalysisInputData } from "./AnalysisStage";
import { cn } from "@/lib/utils";

interface ConversationalInputSurfaceProps {
  onSubmit: (data: AnalysisInputData) => void;
  className?: string;
}

type InteractionState = "idle" | "focused" | "composing" | "expanded" | "submitting";

function deriveSuggestedTitle(text: string): string {
  if (!text || !text.trim()) return "";
  // Take first sentence or up to 6 words
  const firstSentence = text.trim().split(/[.\n]/)[0];
  const words = firstSentence.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 50 ? words.slice(0, 47) + "..." : words;
}

export const ConversationalInputSurface: React.FC<ConversationalInputSurfaceProps> = ({
  onSubmit,
  className,
}) => {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [userTouchedTitle, setUserTouchedTitle] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [interactionState, setInteractionState] = useState<InteractionState>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive suggested title deterministically while composing unless user edited it
  useEffect(() => {
    if (!userTouchedTitle && description.trim().length > 0) {
      setTitle(deriveSuggestedTitle(description));
    }
  }, [description, userTouchedTitle]);

  const isExpanded =
    interactionState === "focused" ||
    interactionState === "composing" ||
    interactionState === "expanded" ||
    description.trim().length > 0 ||
    files.length > 0 ||
    githubUrl.trim().length > 0;

  const handleFocus = () => {
    if (interactionState === "idle") {
      setInteractionState("focused");
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    setValidationError(null);
    if (val.trim().length > 0) {
      setInteractionState("composing");
    } else {
      setInteractionState("focused");
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setUserTouchedTitle(true);
    setValidationError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      setInteractionState("expanded");
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanDesc = description.trim();
    if (!cleanDesc || cleanDesc.length < 5) {
      setValidationError("Please share a brief description of what you are building.");
      textareaRef.current?.focus();
      return;
    }

    const cleanTitle = title.trim() || deriveSuggestedTitle(cleanDesc) || "Untitled Project";

    if (
      githubUrl.trim() &&
      !githubUrl.trim().startsWith("http://") &&
      !githubUrl.trim().startsWith("https://")
    ) {
      setValidationError("GitHub URL must begin with http:// or https://");
      return;
    }

    setInteractionState("submitting");
    onSubmit({
      title: cleanTitle,
      description: cleanDesc,
      problemStatement: cleanDesc,
      files,
      githubUrl: githubUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full max-w-2xl mx-auto", className)}>
      <AtmosphericSurface
        variant={isExpanded ? "active" : "default"}
        className="p-4 sm:p-5 transition-all duration-300"
      >
        <div className="space-y-4">
          {/* Main Conversational Description Area */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={description}
              onChange={handleDescriptionChange}
              onFocus={handleFocus}
              rows={isExpanded ? 3 : 2}
              placeholder="e.g. An autonomous drone dispatch system that coordinates emergency medical deliveries to remote clinics using FastAPI and WebSockets..."
              className={cn(
                "w-full resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-base sm:text-lg placeholder:text-slate-400 text-slate-900 bg-transparent leading-relaxed",
                "focus:outline-none"
              )}
              aria-label="Describe your project concept"
            />
          </div>

          {/* Validation Feedback */}
          {validationError && (
            <p className="text-xs text-rose-600 font-medium">{validationError}</p>
          )}

          {/* Naturally Expanded Controls */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pt-3 border-t border-slate-100 overflow-hidden"
              >
                {/* Editable Suggested Title */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <Label
                    htmlFor="project-title-input"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0"
                  >
                    Project Title
                  </Label>
                  <Input
                    id="project-title-input"
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Project Title"
                    className="h-8 text-sm bg-slate-50/70 border-slate-200 focus:bg-white text-slate-800"
                  />
                </div>

                {/* Optional GitHub URL Field */}
                {showGithubInput && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 animate-in fade-in duration-150">
                    <Label
                      htmlFor="project-github-input"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Repository
                    </Label>
                    <div className="relative flex-1">
                      <Input
                        id="project-github-input"
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/organization/repository"
                        className="h-8 text-sm bg-slate-50/70 border-slate-200 focus:bg-white text-slate-800 pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setGithubUrl("");
                          setShowGithubInput(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Remove repository"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Attached File Chips */}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {files.map((file, idx) => (
                      <span
                        key={`${file.name}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-normal"
                      >
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="max-w-[160px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                          title="Remove file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <div className="flex items-center gap-2">
              {/* File Attachment Trigger */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1.5 px-2.5"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Materials</span>
              </Button>

              {/* GitHub Trigger */}
              {!showGithubInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGithubInput(true)}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1.5 px-2.5"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Connect GitHub</span>
                </Button>
              )}
            </div>

            {/* Primary Submit Trigger */}
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 text-xs sm:text-sm font-medium gap-1.5 bg-slate-900 text-white hover:bg-slate-800 transition-all rounded-xl"
            >
              <span>Begin Diagnosis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </AtmosphericSurface>
    </form>
  );
};
