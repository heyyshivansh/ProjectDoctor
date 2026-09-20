import React from 'react';

interface ReviewDeskLayoutProps {
  children: React.ReactNode;
}

export function ReviewDeskLayout({ children }: ReviewDeskLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--pd-canvas)] text-[var(--pd-text-primary)] font-sans selection:bg-[var(--pd-ai)]/20 selection:text-[var(--pd-ai)]">
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs font-mono text-[var(--pd-text-faint)] border-t border-[var(--pd-border)]">
        Project Doctor &copy; {new Date().getFullYear()} — AI-Powered Technical Project Evaluation
      </footer>
    </div>
  );
}
