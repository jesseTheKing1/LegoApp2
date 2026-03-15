import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PartsAdminPage from "./page/PartsAdminPage";
import ColorsAdminPage from "./page/ColorsAdminPage";
import PartColorsPage from "./page/PartColorsAdminPage";
import ThemesAdminPage from "./page/ThemesAdminPage";
import MinifigsAdminPage from "./page/MinifigsAdminPage";

export default function CatalogAdminRoutes() {
  return (
    <div className="space-y-4">
      <Routes>
        <Route index element={<Navigate to="/admin/parts" replace />} />

        <Route path="parts" element={<PartsAdminPage />} />
        <Route path="colors" element={<ColorsAdminPage />} />
        <Route path="part-colors" element={<PartColorsPage />} />
        <Route path="themes" element={<ThemesAdminPage />} />
        <Route path="minifigs" element={<MinifigsAdminPage />} />

        <Route path="*" element={<Navigate to="/admin/parts" replace />} />
      </Routes>
    </div>
  );
}