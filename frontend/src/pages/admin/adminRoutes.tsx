// src/pages/admin/catalog/CatalogAdminRoutes.tsx
import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";


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
      <NavLink to="parts" className={linkClass}>
        Parts
      </NavLink>
      <NavLink to="colors" className={linkClass}>
        Colors
      </NavLink>
      <NavLink to="part-colors" className={linkClass}>
        Part Colors
      </NavLink>
    </div>
  );
}

/** Layout wrapper for the 3 admin pages */
function CatalogAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">
            Catalog Admin
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            Manage Parts, Colors, and PartColors
          </div>
        </div>

        <AdminTabs />
      </div>

      <div>{children}</div>
    </div>
  );
}

/** -------------------------
 *  ROUTES ENTRYPOINT
 *  Mount this at: /admin/catalog/*
 *  ------------------------- */
export default function CatalogAdminRoutes() {
  return (
    <CatalogAdminLayout>
      <Routes>
        {/* default */}
        <Route index element={<Navigate to="parts" replace />} />

        <Route path="parts" element={<PartsAdminPage />} />
        <Route path="colors" element={<ColorsAdminPage />} />
        <Route path="part-colors" element={<PartColorsPage />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="parts" replace />} />
      </Routes>
    </CatalogAdminLayout>
  );
}

/** -----------------------------------------
 *  PAGE 1: PARTS
 *  Replace this placeholder with your real Parts admin page
 *  ----------------------------------------- */
function PartsAdminPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="text-sm font-extrabold text-slate-900">Parts</div>
      <div className="mt-2 text-sm text-slate-600">
        Replace this with your Parts admin page component code.
      </div>
    </div>
  );
}

/** -----------------------------------------
 *  PAGE 2: COLORS
 *  Replace this placeholder with your real Colors admin page
 *  ----------------------------------------- */
function ColorsAdminPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="text-sm font-extrabold text-slate-900">Colors</div>
      <div className="mt-2 text-sm text-slate-600">
        Replace this with your Colors admin page component code.
      </div>
    </div>
  );
}

/** -----------------------------------------
 *  PAGE 3: PART COLORS
 *  Paste your existing PartColorsPage code here.
 *
 *  IMPORTANT: change `export default function PartColorsPage() { ... }`
 *  to:        `function PartColorsPage() { ... }`
 *  because the default export is already used above.
 *  ----------------------------------------- */

// ✅ Paste your entire PartColorsPage file below this line.
// ✅ Change `export default function PartColorsPage()` to `function PartColorsPage()`.

function PartColorsPage() {
  // PASTE YOUR EXISTING PartColorsPage IMPLEMENTATION HERE
  // (the big code you pasted in chat)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="text-sm font-extrabold text-slate-900">
        PartColorsPage not pasted yet
      </div>
      <div className="mt-2 text-sm text-slate-600">
        Paste your PartColorsPage code here and remove this placeholder.
      </div>
    </div>
  );
}
