import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export const MinimalHeader: React.FC = () => {
  return (
    <header className="border-b border-[#2c303a] bg-[#111317]/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[#f2efe9] hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-[#181a1f] border border-[#2c303a] text-[#d4924f] flex items-center justify-center shadow-[0_0_12px_rgba(212,146,79,0.2)]">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-display font-medium text-lg tracking-tight text-[#f2efe9]">Project Doctor</span>
        </Link>

        <nav className="flex items-center gap-4 text-xs font-mono text-[#888e9b]">
          <Link
            to="/"
            className="hover:text-[#f2efe9] transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4924f]" />
            <span>New Diagnosis</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};
