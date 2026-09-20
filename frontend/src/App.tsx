import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EntryPage } from "@/pages/EntryPage";

// Code-split ReviewDeskPage for fast initial entry load
const ReviewDeskPage = lazy(() => import("@/pages/ReviewDeskPage"));

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Entry / Landing Layout with MinimalHeader */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<EntryPage />} />
          <Route path="projects/new" element={<Navigate to="/" replace />} />
        </Route>

        {/* Full Cinematic Review Desk with ReviewDeskHeader & Navigation */}
        <Route
          path="projects/:projectId"
          element={
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-[var(--pd-canvas)]">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--pd-hairline)] border-t-[var(--pd-accent)] animate-spin" />
                  <p className="text-sm font-mono text-[var(--pd-text-muted)] font-medium">
                    Opening Technical Review Desk...
                  </p>
                </div>
              }
            >
              <ReviewDeskPage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
