import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { PartColorForm, Part, Color, PartColorRow } from "../form/PartColorForm";

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

function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
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

const card =
  "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden";

const muted = "text-slate-600";
const muted2 = "text-slate-500";

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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="h-full bg-white shadow-2xl w-full"
        style={{ width: `min(${width}px, 100%)` }}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900 truncate">{title}</div>
          <button type="button" className={btnBase} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="h-[calc(100%-56px)] overflow-auto p-4">{children}</div>
      </div>
    </div>
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

function MiniThumb({ src }: { src?: string | null }) {
  return (
    <div className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
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
        <span className="text-[9px] text-slate-300 font-black">•</span>
      )}
    </div>
  );
}

/** ---------------- Detail drawer ---------------- */

function PartColorDetailDrawer({
  open,
  selected,
  allItems,
  colors,
  parts,
  saving,
  err,
  editing,
  onClose,
  onToggleEdit,
  onDelete,
  onSubmitEdit,
  onSelect,
}: {
  open: boolean;
  selected: PartColorRow | null;
  allItems: PartColorRow[];
  parts: Part[];
  colors: Color[];
  saving: boolean;
  err: string | null;
  editing: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onSubmitEdit: (payload: any) => void;
  onSelect: (pc: PartColorRow) => void;
}) {
  const partPk = selected?.part?.id;

  const siblings = useMemo(() => {
    if (!partPk) return [];
    return allItems.filter((x) => x.part?.id === partPk);
  }, [allItems, partPk]);

  const swatches = useMemo(() => {
    const map = new Map<
      number,
      { colorId: number; name: string; hex: string | null; row: PartColorRow; count: number }
    >();

    const score = (r: PartColorRow) => {
      let s = 0;
      if (r.thumb_url || r.image_url_1 || r.image_url_2) s += 10;
      if (!r.variant) s += 2;
      if (r.part_color_code) s += 1;
      return s;
    };

    for (const row of siblings) {
      const c = row.color;
      if (!c?.id) continue;

      const fromRow = safeHex((c as any).hex ?? null);
      const fromLookup = safeHex(colors.find((x) => x.id === c.id)?.hex ?? null);
      const cHex = fromRow ?? fromLookup ?? null;

      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, { colorId: c.id, name: c.name ?? "—", hex: cHex, row, count: 1 });
        continue;
      }

      existing.count += 1;
      if (score(row) > score(existing.row)) {
        map.set(c.id, { ...existing, row, hex: existing.hex ?? cHex });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [siblings, colors]);

  const heroSrc = selected?.image_url_1 || selected?.thumb_url || selected?.image_url_2 || null;

  return (
    <DrawerShell
      open={open}
      title={selected?.part ? `${selected.part.part_id} — ${selected.part.name}` : "PartColor"}
      onClose={onClose}
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
              {heroSrc ? (
                <img
                  src={heroSrc}
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

            {/* details */}
            <div className={cx(card, "p-4 space-y-3")}>
              <div className="flex items-center gap-3">
                <RowThumb src={selected.thumb_url || selected.image_url_1 || selected.image_url_2 || null} />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {selected.color?.name ?? "—"}
                    {selected.variant ? (
                      <span className="text-slate-500 font-bold"> • {selected.variant}</span>
                    ) : null}
                  </div>

                  <div className="text-xs text-slate-500 font-semibold truncate">
                    <span className="text-slate-900 font-bold">{selected.part?.part_id ?? "—"}</span>{" "}
                    — {selected.part?.name ?? "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500 font-black">Your PartColor ID</div>
                <div className="text-sm font-extrabold text-slate-900">{selected.part_color_code ?? "—"}</div>
              </div>

              {selected.image_url_1 || selected.image_url_2 ? (
                <div className="flex flex-wrap gap-3">
                  {selected.image_url_1 ? (
                    <a
                      href={selected.image_url_1}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      Open image 1
                    </a>
                  ) : null}
                  {selected.image_url_2 ? (
                    <a
                      href={selected.image_url_2}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      Open image 2
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {editing ? "Stop editing" : "Edit"}
                </button>

                <button
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  className="rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Delete
                </button>

                <div className="text-xs text-slate-500 font-semibold self-center">
                  {siblings.length} variants for this shape
                </div>
              </div>
            </div>
          </div>

          {swatches.length > 0 ? (
            <div className={cx(card, "p-4 space-y-2")}>
              <div className="text-xs font-black text-slate-600">Switch color</div>
              <div className="flex flex-wrap gap-2">
                {swatches.map((s) => {
                  const active = selected.color?.id === s.colorId;
                  return (
                    <button
                      key={s.colorId}
                      type="button"
                      onClick={() => onSelect(s.row)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-md border border-black/10"
                        style={{ background: s.hex ?? "#e5e7eb" }}
                      />
                      <span className="whitespace-nowrap">{s.name}</span>
                      {s.count > 1 ? (
                        <span className={cx("text-xs", active ? "text-white/80" : "text-slate-500")}>
                          +{s.count - 1}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {editing ? (
            <div className={cx(card, "p-4")}>
              <div className="mb-3 text-xs font-black text-slate-600">Edit this PartColor</div>
              <PartColorForm
                parts={parts}
                colors={colors}
                submitting={saving}
                initialValues={selected}
                onSubmit={onSubmitEdit}
              />
            </div>
          ) : null}
        </div>
      )}
    </DrawerShell>
  );
}

/** ---------------- Page ---------------- */

type Group = { part: Part; rows: PartColorRow[] };

export default function PartColorsPage() {
  const [items, setItems] = useState<PartColorRow[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [q, setQ] = useState("");

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<PartColorRow | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const [pcRes, pRes, cRes] = await Promise.all([
      api.get(ENDPOINTS.partColors),
      api.get(ENDPOINTS.parts),
      api.get(ENDPOINTS.colors),
    ]);

    setItems(getListData<PartColorRow>(pcRes.data));
    setParts(getListData<Part>(pRes.data));
    setColors(getListData<Color>(cRes.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped: Group[] = useMemo(() => {
    const map = new Map<number, Group>();

    for (const pc of items) {
      const key = pc.part?.id;
      if (!key || !pc.part) continue;
      if (!map.has(key)) map.set(key, { part: pc.part, rows: [] });
      map.get(key)!.rows.push(pc);
    }

    for (const g of map.values()) {
      g.rows.sort((a, b) => {
        const ac = (a.part_color_code ?? "").toLowerCase();
        const bc = (b.part_color_code ?? "").toLowerCase();
        if (ac !== bc) return ac.localeCompare(bc);

        const an = (a.color?.name ?? "").toLowerCase();
        const bn = (b.color?.name ?? "").toLowerCase();
        if (an !== bn) return an.localeCompare(bn);

        return (a.variant ?? "").localeCompare(b.variant ?? "");
      });
    }

    let arr = Array.from(map.values()).sort((a, b) =>
      (a.part.part_id ?? "").localeCompare(b.part.part_id ?? "")
    );

    const qq = q.trim().toLowerCase();
    if (qq) {
      arr = arr
        .map((g) => {
          const partHit = `${g.part.part_id ?? ""} ${g.part.name ?? ""}`.toLowerCase().includes(qq);

          const rows = partHit
            ? g.rows
            : g.rows.filter((pc) =>
                `${pc.part_color_code ?? ""} ${pc.color?.name ?? ""} ${pc.variant ?? ""}`
                  .toLowerCase()
                  .includes(qq)
              );

          return { ...g, rows };
        })
        .filter((g) => g.rows.length > 0);
    }

    return arr;
  }, [items, q]);

  function toggle(partPk: number) {
    setExpanded((prev) => ({ ...prev, [partPk]: !prev[partPk] }));
  }

  function expandAll() {
    const all: Record<number, boolean> = {};
    grouped.forEach((g) => (all[g.part.id] = true));
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded({});
  }

  function openDetail(pc: PartColorRow) {
    setSelected(pc);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  async function create(payload: any) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.partColors, payload);
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
      const res = await api.patch(`${ENDPOINTS.partColors}${selected.id}/`, payload);
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
    if (!confirm("Delete this PartColor?")) return;
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.partColors}${selected.id}/`);
      setDetailOpen(false);
      setSelected(null);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* top bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          className={cx(inputBase, "sm:max-w-md")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shape, color, variant, or your ID..."
          autoComplete="off"
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
            + New PartColor
          </button>

          <button type="button" className={btnBase} onClick={expandAll}>
            Expand all
          </button>

          <button type="button" className={btnBase} onClick={collapseAll}>
            Collapse all
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold sm:ml-auto">
          {grouped.length} shapes • {items.length} rows
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* grouped list */}
      <div className={card}>
        {grouped.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No results.</div>
        ) : (
          grouped.map((g, idx) => {
            const isOpen = !!expanded[g.part.id];
            const thumbs = g.rows
              .map((r) => r.thumb_url || r.image_url_1 || r.image_url_2 || null)
              .filter(Boolean)
              .slice(0, 4) as string[];

            const showPlaceholders = Math.max(0, 4 - thumbs.length);

            return (
              <div key={g.part.id} className={idx === 0 ? "" : "border-t border-slate-200"}>
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                  onClick={() => toggle(g.part.id)}
                >
                  <div className="w-6 text-slate-500 font-black">{isOpen ? "▾" : "▸"}</div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {g.part.part_id} — {g.part.name}{" "}
                      <span className="text-slate-500 font-bold">({g.rows.length})</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {thumbs.map((t, i) => (
                        <MiniThumb key={`${g.part.id}-t-${i}`} src={t} />
                      ))}
                      {Array.from({ length: showPlaceholders }).map((_, i) => (
                        <MiniThumb key={`${g.part.id}-p-${i}`} src={null} />
                      ))}
                      <div className="text-xs text-slate-500 font-semibold">
                        {thumbs.length > 0 ? "preview" : "no images yet"}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-semibold">
                    {isOpen ? "hide" : "show"}
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-200">
                    {g.rows.map((pc, pcIdx) => {
                      const img = pc.thumb_url || pc.image_url_1 || pc.image_url_2 || null;
                      const idText = pc.part_color_code ? `ID: ${pc.part_color_code}` : "ID: —";
                      const nameText = pc.color?.name ?? "—";

                      return (
                        <button
                          key={pc.id}
                          type="button"
                          className={cx(
                            "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50",
                            pcIdx === 0 ? "" : "border-t border-slate-100"
                          )}
                          onClick={() => openDetail(pc)}
                        >
                          <RowThumb src={img} />

                          <div className="hidden sm:block w-[220px] text-xs font-semibold text-slate-600 truncate">
                            {idText}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-extrabold text-slate-900 truncate">
                              {nameText}{" "}
                              {pc.variant ? (
                                <span className="text-slate-500 font-bold">• {pc.variant}</span>
                              ) : null}
                            </div>

                            {/* Mobile subline */}
                            <div className="sm:hidden text-xs text-slate-500 font-semibold truncate">
                              {idText}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* create */}
      <DrawerShell open={createOpen} title="New PartColor" onClose={() => setCreateOpen(false)} width={820}>
        <PartColorForm parts={parts} colors={colors} submitting={saving} onSubmit={create} />
      </DrawerShell>

      {/* detail */}
      <PartColorDetailDrawer
        open={detailOpen}
        selected={selected}
        allItems={items}
        parts={parts}
        colors={colors}
        saving={saving}
        err={err}
        editing={editing}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setEditing(false);
          setErr(null);
        }}
        onToggleEdit={() => setEditing((v) => !v)}
        onDelete={removeSelected}
        onSubmitEdit={saveEdit}
        onSelect={(pc) => {
          setSelected(pc);
          setEditing(false);
          setErr(null);
        }}
      />
    </div>
  );
}
