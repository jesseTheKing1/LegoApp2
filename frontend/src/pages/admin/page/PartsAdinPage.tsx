import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Part, PartForm } from "../form/PartForm";
import { createPortal } from "react-dom";

/** ---------------- helpers ---------------- */

function getListData<T = any>(resData: any): T[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
  return [];
}

function formatApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message ?? "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return "Request failed";
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

const btnBase =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-slate-200 bg-white " +
  "text-slate-900 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed";

const btnPrimary =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm bg-slate-900 text-white " +
  "hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed";

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden";

/** ---------------- Drawer shell ---------------- */

function DrawerShell({
  open,
  title,
  onClose,
  children,
  width = 780,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  // Optional: lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
    >
      {/* overlay (click to close) */}
      <div
        className="absolute inset-0 bg-black/40"
        onMouseDown={() => onClose()}
      />

      {/* panel */}
      <div className="absolute inset-0 flex justify-end">
        <div
          className="h-full w-full bg-white shadow-2xl flex flex-col"
          style={{ maxWidth: width }}
          onMouseDown={(e) => e.stopPropagation()} // prevent overlay close when clicking inside
        >
          {/* header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900 truncate">
              {title}
            </div>
            <button type="button" className={btnBase} onClick={onClose}>
              Close
            </button>
          </div>

          {/* content */}
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** ---------------- thumbs ---------------- */

function RowThumb({ src }: { src?: string | null }) {
  return (
    <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-[10px] text-slate-400 font-black">—</span>
      )}
    </div>
  );
}

/** ---------------- page ---------------- */

export default function PartsAdminPage() {
  const [items, setItems] = useState<Part[]>([]);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Part | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const res = await api.get(ENDPOINTS.parts);
    setItems(getListData<Part>(res.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((p) => {
      const hay = `${(p as any).part_id ?? ""} ${(p as any).name ?? ""} ${(p as any).actual_category ?? ""} ${
        (p as any).general_category ?? ""
      } ${(p as any).specific_category ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q]);

  function openDetail(p: Part) {
    setSelected(p);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  async function create(payload: any) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.parts, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(payload: any) {
    if (!selected?.id) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await api.patch(`${ENDPOINTS.parts}${selected.id}/`, payload);
      setSelected(res.data);
      setItems((prev) => prev.map((x) => (x.id === selected.id ? res.data : x)));
      setEditing(false);
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (!selected?.id) return;
    if (!confirm("Delete this Part?")) return;
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.parts}${selected.id}/`);
      setDetailOpen(false);
      setSelected(null);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const detailTitle = selected ? `${(selected as any).part_id} — ${(selected as any).name}` : "Part";

  return (
    <div className="space-y-3">
      {/* top bar */}
      <div style={{padding: 30, fontSize: 32}}>PART COLORS PAGE</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          className={cx(inputBase, "sm:max-w-md")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part id, name, category..."
          autoComplete="off"
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
            + New Part
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold sm:ml-auto">{filtered.length} parts</div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* list */}
      <div className={card}>
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No results.</div>
        ) : (
          filtered.map((p, idx) => {
            const partId = (p as any).part_id ?? "—";
            const name = (p as any).name ?? "—";
            const actual = (p as any).actual_category ?? "";
            const general = (p as any).general_category ?? "";
            const specific = (p as any).specific_category ?? "";
            const sub = `${actual || "—"}${general ? ` • ${general}` : ""}${specific ? ` • ${specific}` : ""}`;

            return (
              <button
                key={p.id}
                type="button"
                className={cx(
                  "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50",
                  idx === 0 ? "" : "border-t border-slate-200"
                )}
                onClick={() => openDetail(p)}
                title="Open"
              >
                <RowThumb src={(p as any).image_url || null} />

                <div className="hidden sm:block w-[120px] text-xs font-semibold text-slate-700">
                  {partId}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 truncate" title={name}>
                    {name}
                  </div>

                  <div className="text-xs text-slate-500 font-semibold truncate" title={sub}>
                    {sub}
                  </div>

                  {/* mobile-only extra line for part_id */}
                  <div className="sm:hidden text-xs text-slate-500 font-semibold truncate">{partId}</div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* create */}
      <DrawerShell open={createOpen} title="New Part" onClose={() => setCreateOpen(false)} width={820}>
        <PartForm submitting={saving} onSubmit={create} />
      </DrawerShell>

      {/* detail */}
      <DrawerShell
        open={detailOpen}
        title={detailTitle}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setEditing(false);
          setErr(null);
        }}
        width={920}
      >
        {!selected ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No selection.
          </div>
        ) : (
          <div className="space-y-4">
            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
              {/* hero */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center aspect-square">
                {(selected as any).image_url ? (
                  <img
                    src={(selected as any).image_url}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-xs text-slate-500 font-black">No image</div>
                )}
              </div>

              {/* info */}
              <div className={cx(card, "p-4 space-y-3")}>
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-600">Shape family</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {(selected as any).actual_category || "—"}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-600">Categories</div>
                  <div className="text-sm font-bold text-slate-900">
                    {(selected as any).general_category || "—"} / {(selected as any).specific_category || "—"}
                  </div>
                </div>

                {!!(selected as any).image_url && (
                  <a
                    href={(selected as any).image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    Open image
                  </a>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => setEditing((v) => !v)}
                    disabled={saving}
                  >
                    {editing ? "Stop editing" : "Edit"}
                  </button>

                  <button
                    type="button"
                    onClick={removeSelected}
                    disabled={saving}
                    className="rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {editing ? (
              <div className={cx(card, "p-4")}>
                <div className="mb-3 text-xs font-black text-slate-600">Edit this Part</div>
                <PartForm submitting={saving} initialValues={selected} onSubmit={saveEdit} />
              </div>
            ) : null}
          </div>
        )}
      </DrawerShell>
    </div>
  );
}
