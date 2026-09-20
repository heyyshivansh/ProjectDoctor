import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export const MinimalHeader: React.FC = () => {
  return (
    <header className="border-b border-[var(--pd-hairline)] bg-[var(--pd-canvas)]/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[var(--pd-text-primary)] hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] text-[var(--pd-accent)] flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)]">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-display font-medium text-lg tracking-tight text-[var(--pd-text-primary)]">Project Doctor</span>
        </Link>

        <nav className="flex items-center gap-4 text-xs font-mono text-[var(--pd-text-muted)]">
          <Link
            to="/"
            className="hover:text-[var(--pd-text-primary)] transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--pd-accent)]" />
            <span>New Diagnosis</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};
