import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import api from "./api/client";
import { ENDPOINTS } from "./api/endpoints";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

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

function Header({
  me,
  onLogout,
  backendAdminUrl,
}: {
  me: Me | null;
  onLogout: () => void;
  backendAdminUrl: string;
}) {
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        <Link to="/" style={S.brand}>
          LEGO Inventory
        </Link>

        <nav style={S.nav}>
          <Link to="/" style={S.navLink}>
            Home
          </Link>

          {me?.is_staff ? (
            <a href={backendAdminUrl} style={S.navLink}>
              Admin
            </a>
          ) : null}

          {me ? (
            <>
              <span style={S.userPill}>
                @{me.username}
                {me.is_staff ? " • Admin" : ""}
              </span>
              <button style={S.ghostBtn} onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={S.ghostLink}>
                Log in
              </Link>
              <Link to="/register" style={S.primaryLink}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Home({ me, backendAdminUrl }: { me: Me | null; backendAdminUrl: string }) {
  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <div style={S.badge}>Inventory • Pricing • Sets • Minifigs</div>
        <h1 style={S.h1}>Track LEGO parts like a pro.</h1>
        <p style={S.p}>
          Keep your catalog clean, price parts accurately, and build sets with confidence.
          {me ? " You're signed in — jump back in." : " Create an account to get started."}
        </p>

        <div style={S.ctaRow}>
          {me ? (
            <>
              {me.is_staff ? (
                <a href={backendAdminUrl} style={S.primaryBtn}>
                  Open Admin
                </a>
              ) : (
                <Link to="/account" style={S.primaryBtn}>
                  My Account
                </Link>
              )}

              {/* Placeholder link for future pages */}
              <Link to="/browse" style={S.secondaryBtn}>
                Browse
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" style={S.primaryBtn}>
                Create account
              </Link>
              <Link to="/login" style={S.secondaryBtn}>
                Log in
              </Link>
            </>
          )}
        </div>

        <div style={S.cardRow}>
          <div style={S.card}>
            <div style={S.cardTitle}>Accurate pricing</div>
            <div style={S.cardBody}>Weighted averages + overrides so you always know real cost.</div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Fast cataloging</div>
            <div style={S.cardBody}>Parts, colors, part-colors, themes, sets — organized and searchable.</div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Admin-friendly</div>
            <div style={S.cardBody}>Staff-only editing. Regular users can browse safely.</div>
          </div>
        </div>

        <div style={S.footer}>
          <span style={{ color: "#64748b" }}>
            API:{" "}
            <span style={{ fontWeight: 800, color: "#0f172a" }}>
              {import.meta.env.VITE_API_BASE_URL || "(not set)"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function AccountPage({ me }: { me: Me }) {
  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <div style={S.badge}>Account</div>
        <h2 style={{ margin: "14px 0 8px", fontSize: 28, color: "#0f172a" }}>
          Welcome, @{me.username}
        </h2>
        <div style={{ color: "#475569", lineHeight: 1.6 }}>
          <div>Email: {me.email}</div>
          <div>Role: {me.is_staff ? "Admin" : "User"}</div>
        </div>
      </div>
    </div>
  );
}

function BrowsePlaceholder() {
  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <div style={S.badge}>Browse</div>
        <h2 style={{ margin: "14px 0 8px", fontSize: 28, color: "#0f172a" }}>Coming soon</h2>
        <p style={S.p}>Next we’ll wire your real admin/browse pages into this router.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const backendAdminUrl = useMemo(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    // If env is missing during dev, fallback to relative admin (works if same origin)
    return base ? `${base}/admin/` : "/admin/";
  }, []);

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
    <BrowserRouter>
      <Header me={me} onLogout={logout} backendAdminUrl={backendAdminUrl} />

      {loading ? (
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto", color: "#475569" }}>
          Loading…
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Home me={me} backendAdminUrl={backendAdminUrl} />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage onLogin={loadMe} />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected user page */}
          <Route
            path="/account"
            element={
              <RequireAuth me={me}>
                <AccountPage me={me as Me} />
              </RequireAuth>
            }
          />

          {/* Example protected admin page (placeholder) */}
          <Route
            path="/browse"
            element={
              <RequireAdmin me={me}>
                <BrowsePlaceholder />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

const S: Record<string, React.CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #e5e7eb",
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#0f172a",
    textDecoration: "none",
  },
  nav: { display: "flex", alignItems: "center", gap: 10 },
  navLink: {
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 600,
    padding: "8px 10px",
    borderRadius: 10,
  },
  ghostLink: {
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 700,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
  },
  primaryLink: {
    textDecoration: "none",
    color: "white",
    fontWeight: 800,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#0f172a",
    border: "1px solid #0f172a",
  },
  userPill: {
    padding: "8px 10px",
    borderRadius: 999,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    fontWeight: 700,
  },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  wrap: { maxWidth: 1100, margin: "0 auto", padding: "34px 18px" },
  hero: {
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    background:
      "radial-gradient(1200px 600px at 10% 0%, rgba(15,23,42,0.06), transparent), white",
    padding: "34px 28px",
    boxShadow: "0 12px 30px rgba(2,6,23,0.06)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 800,
    fontSize: 12,
  },
  h1: {
    margin: "14px 0 10px",
    fontSize: 48,
    letterSpacing: "-0.03em",
    lineHeight: 1.05,
    color: "#0f172a",
  },
  p: { margin: 0, maxWidth: 720, fontSize: 16, lineHeight: 1.55, color: "#334155" },
  ctaRow: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" },
  primaryBtn: {
    textDecoration: "none",
    background: "#0f172a",
    color: "white",
    fontWeight: 900,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #0f172a",
  },
  secondaryBtn: {
    textDecoration: "none",
    background: "white",
    color: "#0f172a",
    fontWeight: 900,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 22,
  },
  card: { border: "1px solid #e5e7eb", borderRadius: 18, padding: 16, background: "white" },
  cardTitle: { fontWeight: 900, color: "#0f172a", marginBottom: 6 },
  cardBody: { color: "#475569", lineHeight: 1.5 },
  footer: { marginTop: 22, paddingTop: 14, borderTop: "1px solid #e5e7eb" },
};
