import React from "react";
import { Outlet } from "react-router-dom";
import { MinimalHeader } from "./MinimalHeader";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--pd-canvas)] text-[var(--pd-text-primary)] flex flex-col font-sans antialiased relative selection:bg-[var(--pd-ai)]/20 selection:text-[var(--pd-ai)]">
      <div className="relative flex flex-col min-h-screen">
        <MinimalHeader />

        <main className="flex-1 w-full max-w-[1520px] mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12">
          <Outlet />
        </main>

        <footer className="py-6 text-center text-xs font-mono text-[var(--pd-text-faint)] border-t border-[var(--pd-border)]">
          Project Doctor &copy; {new Date().getFullYear()} — AI-Powered Technical Project Evaluation
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
