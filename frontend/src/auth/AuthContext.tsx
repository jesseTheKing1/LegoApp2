// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { clearTokens, getAccessToken } from "./tokens";

export type Me = {
  id: number;
  email: string;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
};

type AuthContextValue = {
  me: Me | null;
  loading: boolean;
  refreshMe: () => Promise<Me | null>;
  logout: () => void;
  isAuthed: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<Me | null> {
  // IMPORTANT:
  // Do NOT manually attach headers here.
  // Axios client already attaches token and auto-refreshes if needed.
  // Also: if there's no access token at all, we can return null quickly.
  if (!getAccessToken()) return null;

  try {
    const res = await api.get(ENDPOINTS.me);
    const user = res.data as Me;
    localStorage.setItem("auth_user", JSON.stringify(user));
    return user;
  } catch {
    // Keep the last verified identity during a temporary network outage.
    // Invalid/expired credentials are cleared by the API interceptor.
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null") as Me | null;
    } catch {
      return null;
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null") as Me | null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    setLoading(true);
    const user = await fetchMe();
    setMe(user);
    setLoading(false);
    return user;
  }

  function logout() {
    clearTokens();
    setMe(null);
    // optional: broadcast so other listeners/tabs can react
    window.dispatchEvent(new Event("auth:logout"));
  }

  // On first mount, hydrate auth state
  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If api/client.ts decides refresh failed, it dispatches "auth:logout"
  useEffect(() => {
    function onForcedLogout() {
      setMe(null);
    }
    window.addEventListener("auth:logout", onForcedLogout);
    return () => window.removeEventListener("auth:logout", onForcedLogout);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthed = !!me;
    const isAdmin = !!me?.is_staff;
    return { me, loading, refreshMe, logout, isAuthed, isAdmin };
  }, [me, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
