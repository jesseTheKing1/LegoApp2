// src/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENDPOINTS } from "./endpoints";

function resolveBaseURL() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  // Production safety net: the frontend and backend are separate Render
  // services. If the frontend build ever misses VITE_API_BASE_URL, relative
  // /api requests hit the static frontend host and return 404.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "legoapp2-1.onrender.com") {
      return "https://legoapp2.onrender.com";
    }
  }

  return "";
}

const baseURL = resolveBaseURL();

const api = axios.create({ baseURL });
const bare = axios.create({ baseURL });

function getAccessToken() {
  return localStorage.getItem("access_token") || "";
}
function getRefreshToken() {
  return localStorage.getItem("refresh_token") || "";
}
function setAccessToken(token: string) {
  localStorage.setItem("access_token", token);
}
function setRefreshToken(token: string) {
  localStorage.setItem("refresh_token", token);
}
function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("auth_user");
}

// 1) Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2) Auto-refresh on 401 and retry once (with queue)
let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

function notifyWaiters(token: string | null) {
  waiters.forEach((cb) => cb(token));
  waiters = [];
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");

  const res = await bare.post(ENDPOINTS.refresh, { refresh });
  const newAccess = (res.data as any)?.access;
  if (!newAccess) throw new Error("No access token returned from refresh");

  setAccessToken(newAccess);
  // SimpleJWT returns a replacement refresh token when rotation is enabled.
  // Saving it is essential because the token we just used is blacklisted.
  const newRefresh = (res.data as any)?.refresh;
  if (newRefresh) setRefreshToken(newRefresh);
  return newAccess;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as any;

    if (status !== 401 || !original) return Promise.reject(error);

    const url: string = original.url || "";

    // Don’t refresh if this request didn’t even send auth
    const hadAuthHeader = !!original.headers?.Authorization;
    if (!hadAuthHeader) return Promise.reject(error);

    // Don't retry refresh endpoint itself (avoid loops)
    if (url.endsWith(ENDPOINTS.refresh) || url.includes(ENDPOINTS.refresh)) {
      clearTokens();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    }

    // Prevent infinite retry
    if (original._retry) return Promise.reject(error);
    original._retry = true;

    // If a refresh is already running, wait for it
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiters.push((token) => {
          if (!token) return reject(error);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      notifyWaiters(newToken);

      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      notifyWaiters(null);
      // A temporary offline/server failure should not destroy a valid login.
      // Only an explicit token rejection means the session has truly expired.
      const refreshStatus = (e as AxiosError)?.response?.status;
      if (refreshStatus === 400 || refreshStatus === 401) {
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
      }
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
