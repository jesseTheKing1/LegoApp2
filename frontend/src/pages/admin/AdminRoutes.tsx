// src/pages/admin/catalog/CatalogAdminRoutes.tsx
import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import PartsAdminPage from "./page/PartsAdinPage";
import ColorsAdminPage from "./page/ColorsAdminPage";
import PartColorsPage from "./page/PartColorsAdminPage";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const tabBase =
  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold border transition";
const tabActive = "bg-slate-900 text-white border-slate-900";
const tabIdle =
  "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300";

function AdminTabs() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(tabBase, isActive ? tabActive : tabIdle);

  return (
    <div className="flex flex-wrap items-center gap-2">
    </div>
  );
}

export default function CatalogAdminRoutes() {
  return (
    <div className="space-y-4">
      {/* ✅ you wanted to remove the "Catalog Admin / Manage..." header,
          so we only keep tabs (or delete this too if you want zero header) */}
      <div className="flex items-center justify-end">
        <AdminTabs />
      </div>

      <Routes>
        {/* ✅ when you hit /admin, go to parts */}
        <Route index element={<Navigate to="/admin/parts" replace />} />

        <Route path="parts" element={<PartsAdminPage />} />
        <Route path="colors" element={<ColorsAdminPage />} />
        <Route path="part-colors" element={<PartColorsPage />} />

        <Route path="*" element={<Navigate to="/admin/parts" replace />} />
      </Routes>
    </div>
  );
}
