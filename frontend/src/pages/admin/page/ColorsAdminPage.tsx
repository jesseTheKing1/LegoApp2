import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Color, ColorForm } from "../form/ColorForm";
import { createPortal } from "react-dom";

/** ---------------- helpers ---------------- */

function getListData<T = any>(resData: any): T[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
  if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
  // some DRF configs return {results: []}
  if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
  // fallback if you used res.data.results directly earlier
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

function safeHex(hex?: string | null) {
  if (!hex) return "";
  const h = String(hex).trim();
  if (!h) return "";
  return h.startsWith("#") ? h : `#${h}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = safeHex(hex).replace("#", "").trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

function hexToHslKey(hex?: string | null): [number, number, number] {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return [999, 999, 999];

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return [h, Math.round(s * 100), Math.round(l * 100)];
}

function sortByHexHsl(a: Color, b: Color) {
  const A = hexToHslKey(a.hex);
  const B = hexToHslKey(b.hex);

  if (A[0] !== B[0]) return A[0] - B[0];
  if (A[1] !== B[1]) return A[1] - B[1];
  if (A[2] !== B[2]) return A[2] - B[2];

  const an = (a.name || "").toLowerCase();
  const bn = (b.name || "").toLowerCase();
  if (an !== bn) return an.localeCompare(bn);

  return (a.id ?? 0) - (b.id ?? 0);
}

/** ---------- tiny tailwind style system ---------- */

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

/** --------------- Drawer shell --------------- */

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
  // Optional: lock scroll while drawer is open
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
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onMouseDown={() => onClose()}
      />

      {/* right panel */}
      <div className="absolute inset-0 flex justify-end">
        <div
          className="h-full w-full bg-white shadow-2xl flex flex-col"
          style={{ maxWidth: width }}
          onMouseDown={(e) => e.stopPropagation()} // keep clicks inside from closing
        >
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900 truncate">
              {title}
            </div>
            <button type="button" className={btnBase} onClick={onClose}>
              Close
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** --------------- Page --------------- */

export default function ColorsAdminPage() {
  const [items, setItems] = useState<Color[]>([]);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Color | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const res = await api.get(ENDPOINTS.colors);
    setItems(getListData<Color>(res.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const base = !qq
      ? items
      : items.filter((c) =>
          `${c.name} ${c.lego_id ?? ""} ${c.hex ?? ""}`.toLowerCase().includes(qq)
        );

    return base.slice().sort(sortByHexHsl);
  }, [items, q]);

  function openDetail(c: Color) {
    setSelected(c);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  async function create(payload: any) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.colors, payload);
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
      const res = await api.patch(`${ENDPOINTS.colors}${selected.id}/`, payload);
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
    if (!confirm("Delete this Color?")) return;
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.colors}${selected.id}/`);
      setDetailOpen(false);
      setSelected(null);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const countLabel = `${filtered.length} colors`;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          className={cx(inputBase, "sm:max-w-md")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, lego id, hex..."
          autoComplete="off"
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
            + New Color
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold sm:ml-auto">{countLabel}</div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* List */}
      <div className={card}>
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No results.</div>
        ) : (
          filtered.map((c, idx) => {
            const swatch = safeHex(c.hex) || "#e5e7eb";
            const legoText = c.lego_id != null ? `LEGO ${c.lego_id}` : "LEGO —";
            const hexText = safeHex(c.hex) || "—";

            return (
              <button
                key={c.id ?? `${c.name}-${idx}`}
                type="button"
                onClick={() => openDetail(c)}
                className={cx(
                  "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50",
                  idx === 0 ? "" : "border-t border-slate-200"
                )}
              >
                <div
                  className="h-4 w-4 rounded-md border border-black/10 shrink-0"
                  style={{ background: swatch }}
                  title={hexText}
                />

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 truncate" title={c.name}>
                    {c.name}
                  </div>

                  {/* Mobile subline */}
                  <div className="sm:hidden text-xs text-slate-500 font-semibold flex gap-3">
                    <span>{legoText}</span>
                    <span>{hexText}</span>
                  </div>
                </div>

                {/* Desktop columns */}
                <div className="hidden sm:block w-[110px] text-xs text-slate-600 font-semibold text-right">
                  {legoText}
                </div>
                <div className="hidden sm:block w-[90px] text-xs text-slate-600 font-semibold text-right">
                  {hexText}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Create */}
      <DrawerShell open={createOpen} title="New Color" onClose={() => setCreateOpen(false)} width={820}>
        <ColorForm submitting={saving} onSubmit={create} />
      </DrawerShell>

      {/* Detail */}
      <DrawerShell
        open={detailOpen}
        title={selected ? selected.name : "Color"}
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
              {/* hero swatch */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden aspect-square">
                <div
                  className="h-full w-full"
                  style={{ background: safeHex(selected.hex) || "#e5e7eb" }}
                  title={safeHex(selected.hex) || "—"}
                />
              </div>

              {/* details */}
              <div className={cx(card, "p-4 space-y-3")}>
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-600">Hex</div>
                  <div className="text-sm font-extrabold text-slate-900">{safeHex(selected.hex) || "—"}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-600">Flags</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selected.is_transparent ? "Transparent" : "Not transparent"} •{" "}
                    {selected.is_metallic ? "Metallic" : "Not metallic"}
                  </div>
                </div>

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
                <div className="mb-3 text-xs font-black text-slate-600">Edit this Color</div>
                <ColorForm submitting={saving} initialValues={selected} onSubmit={saveEdit} />
              </div>
            ) : null}
          </div>
        )}
      </DrawerShell>
    </div>
  );
}
