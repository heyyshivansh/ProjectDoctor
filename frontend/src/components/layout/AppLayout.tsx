import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Activity } from "lucide-react";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
            <Activity className="h-6 w-6 text-blue-600" />
            <span>Project Doctor</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/projects/new"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              New Project
            </Link>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Checkpoint 2: Project Upload + DB
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-4 text-center text-xs text-slate-500">
        Project Doctor &copy; {new Date().getFullYear()} — Technical Project Evaluation Platform
      </footer>
    </div>
  );
};
