import React from 'react';

interface ReviewDeskLayoutProps {
  children: React.ReactNode;
}

export function ReviewDeskLayout({ children }: ReviewDeskLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--pd-canvas)] text-[var(--pd-text-primary)] font-sans selection:bg-[var(--pd-ai)]/20 selection:text-[var(--pd-ai)]">
      {/* Main Content */}
      <main className="relative flex-1 flex flex-col pb-28">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs font-mono text-[var(--pd-text-faint)] border-t border-[var(--pd-border)]">
        Project Doctor &copy; {new Date().getFullYear()} — AI-Powered Technical Project Evaluation
      </footer>
    </div>
  );
}
