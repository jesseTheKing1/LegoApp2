// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "./api/client";
import { ENDPOINTS } from "./api/endpoints";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import AdminLayout from "./pages/admin/AdminLayout";
import ColorsAdminPage from "./pages/admin/page/ColorsAdminPage";
import PartColorsPage from "./pages/admin/page/PartColorsPage";
import PartsAdminPage from "./pages/admin/page/PartsAdinPage";

type Me = {
  id: number;
  email: string;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function getAccessToken() {
  return localStorage.getItem("access_token") || "";
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function fetchMe(): Promise<Me | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await api.get(ENDPOINTS.me, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data as Me;
  } catch {
    return null;
  }
}

function RequireAuth({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const loc = useLocation();
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const loc = useLocation();
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!me.is_staff) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Close-on-outside-click helper */
function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      onOutside();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [onOutside]);

  return ref;
}

/** ---------- UI atoms ---------- */

function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400/40";
  const sizes =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-base rounded-2xl"
      : "h-10 px-4 text-sm";
  const variants =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
      ? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
      : "bg-transparent text-slate-900 hover:bg-slate-100";
  return (
    <Link to={to} className={cx(base, sizes, variants, className)}>
      {children}
    </Link>
  );
}

function Button({
  variant = "secondary",
  size = "md",
  className,
  onClick,
  children,
  type = "button",
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400/40";
  const sizes =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-base rounded-2xl"
      : "h-10 px-4 text-sm";
  const variants =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
      ? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
      : "bg-transparent text-slate-900 hover:bg-slate-100";
  return (
    <button type={type} onClick={onClick} className={cx(base, sizes, variants, className)}>
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-900">
      {children}
    </span>
  );
}

/** ---------- Admin dropdown (desktop + admin mode) ---------- */
function AdminMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setOpen(false));

  const btnClass = compact
    ? "inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
    : "inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          btnClass,
          "outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Admin
        <span className={cx("opacity-80 transition-transform", open && "rotate-180")}>▾</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          role="menu"
        >
          <div className="p-2">
            <div className="px-3 pb-2 pt-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Catalog
            </div>

            <div className="grid gap-1">
              <Link
                to="/admin/parts"
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={close}
              >
                Parts <span className="text-slate-400">↗</span>
              </Link>
              <Link
                to="/admin/colors"
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={close}
              >
                Colors <span className="text-slate-400">↗</span>
              </Link>
              <Link
                to="/admin/part-colors"
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={close}
              >
                Part Colors <span className="text-slate-400">↗</span>
              </Link>
            </div>

            <div className="my-2 h-px bg-slate-200" />

            <div className="px-3 pb-2 pt-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              System
            </div>
            <div className="grid gap-1">
              <a
                href="/dj-admin/"
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={close}
              >
                Django Admin <span className="text-slate-400">↗</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** ---------- Header ---------- */
function Header({ me, onLogout }: { me: Me | null; onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useOutsideClick<HTMLDivElement>(() => setMobileOpen(false));
  const loc = useLocation();

  useEffect(() => setMobileOpen(false), [loc.pathname]);

  const isAdminRoute = loc.pathname === "/admin" || loc.pathname.startsWith("/admin/");
  const userLabel = useMemo(() => {
    if (!me) return "";
    return `@${me.username}${me.is_staff ? " • Admin" : ""}`;
  }, [me]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const MobileDrawer = mobileOpen
    ? createPortal(
        <div className="fixed inset-0 z-[1000]">
          {/* Dark overlay */}
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-[86vw] max-w-sm bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="text-sm font-black text-slate-900">
                {isAdminRoute ? "Admin Menu" : "Menu"}
              </div>
              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {!isAdminRoute ? (
                <div className="grid gap-2">
                  <Link
                    to="/"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Home
                  </Link>
                  <Link
                    to="/browse"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Browse
                  </Link>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link
                    to="/"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    ← Back to app
                  </Link>
                </div>
              )}

              {me?.is_staff ? (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    Admin
                  </div>
                  <div className="grid gap-2">
                    <Link
                      to="/admin/parts"
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Parts
                    </Link>
                    <Link
                      to="/admin/colors"
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Colors
                    </Link>
                    <Link
                      to="/admin/part-colors"
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Part Colors
                    </Link>
                    <a
                      href="/dj-admin/"
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Django admin
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 h-px bg-slate-200" />

              <div className="mt-4 grid gap-2">
                {me ? (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                      {userLabel}
                    </div>
                    <button
                      className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      onClick={onLogout}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Admin mode badge (always visible) */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex flex-shrink-0 items-center gap-2 text-sm font-black tracking-tight text-slate-900"
            title="Home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              L
            </span>
            <span className="hidden sm:block">LEGO Inventory</span>
            <span className="sm:hidden">LEGO</span>
          </Link>

          {isAdminRoute ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden sm:block h-6 w-px bg-slate-200" />
              <div
                className={cx(
                  "inline-flex items-center rounded-xl border border-slate-200 bg-white",
                  "px-2 py-1 text-[10px] sm:px-3 sm:text-xs",
                  "font-black uppercase text-slate-900",
                  "tracking-[0.32em] sm:tracking-[0.28em]",
                  "max-w-[42vw] sm:max-w-none truncate"
                )}
                style={{ textRendering: "geometricPrecision" }}
                title="Admin mode"
              >
                ADMIN MODE
              </div>
            </div>
          ) : null}
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex" aria-label="Primary">
          {!isAdminRoute ? (
            <>
              <Link
                to="/"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Home
              </Link>

              <Link
                to="/browse"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Browse
              </Link>
            </>
          ) : (
            <>
              <ButtonLink to="/" variant="secondary" size="sm">
                ← Back to app
              </ButtonLink>
              {me?.is_staff ? <AdminMenu compact /> : null}
            </>
          )}

          {!isAdminRoute && me?.is_staff ? <AdminMenu /> : null}

          <div className="ml-2 flex items-center gap-2">
            {me ? (
              <>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-900">
                  {userLabel}
                </span>
                <Button variant="ghost" onClick={onLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost">
                  Log in
                </ButtonLink>
                <ButtonLink to="/register" variant="primary">
                  Create account
                </ButtonLink>
              </>
            )}
          </div>
        </nav>

        {/* Mobile menu button */}
        <div className="relative sm:hidden" ref={mobileRef}>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <span className="text-lg">☰</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer rendered via portal so it darkens EVERYTHING */}
      {MobileDrawer}
    </header>
  );
}

/** ---------- Layout ---------- */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,6,23,0.08)]">
        <div className="bg-[radial-gradient(900px_500px_at_10%_0%,rgba(15,23,42,0.10),transparent)] p-6 sm:p-10">
          {children}
        </div>
      </div>
    </main>
  );
}

/** ---------- Pages ---------- */
function Home({ me }: { me: Me | null }) {
  return (
    <PageShell>
      <Badge>Inventory • Pricing • Sets • Minifigs</Badge>

      <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
        Track LEGO parts like a pro.
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Keep your catalog clean, price parts accurately, and build sets with confidence.
        {me ? " You’re signed in — jump back in." : " Create an account to get started."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {me ? (
          <>
            {me.is_staff ? (
              <ButtonLink to="/admin/parts" variant="primary" size="lg">
                Open Admin
              </ButtonLink>
            ) : (
              <ButtonLink to="/account" variant="primary" size="lg">
                My Account
              </ButtonLink>
            )}
            <ButtonLink to="/browse" variant="secondary" size="lg">
              Browse
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink to="/register" variant="primary" size="lg">
              Create account
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" size="lg">
              Log in
            </ButtonLink>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-black text-slate-900">Accurate pricing</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Weighted averages + overrides so your numbers stay sane.
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-black text-slate-900">Fast cataloging</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Clean admin flows that work on phone or desktop.
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-black text-slate-900">Built to scale</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Parts → Part Colors → Sets → Minifigs, all consistent.
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function AccountPage({ me }: { me: Me }) {
  return (
    <PageShell>
      <Badge>Account</Badge>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        Welcome, @{me.username}
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Email</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{me.email}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Role</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {me.is_staff ? "Admin" : "User"}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function BrowsePlaceholder() {
  return (
    <PageShell>
      <Badge>Browse</Badge>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Coming soon</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This will be public browsing later. Admin pages are under{" "}
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-800">
          /admin/*
        </span>
        .
      </p>
    </PageShell>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    setLoading(true);
    setMe(await fetchMe());
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, []);

  function logout() {
    clearTokens();
    setMe(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header me={me} onLogout={logout} />

      {loading ? (
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
            Loading…
          </div>
        </main>
      ) : (
        <Routes>
          <Route path="/" element={<Home me={me} />} />

          <Route path="/login" element={<LoginPage onLogin={loadMe} />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/account"
            element={
              <RequireAuth me={me}>
                <AccountPage me={me as Me} />
              </RequireAuth>
            }
          />

          <Route path="/browse" element={<BrowsePlaceholder />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAdmin me={me}>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="/admin/parts" replace />} />
            <Route path="parts" element={<PartsAdminPage />} />
            <Route path="colors" element={<ColorsAdminPage />} />
            <Route path="part-colors" element={<PartColorsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}
