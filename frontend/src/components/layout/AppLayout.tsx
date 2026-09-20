import React from "react";
import { Outlet } from "react-router-dom";
import { MinimalHeader } from "./MinimalHeader";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--pd-canvas)] text-[var(--pd-text-primary)] flex flex-col font-sans antialiased relative selection:bg-[var(--pd-ai)]/20 selection:text-[var(--pd-ai)]">
      {/* Atmospheric Radial Background */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 20% 0%, rgba(139, 92, 246, 0.08), transparent 70%),
              radial-gradient(ellipse 50% 30% at 85% 10%, rgba(244, 63, 94, 0.05), transparent 60%)
            `,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <MinimalHeader />

        <main className="flex-1 w-full max-w-[1520px] mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12">
          <Outlet />
        </main>

        <footer className="py-8 text-center text-xs font-mono text-[var(--pd-text-faint)] border-t border-[var(--pd-border)]">
          Project Doctor &copy; {new Date().getFullYear()} — AI-Powered Technical Project Evaluation
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
