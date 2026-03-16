// src/pages/admin/catalog/CatalogAdminRoutes.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";


import ColorsAdminPage from "./page/ColorsAdminPage";
import PartColorsPage from "./page/PartColorsAdminPage";
import ThemesAdminPage from "./page/ThemesAdminPage";
import MinifigsAdminPage from "./page/MinifigsAdminPage";
import PartsAdminPage from "./page/PartsAdinPage";
import InventoryDashboardPage from "./page/InventoryDashboardPage";
import InventoryLocationsPage from "./page/InventoryLocationsPage";
import InventoryRecordsPage from "./page/InventoryRecordsPage";
import SetsAdminPage from "./page/SetsAdminPage";

export default function CatalogAdminRoutes() {
  return (
    <div className="space-y-4">
      <Routes>
        <Route index element={<Navigate to="/admin/parts" replace />} />

        <Route path="parts" element={<PartsAdminPage />} />
        <Route path="colors" element={<ColorsAdminPage />} />
        <Route path="part-colors" element={<PartColorsPage />} />
        <Route path="themes" element={<ThemesAdminPage />} />
        <Route path="sets" element={<SetsAdminPage />} />
        <Route path="minifigs" element={<MinifigsAdminPage />} />
        <Route path="inventory" element={<InventoryDashboardPage />} />
        <Route path="inventory/records" element={<InventoryRecordsPage />} />
        <Route path="inventory/locations" element={<InventoryLocationsPage />} />

        <Route path="*" element={<Navigate to="/admin/parts" replace />} />
      </Routes>
    </div>
  );
}