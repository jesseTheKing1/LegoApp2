import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { AdminMenu } from "./AdminMenu";
import { Button, ButtonLink } from "./ui/Button";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const LOGO_URL =
  "https://pub-d38048540c4d4457ab7891fe983b6fb6.r2.dev/uploads/86757ea5a8144a60bd9b83ee62289b23.webp";

export function Header() {
  const { me, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useOutsideClick<HTMLDivElement>(() => setMobileOpen(false));
  const loc = useLocation();

  useEffect(() => setMobileOpen(false), [loc.pathname]);

  const isAdminRoute = loc.pathname === "/admin" || loc.pathname.startsWith("/admin/");

  const userLabel = useMemo(() => {
    if (!me) return "";
    return `@${me.username}${me.is_staff ? " • Admin" : ""}`;
  }, [me]);

  // lock scroll when mobile drawer open
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
          {/* Backdrop MUST be fixed and cover the entire screen */}
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

              {isAdmin ? (
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
                      onClick={logout}
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
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex flex-shrink-0 items-center gap-2 text-sm font-black tracking-tight text-slate-900"
            title="Home"
          >
            {/* LOGO (replaces the L box) */}
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-slate-900">
              <img
                src={LOGO_URL}
                alt="LEGO Inventory"
                className="h-full w-full object-cover scale-110"
                loading="eager"
                decoding="async"
              />
            </span>

            <span className="hidden sm:block">LEGO Inventory</span>
            <span className="sm:hidden">LEGO</span>
          </Link>

          {/* ADMIN MODE pill should remain visible on all sizes */}
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
              {isAdmin ? <AdminMenu compact /> : null}
            </>
          )}

          {!isAdminRoute && isAdmin ? <AdminMenu /> : null}

          <div className="ml-2 flex items-center gap-2">
            {me ? (
              <>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-900">
                  {userLabel}
                </span>
                <Button variant="ghost" onClick={logout}>
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

      {MobileDrawer}
    </header>
  );
}
