import React from "react";
import { Outlet } from "react-router-dom";
import { MinimalHeader } from "./MinimalHeader";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#111317] text-[#f2efe9] flex flex-col font-sans antialiased relative selection:bg-[#d4924f]/30 selection:text-[#f2efe9]">
      {/* Subtle ambient copper-amber glow at the top of the canvas */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212, 146, 79, 0.12), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MinimalHeader />

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Outlet />
        </main>

        <footer className="py-8 text-center text-xs text-[#888e9b] border-t border-[#2c303a] font-mono">
          Project Doctor &copy; {new Date().getFullYear()} — AI-Powered Technical Project Evaluation Platform
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
