import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import CatalogAdminRoutes from "../pages/admin/AdminRoutes";

import { useAuth, Me } from "../auth/AuthContext";
import { RequireAdmin, RequireAuth } from "./guards";

import { HomePage } from "../pages/HomePage";
import { AccountPage } from "../pages/AccountPage";
import { BrowsePage } from "../pages/BrowsePage";
import { Header } from "../components/Header";

export function AppRoutes() {
  const { me, loading, refreshMe } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
            Loading…
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <Routes>
        <Route path="/" element={<HomePage me={me} />} />

        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={async () => {
                await refreshMe();
              }}
            />
          }
        />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage me={me as Me} />
            </RequireAuth>
          }
        />

        <Route path="/browse" element={<BrowsePage />} />

        <Route
          path="/admin/*"
          element={
            <RequireAdmin>
              <CatalogAdminRoutes />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
