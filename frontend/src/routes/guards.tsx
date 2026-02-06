import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;
  if (!isAuthed) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthed, isAdmin, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;
  if (!isAuthed) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
