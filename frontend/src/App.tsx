import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { CreateProjectPage } from "@/pages/CreateProjectPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="projects/new" element={<CreateProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
