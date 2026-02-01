import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import api from "./api/client";
import { ENDPOINTS } from "./api/endpoints";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import AdminLayout from "./pages/admin/AdminLayout";
import ColorsAdminPage from "./pages/admin/page/ColorsAdminPage";
import PartColorsPage from "./pages/admin/page/PartColorsPage";
import PartsAdminPage from "./pages/admin/page/PartsAdinPage";

import "./App.css";

type Me = {
  id: number;
  email: string;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
};

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

/** ---------- Admin dropdown ---------- */
function AdminMenu({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setOpen(false));

  return (
    <div className="menuWrap" ref={menuRef}>
      <button
        type="button"
        className="btn btnPrimary btnSm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Admin <span className="chev">▾</span>
      </button>

      {open ? (
        <div className="menu" role="menu">
          <Link
            to="/admin/parts"
            className="menuItem"
            role="menuitem"
            onClick={() => {
              close();
              onNavigate();
            }}
          >
            Parts
          </Link>
          <Link
            to="/admin/colors"
            className="menuItem"
            role="menuitem"
            onClick={() => {
              close();
              onNavigate();
            }}
          >
            Colors
          </Link>
          <Link
            to="/admin/part-colors"
            className="menuItem"
            role="menuitem"
            onClick={() => {
              close();
              onNavigate();
            }}
          >
            Part Colors
          </Link>

          <div className="menuDivider" />

          <a
            href="/dj-admin/"
            className="menuItem"
            role="menuitem"
            onClick={() => {
              close();
              onNavigate();
            }}
          >
            Django admin
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Header({ me, onLogout }: { me: Me | null; onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useOutsideClick<HTMLDivElement>(() => setMobileOpen(false));

  // Close mobile drawer on route changes (best-effort)
  const loc = useLocation();
  useEffect(() => setMobileOpen(false), [loc.pathname]);

  const userLabel = useMemo(() => {
    if (!me) return "";
    return `@${me.username}${me.is_staff ? " • Admin" : ""}`;
  }, [me]);

  return (
    <header className="header">
      <div className="container headerInner">
        <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
          LEGO Inventory
        </Link>

        {/* Desktop nav */}
        <nav className="navDesktop" aria-label="Primary">
          <Link to="/" className="navLink">
            Home
          </Link>

          {me?.is_staff ? <AdminMenu onNavigate={() => setMobileOpen(false)} /> : null}

          {me ? (
            <>
              <span className="pill">{userLabel}</span>
              <button className="btn btnGhost" type="button" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btnGhostLink">
                Log in
              </Link>
              <Link to="/register" className="btn btnPrimaryLink">
                Create account
              </Link>
            </>
          )}
        </nav>

        {/* Mobile button */}
        <div className="navMobile" ref={mobileRef}>
          <button
            className="iconBtn"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <span className="iconBtnBars" />
          </button>

          {mobileOpen ? (
            <div className="mobilePanel" role="dialog" aria-label="Menu">
              <div className="mobileTop">
                <div className="mobileTitle">Menu</div>
                <button
                  className="iconBtn"
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <div className="mobileLinks">
                <Link to="/" className="mobileLink">
                  Home
                </Link>

                {me?.is_staff ? (
                  <div className="mobileGroup">
                    <div className="mobileGroupLabel">Admin</div>
                    <Link to="/admin/parts" className="mobileLink">
                      Parts
                    </Link>
                    <Link to="/admin/colors" className="mobileLink">
                      Colors
                    </Link>
                    <Link to="/admin/part-colors" className="mobileLink">
                      Part Colors
                    </Link>
                    <a href="/dj-admin/" className="mobileLink">
                      Django admin
                    </a>
                  </div>
                ) : null}

                <div className="mobileDivider" />

                {me ? (
                  <>
                    <div className="pill pillFull">{userLabel}</div>
                    <button className="btn btnGhost btnFull" type="button" onClick={onLogout}>
                      Log out
                    </button>
                  </>
                ) : (
                  <div className="mobileAuth">
                    <Link to="/login" className="btn btnGhostLink btnFull">
                      Log in
                    </Link>
                    <Link to="/register" className="btn btnPrimaryLink btnFull">
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="container page">
      <div className="card">{children}</div>
    </main>
  );
}

function Home({ me }: { me: Me | null }) {
  return (
    <PageShell>
      <div className="badge">Inventory • Pricing • Sets • Minifigs</div>

      <h1 className="h1">Track LEGO parts like a pro.</h1>
      <p className="p">
        Keep your catalog clean, price parts accurately, and build sets with confidence.
        {me ? " You’re signed in — jump back in." : " Create an account to get started."}
      </p>

      <div className="ctaRow">
        {me ? (
          <>
            {me.is_staff ? (
              <Link to="/admin/parts" className="btn btnPrimary btnLg">
                Open Admin
              </Link>
            ) : (
              <Link to="/account" className="btn btnPrimary btnLg">
                My Account
              </Link>
            )}
            <Link to="/browse" className="btn btnSecondary btnLg">
              Browse
            </Link>
          </>
        ) : (
          <>
            <Link to="/register" className="btn btnPrimary btnLg">
              Create account
            </Link>
            <Link to="/login" className="btn btnSecondary btnLg">
              Log in
            </Link>
          </>
        )}
      </div>

      <div className="featureGrid">
        <div className="featureCard">
          <div className="featureTitle">Accurate pricing</div>
          <div className="featureText">Weighted averages + overrides so your numbers stay sane.</div>
        </div>
        <div className="featureCard">
          <div className="featureTitle">Fast cataloging</div>
          <div className="featureText">Clean admin flows that work on phone or desktop.</div>
        </div>
        <div className="featureCard">
          <div className="featureTitle">Built to scale</div>
          <div className="featureText">Parts → Part Colors → Sets → Minifigs, all consistent.</div>
        </div>
      </div>
    </PageShell>
  );
}

function AccountPage({ me }: { me: Me }) {
  return (
    <PageShell>
      <div className="badge">Account</div>
      <h2 className="h2">Welcome, @{me.username}</h2>
      <div className="meta">
        <div>
          <span className="metaLabel">Email</span>
          <div className="metaValue">{me.email}</div>
        </div>
        <div>
          <span className="metaLabel">Role</span>
          <div className="metaValue">{me.is_staff ? "Admin" : "User"}</div>
        </div>
      </div>
    </PageShell>
  );
}

function BrowsePlaceholder() {
  return (
    <PageShell>
      <div className="badge">Browse</div>
      <h2 className="h2">Coming soon</h2>
      <p className="p">
        This will be public browsing later. Admin pages are under <span className="code">/admin/*</span>.
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
    <>
      <Header me={me} onLogout={logout} />

      {loading ? (
        <main className="container page">
          <div className="loading">Loading…</div>
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
    </>
  );
}
