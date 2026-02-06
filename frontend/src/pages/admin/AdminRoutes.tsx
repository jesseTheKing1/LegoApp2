// src/pages/admin/catalog/CatalogAdminRoutes.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PartsAdminPage from "./page/PartColorsAdminPage";       // rename file + import
import ColorsAdminPage from "./page/ColorsAdminPage";
import PartColorsPage from "./page/PartColorsAdminPage";     
import MinifigsAdminPage from "./page/MinifigsAdminPage";
  // optional rename for consistency
export default function CatalogAdminRoutes() {
  return (
    <div className="space-y-4">
      <Routes>
        {/* ✅ when you hit /admin, go to /admin/parts */}
        <Route index element={<Navigate to="parts" replace />} />

        <Route path="parts" element={<PartsAdminPage />} />
        <Route path="colors" element={<ColorsAdminPage />} />
        <Route path="part-colors" element={<PartColorsPage />} />
        <Route path="minifigs" element={<MinifigsAdminPage />} />

        {/* keep it simple */}
        <Route path="*" element={<Navigate to="parts" replace />} />
      </Routes>
    </div>
  );
}
