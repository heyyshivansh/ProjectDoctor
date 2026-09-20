import React from "react";
import { Outlet } from "react-router-dom";
import { MinimalHeader } from "./MinimalHeader";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--pd-canvas)] text-[var(--pd-text-primary)] flex flex-col font-sans antialiased relative selection:bg-[var(--pd-accent)]/30 selection:text-[var(--pd-text-primary)]">
      {/* Subtle ambient iridescent glow at the top of the canvas */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% -10%, rgba(99, 102, 241, 0.08), transparent 60%), radial-gradient(ellipse 70% 50% at 70% -10%, rgba(56, 189, 248, 0.04), transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MinimalHeader />

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Outlet />
        </main>

        <footer className="py-8 text-center text-xs text-[var(--pd-text-muted)] border-t border-[var(--pd-hairline)] font-mono">
          Project Doctor &copy; {new Date().getFullYear()} — AI-Powered Technical Project Evaluation Platform
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
