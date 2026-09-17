import React, { useState, useRef } from "react";
import { uploadArtifact } from "@/services/projects";
import { Artifact } from "@/types/project";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, UploadCloud, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

interface ArtifactUploadSectionProps {
  projectId: string;
  onUploadSuccess: (newArtifact: Artifact) => void;
}

const CATEGORIES = [
  { value: "proposal", label: "Project Proposal (PDF, DOCX)" },
  { value: "architecture_diagram", label: "Architecture Diagram (PNG, JPG, PDF)" },
  { value: "requirement_doc", label: "Requirements Specification (MD, TXT, PDF)" },
  { value: "report", label: "Technical Report (PDF, DOCX)" },
  { value: "presentation", label: "Presentation Slides (PDF)" },
  { value: "code_archive", label: "Code Archive (ZIP)" },
  { value: "other", label: "Other Project Artifact" },
];

const MAX_SIZE_MB = 25;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const ArtifactUploadSection: React.FC<ArtifactUploadSectionProps> = ({
  projectId,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("proposal");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate size
    if (file.size > MAX_BYTES) {
      setErrorMessage(`File exceeds maximum allowed size of ${MAX_SIZE_MB} MB.`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setErrorMessage("Selected file is empty (0 bytes).");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const newArtifact = await uploadArtifact(projectId, selectedFile, fileType);
      setSuccessMessage(`Successfully uploaded "${selectedFile.name}"`);
      handleClear();
      onUploadSuccess(newArtifact);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Upload failed. Please verify file type and size."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-blue-600" />
          Upload Project Artifact
        </CardTitle>
        <CardDescription>
          Attach proposals, architecture diagrams, specifications, or reports (max {MAX_SIZE_MB} MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Category Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="artifact-category">Artifact Category</Label>
          <select
            id="artifact-category"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            disabled={isUploading}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50/50"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.md,.txt,.docx,.zip"
            disabled={isUploading}
          />
          <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">
            Click to browse or drag and drop your file here
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supported: PDF, PNG, JPG, MD, TXT, DOCX, ZIP (up to {MAX_SIZE_MB} MB)
          </p>
        </div>

        {/* Selected File Badge / Actions */}
        {selectedFile && (
          <div className="p-3 bg-white rounded-md border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate">
                {selectedFile.name}
              </span>
              <span className="text-xs text-slate-500 shrink-0">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isUploading}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
                className="gap-1.5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
