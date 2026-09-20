import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export const MinimalHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--pd-border)] bg-[var(--pd-canvas)]/80 backdrop-blur-xl transition-colors">
      <div className="max-w-[1520px] mx-auto px-6 sm:px-12 lg:px-16 h-full flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[var(--pd-text-primary)] hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-md bg-[var(--pd-ai-wash)] border border-[var(--pd-ai)]/20 text-[var(--pd-ai)] flex items-center justify-center">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-sans font-semibold text-base tracking-tight">Project Doctor</span>
        </Link>

        <nav className="flex items-center gap-4 text-xs font-mono text-[var(--pd-text-muted)]">
          <Link
            to="/"
            className="hover:text-[var(--pd-text-primary)] transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--pd-ai)]" />
            <span>New Diagnosis</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};
