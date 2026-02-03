// src/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENDPOINTS } from "./endpoints";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";

// Main API client (has interceptors)
const api = axios.create({ baseURL });

// Bare client (NO interceptors) used only for refresh call
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
function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// ---- 1) Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 2) Auto-refresh on 401 and retry once (with queue)
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
  const newAccess = res.data?.access;
  if (!newAccess) throw new Error("No access token returned from refresh");

  setAccessToken(newAccess);
  return newAccess;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as any;

    // Only handle 401s
    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    // Don't retry refresh endpoint itself (avoid loops)
    if (original.url?.includes(ENDPOINTS.refresh)) {
      clearTokens();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    }

    // Prevent infinite retry
    if (original._retry) {
      return Promise.reject(error);
    }
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

    // Start refresh
    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      notifyWaiters(newToken);

      // Retry original request
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      notifyWaiters(null);
      clearTokens();

      // Tell React/UI layer “force logout”
      window.dispatchEvent(new Event("auth:logout"));

      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
