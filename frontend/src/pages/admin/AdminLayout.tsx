// src/pages/admin/AdminLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Headerless AdminLayout.
 * The main App header switches into Admin Mode on /admin routes.
 */
export default function AdminLayout() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,6,23,0.08)]">
          <div className="bg-[radial-gradient(900px_500px_at_10%_0%,rgba(15,23,42,0.10),transparent)] p-4 sm:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
