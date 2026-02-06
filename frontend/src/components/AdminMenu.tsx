import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useOutsideClick } from "../hooks/useOutsideClick";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export function AdminMenu({ compact = false }: { compact?: boolean }) {
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
