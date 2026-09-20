import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EntryPage } from "@/pages/EntryPage";

// Dynamically code-split ProjectStudioPage so GSAP and Studio bundles are not loaded on Entry route
const ProjectStudioPage = lazy(() => import("@/pages/ProjectStudioPage"));

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Root Invitational Entry Experience */}
          <Route index element={<EntryPage />} />

          {/* New Project creation is integrated into the Entry surface */}
          <Route path="projects/new" element={<Navigate to="/" replace />} />

          {/* Diagnostic Studio Orchestrator (Lazy Loaded with GSAP isolated) */}
          <Route
            path="projects/:projectId"
            element={
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Opening Studio...</p>
                  </div>
                }
              >
                <ProjectStudioPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
