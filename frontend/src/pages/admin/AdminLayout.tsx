import React, { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ADMIN_ROUTES } from "./adminRoutes";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function AdminLayout() {
  const location = useLocation();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof ADMIN_ROUTES>();
    for (const r of ADMIN_ROUTES) {
      const g = r.group ?? "Admin";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r as any);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div style={UI.shell}>
      <aside style={UI.sidebar}>
        <div style={UI.brandRow}>
          <div style={UI.brandDot} />
          <div style={{ fontWeight: 950 }}>LEGO Admin</div>
        </div>

        <div style={{ padding: "0 10px" }}>
          <Link to="/" style={UI.backLink}>← Back to app</Link>
        </div>

        <div style={UI.navWrap}>
          {grouped.map(([groupName, routes]) => (
            <div key={groupName} style={{ marginBottom: 12 }}>
              <div style={UI.groupLabel}>{groupName}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {routes.map((r) => (
                  <NavLink
                    key={r.key}
                    to={`/admin/${r.path}`}
                    style={({ isActive }) => ({
                      ...UI.navItem,
                      ...(isActive ? UI.navItemActive : null),
                    })}
                    title={r.label}
                  >
                    <div style={{ fontWeight: 900 }}>{r.label}</div>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={UI.sidebarFooter}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {location.pathname}
          </div>
        </div>
      </aside>

      <main style={UI.main}>
        <div style={UI.topbar}>
          <div style={{ fontWeight: 950 }}>Admin</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Catalog tools</div>
        </div>

        <div style={UI.page}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const UI: Record<string, React.CSSProperties> = {
  shell: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    minHeight: "100vh",
    background: "#f8fafc",
  },
  sidebar: {
    borderRight: "1px solid #e5e7eb",
    background: "white",
    display: "grid",
    gridTemplateRows: "auto auto 1fr auto",
    gap: 12,
    padding: "14px 0",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#111827",
  },
  backLink: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 900,
    color: "#2563eb",
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "white",
  },
  navWrap: {
    padding: "0 10px",
    overflow: "auto",
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 950,
    color: "#64748b",
    padding: "6px 8px",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  navItem: {
    display: "block",
    textDecoration: "none",
    color: "#0f172a",
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
  },
  navItemActive: {
    border: "1px solid #111827",
    background: "#111827",
    color: "white",
  },
  sidebarFooter: {
    padding: "0 14px",
  },
  main: {
    display: "grid",
    gridTemplateRows: "auto 1fr",
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "rgba(248,250,252,.9)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px 16px",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  page: {
    padding: 16,
    display: "grid",
    gap: 12,
  },
};
