import React from 'react';

interface ReviewDeskLayoutProps {
  children: React.ReactNode;
}

export function ReviewDeskLayout({ children }: ReviewDeskLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--pd-canvas)] text-[var(--pd-text-primary)] font-sans selection:bg-[var(--pd-accent)]/30">
      {/* Background Glow */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 h-[50vh] w-full"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99, 102, 241, 0.08), rgba(56, 189, 248, 0.04), transparent 70%)'
        }}
        aria-hidden="true"
      />
      
      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-[var(--pd-text-muted)] border-t border-[var(--pd-hairline)] bg-[var(--pd-canvas)]">
        Project Doctor &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
