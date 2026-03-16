import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import { AdminMenu } from "./AdminMenu";
import { Button, ButtonLink } from "./ui/Button";

const LOGO_URL =
  "https://pub-d38048540c4d4457ab7891fe983b6fb6.r2.dev/uploads/86757ea5a8144a60bd9b83ee62289b23.webp";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export function Header() {
  const { me, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  const isAdminRoute =
    loc.pathname === "/admin" || loc.pathname.startsWith("/admin/");

  const userLabel = useMemo(() => {
    if (!me) return "";
    return `@${me.username}${me.is_staff ? " • Admin" : ""}`;
  }, [me]);

  useEffect(() => {
    if (!mobileOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const publicMobileLinks = [
    ["Home", "/"],
    ["Browse", "/browse"],
  ] as const;

  const adminMobileLinks = [
    ["Parts", "/admin/parts"],
    ["Colors", "/admin/colors"],
    ["Part Colors", "/admin/part-colors"],
    ["Themes", "/admin/themes"],
    ["Minifigs", "/admin/minifigs"],
    ["Inventory Dashboard", "/admin/inventory"],
    ["Inventory Records", "/admin/inventory/records"],
    ["Inventory Locations", "/admin/inventory/locations"],
  ] as const;

  const MobileDrawer = mobileOpen
    ? createPortal(
        <div className="fixed inset-0 z-[1000]">
          <button
            className="absolute inset-0 z-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />

          <div
            className={cx(
              "absolute right-0 top-0 z-10 h-full w-[86vw] max-w-sm bg-white shadow-2xl pointer-events-auto",
              "pt-[max(12px,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]"
            )}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-black text-slate-900">
                {isAdminRoute ? "Admin Menu" : "Menu"}
              </div>

              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {!isAdminRoute ? (
                <div className="grid gap-2">
                  {publicMobileLinks.map(([label, path]) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                    >
                      {label}
                    </Link>
                  ))}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Admin
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  {isAdmin && (
                    <div className="mt-2 rounded-3xl border bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-black uppercase text-slate-500">
                        Catalog
                      </div>

                      <div className="grid gap-2">
                        {adminMobileLinks.slice(0, 5).map(([label, path]) => (
                          <Link
                            key={path}
                            to={path}
                            onClick={() => setMobileOpen(false)}
                            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold"
                          >
                            {label}
                          </Link>
                        ))}
                      </div>

                      <div className="my-3 h-px bg-slate-200" />

                      <div className="mb-2 text-xs font-black uppercase text-slate-500">
                        Inventory
                      </div>

                      <div className="grid gap-2">
                        {adminMobileLinks.slice(5).map(([label, path]) => (
                          <Link
                            key={path}
                            to={path}
                            onClick={() => setMobileOpen(false)}
                            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold"
                          >
                            {label}
                          </Link>
                        ))}
                      </div>

                      <div className="my-3 h-px bg-slate-200" />

                      <a
                        href="/dj-admin/"
                        className="block rounded-2xl bg-white px-4 py-3 text-sm font-semibold"
                        onClick={() => setMobileOpen(false)}
                      >
                        Django admin
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 h-px bg-slate-200" />

              <div className="mt-4 grid gap-2">
                {me ? (
                  <>
                    <div className="rounded-2xl border px-4 py-3 text-sm font-semibold">
                      {userLabel}
                    </div>

                    <button
                      onClick={logout}
                      className="h-10 rounded-xl border px-4 text-sm font-semibold"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="h-10 rounded-xl border px-4 text-sm font-semibold"
                    >
                      Log in
                    </Link>

                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
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
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-black">
          <img src={LOGO_URL} className="h-9 w-9 rounded-xl" alt="Logo" />
          <span className="hidden sm:block">LEGO Inventory</span>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          {!isAdminRoute ? (
            <>
              <Link to="/" className="px-3 py-2 font-semibold">
                Home
              </Link>

              <Link to="/browse" className="px-3 py-2 font-semibold">
                Browse
              </Link>

              {isAdmin && <AdminMenu />}
            </>
          ) : (
            <>
              <ButtonLink to="/" size="sm">
                ← Back
              </ButtonLink>

              {isAdmin && <AdminMenu compact />}
            </>
          )}

          <div className="ml-2 flex items-center gap-2">
            {me ? (
              <>
                <span className="px-3 py-1 text-xs font-semibold">
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

                <ButtonLink to="/register">Create account</ButtonLink>
              </>
            )}
          </div>
        </nav>

        <button
          className="grid h-10 w-10 place-items-center rounded-xl border sm:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {MobileDrawer}
    </header>
  );
}