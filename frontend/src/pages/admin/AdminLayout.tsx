// src/admin/AdminLayout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ADMIN_ROUTES } from "./adminRoutes";

/** ---------- helpers ---------- **/

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function useIsActivePath(path: string) {
  const loc = useLocation();
  return useMemo(
    () => loc.pathname === path || loc.pathname.startsWith(path + "/"),
    [loc.pathname, path]
  );
}

function useOnClickOutside<T extends HTMLElement>(handler: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) handler();
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [handler]);

  return ref;
}

/** ---------- UI bits ---------- **/

function NavTab({ to, label }: { to: string; label: string }) {
  const active = useIsActivePath(to);

  return (
    <Link
      to={to}
      className={cx(
        "relative inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition",
        "outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "border border-slate-900/10 flex-shrink-0",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-900 hover:bg-slate-50"
      )}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20"
        />
      ) : null}
      {label}
    </Link>
  );
}

function MenuItem({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick?: () => void;
}) {
  const active = useIsActivePath(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cx(
        "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
        "outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        active ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-50"
      )}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      <span className="font-medium">{label}</span>
      <span className={cx("text-xs", active ? "text-white/70" : "text-slate-400")}>↗</span>
    </Link>
  );
}

type AdminRoute = (typeof ADMIN_ROUTES)[number];

function normalizePath(p: string) {
  const cleaned = (p || "").replace(/^\/+/, "");
  return `/admin/${cleaned}`;
}

function buildGroups(routes: AdminRoute[]) {
  const map = new Map<string, AdminRoute[]>();
  for (const r of routes) {
    const g = r.group ?? "Admin";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(r);
  }
  return Array.from(map.entries());
}

/** ---------- layout ---------- **/

export default function AdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useOnClickOutside<HTMLDivElement>(() => setOpen(false));

  const grouped = useMemo(() => buildGroups(ADMIN_ROUTES as AdminRoute[]), []);

  // This MUST match your App header height (you used h-16)
  const APP_HEADER_H = 64;

  // Measure admin header height (tabs + wrap)
  const headerRef = useRef<HTMLElement | null>(null);
  const [adminHeaderH, setAdminHeaderH] = useState(160);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => {
      const h = el.getBoundingClientRect().height;
      setAdminHeaderH(Math.ceil(h));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const [tabsGroupName, tabsRoutes, ...restGroups] = useMemo(() => {
    const g = grouped.length ? grouped : [["Admin", [] as AdminRoute[]]];
    const [firstName, firstRoutes] = g[0];
    const rest = g.slice(1);
    return [firstName, firstRoutes, ...rest] as any;
  }, [grouped]);

  const tabs = useMemo(() => {
    const pinnedKeys = new Set<string>(["parts", "part-colors", "sets", "minifigs", "price-logs"]);
    const pinned = (ADMIN_ROUTES as AdminRoute[]).filter((r) => pinnedKeys.has(r.key));
    if (pinned.length) return pinned;
    return (tabsRoutes as AdminRoute[]) || [];
  }, [tabsRoutes]);

  const secondaryGroups = useMemo(() => {
    const tabKeys = new Set(tabs.map((t) => t.key));
    const leftovers = (ADMIN_ROUTES as AdminRoute[]).filter((r) => !tabKeys.has(r.key));

    const byGroup = new Map<string, AdminRoute[]>();
    for (const r of leftovers) {
      const g = r.group ?? "More";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(r);
    }

    if (!leftovers.length) return restGroups as Array<[string, AdminRoute[]]>;
    return Array.from(byGroup.entries());
  }, [tabs, restGroups]);

  const totalTopOffset = APP_HEADER_H + adminHeaderH;

  return (
    // Don't use h-screen here (nested under App header). Use min-height instead.
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900">
      {/* ADMIN HEADER: sits UNDER the App header */}
      <header
        ref={headerRef}
        className={cx(
          "fixed inset-x-0 z-30 border-b border-slate-900/10 bg-white/85 backdrop-blur",
          // The key fix: push this below the App header
          "top-16"
        )}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 py-4">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                LEGO Admin
              </div>
              <div className="text-sm text-slate-500">Catalog tools</div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/"
                className={cx(
                  "inline-flex h-10 items-center rounded-full border border-slate-900/10 bg-white px-3.5 text-sm font-semibold",
                  "text-slate-900 shadow-sm transition hover:bg-slate-50",
                  "outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                )}
                title="Back to app"
              >
                ← Back
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className={cx(
                    "inline-flex h-10 items-center gap-2 rounded-full border border-slate-900/10 bg-white px-3.5 text-sm font-semibold",
                    "text-slate-900 shadow-sm transition hover:bg-slate-50",
                    "outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  )}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  More
                  <span className={cx("text-slate-400 transition-transform", open && "rotate-180")}>
                    ▾
                  </span>
                </button>

                {open ? (
                  <div
                    className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-xl"
                    role="menu"
                  >
                    <div className="p-2">
                      {secondaryGroups.map(([groupName, routes], idx) => (
                        <div key={groupName}>
                          <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {groupName}
                          </div>
                          <div className="grid gap-1">
                            {routes.map((r) => (
                              <MenuItem
                                key={r.key}
                                to={normalizePath(r.path)}
                                label={r.label}
                                onClick={() => setOpen(false)}
                              />
                            ))}
                          </div>
                          {idx !== secondaryGroups.length - 1 ? (
                            <div className="my-2 h-px bg-slate-900/10" />
                          ) : null}
                        </div>
                      ))}

                      <div className="mt-2 px-3 pb-2 pt-2 text-[11px] text-slate-400">
                        {location.pathname}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="pb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((r) => (
                <NavTab key={r.key} to={normalizePath(r.path)} label={r.label} />
              ))}
            </div>

            <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-900/10 to-transparent" />
          </div>
        </div>
      </header>

      {/* CONTENT AREA */}
      <main
        className="mx-auto w-full max-w-6xl px-4 sm:px-6"
        style={{
          // totalTopOffset = AppHeader + AdminHeader (measured)
          paddingTop: APP_HEADER_H + adminHeaderH,
        }}
      >
        <div className="pb-8">
          <div
            className="overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-sm"
            style={{
              // ensure it always fits the viewport, never clipped
              minHeight: `calc(100vh - ${totalTopOffset}px - 2rem)`,
            }}
          >
            {/* Important: allow inner pages to scroll naturally */}
            <div className="p-4 sm:p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
