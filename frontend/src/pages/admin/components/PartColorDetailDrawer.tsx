// src/pages/admin/components/PartColorDetailDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";

import { DrawerShell } from "./DrawerShell";
import { RowThumb } from "./Thumbs";

import { PartColorForm } from "../form/PartColorForm";
import { CatalogMiniEditor } from "./CatalogMiniEditor";

import { cx, card, btnPrimary, btnDanger, inputBase } from "../utils/ui";

import type { PartColorRow } from "../../../types/partColor";
import type { CatalogItemMini } from "../../../types/catalog";
import type { Color } from "../../../types/color";
import type { Part } from "../../../types/part";

function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
}

export function PartColorDetailDrawer({
  open,
  selected,
  allItems,
  colors,
  parts,
  catalogItems,
  saving,
  err,
  editing,
  onClose,
  onToggleEdit,
  onDelete,
  onSubmitEdit,
  onSelect,
  setSaving,
  setErr,
  onPatched,
}: {
  open: boolean;
  selected: PartColorRow | null;
  allItems: PartColorRow[];
  parts: Part[];
  colors: Color[];
  catalogItems: CatalogItemMini[];
  saving: boolean;
  err: string | null;
  editing: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onSubmitEdit: (payload: any) => void;
  onSelect: (pc: PartColorRow) => void;

  setSaving: (v: boolean) => void;
  setErr: (v: string | null) => void;
  onPatched: (pc: PartColorRow) => void;
}) {
  const [colorQ, setColorQ] = useState("");

  useEffect(() => {
    if (!open) setColorQ("");
  }, [open]);

  const partPk = selected?.part?.id;

  const siblings = useMemo(() => {
    if (!partPk) return [];
    return allItems.filter((x) => x.part?.id === partPk);
  }, [allItems, partPk]);

  const colorHexById = useMemo(() => {
    const m = new Map<number, string | null>();
    for (const c of colors) {
      if (c?.id == null) continue;
      m.set(c.id, safeHex((c as any).hex ?? null));
    }
    return m;
  }, [colors]);

  // ✅ Color swatches (one "best row" per color, still)
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
      const fromLookup = colorHexById.get(c.id) ?? null;
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

    return Array.from(map.values()).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [siblings, colorHexById]);

  const swatchesFiltered = useMemo(() => {
    const qq = colorQ.trim().toLowerCase();
    if (!qq) return swatches;
    return swatches.filter((s) => (s.name ?? "").toLowerCase().includes(qq));
  }, [swatches, colorQ]);

  const heroSrc = selected?.image_url_1 || selected?.thumb_url || selected?.image_url_2 || null;

  const drawerTitle = useMemo(() => {
    if (!selected?.part) return "PartColor";
    const pid = selected.part.part_id ?? "Part";
    return `${pid} • PartColor Details`;
  }, [selected]);

  const partLine = `${selected?.part?.part_id ?? "—"} — ${selected?.part?.name ?? "—"}`;
  const colorLine = `${selected?.color?.name ?? "—"}${selected?.variant ? ` • ${selected.variant}` : ""}`;

  // ✅ NEW: variants list for the currently selected color (same part)
  const selectedColorId = selected?.color?.id ?? null;

  const variantsForSelectedColor = useMemo(() => {
    if (!selectedColorId) return [];
    return siblings.filter((x) => x.color?.id === selectedColorId);
  }, [siblings, selectedColorId]);

  const variantOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ label: string; key: string }> = [];

    for (const row of variantsForSelectedColor) {
      const v = (row.variant ?? "").trim();
      const key = v ? v.toLowerCase() : "__none__";
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: v || "(no variant)", key });
    }

    out.sort((a, b) => {
      if (a.key === "__none__" && b.key !== "__none__") return -1;
      if (b.key === "__none__" && a.key !== "__none__") return 1;
      return a.label.localeCompare(b.label);
    });

    return out;
  }, [variantsForSelectedColor]);

  const selectedVariantKey = useMemo(() => {
    const v = (selected?.variant ?? "").trim();
    return v ? v.toLowerCase() : "__none__";
  }, [selected]);

  function pickVariant(key: string) {
    if (!selectedColorId) return;

    const match = variantsForSelectedColor.find((r) => {
      const v = (r.variant ?? "").trim();
      const k = v ? v.toLowerCase() : "__none__";
      return k === key;
    });

    if (match) onSelect(match);
  }

  return (
    <DrawerShell open={open} title={drawerTitle} onClose={onClose} width={980}>
      {!selected ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No selection.</div>
      ) : (
        <div className="space-y-4">
          {err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          ) : null}

          <div className={cx(card, "p-4")}>
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="w-full lg:w-[260px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden aspect-square flex items-center justify-center">
                  {heroSrc ? (
                    <img
                      src={heroSrc}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="text-xs text-slate-500 font-black">No image</div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <RowThumb src={selected.thumb_url || selected.image_url_1 || selected.image_url_2 || null} />
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-extrabold text-slate-900 truncate">{partLine}</div>
                    <div className="mt-1 text-sm font-bold text-slate-700 truncate">{colorLine}</div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button type="button" className={btnPrimary} onClick={onToggleEdit} disabled={saving}>
                      {editing ? "Stop editing" : "Edit"}
                    </button>
                    <button type="button" className={btnDanger} onClick={onDelete} disabled={saving}>
                      Delete
                    </button>
                  </div>
                </div>

                {(selected.image_url_1 || selected.image_url_2) ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
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
              </div>
            </div>
          </div>

          {/* ✅ Choose a color */}
          {swatches.length > 0 ? (
            <div className={cx(card, "p-3 sm:p-4")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-black text-slate-600">Choose a color</div>

                {swatches.length >= 16 ? (
                  <input
                    className={cx(inputBase, "sm:w-[280px]")}
                    value={colorQ}
                    onChange={(e) => setColorQ(e.target.value)}
                    placeholder="Search..."
                    autoComplete="off"
                  />
                ) : null}
              </div>

              <div className="mt-3 grid gap-1.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {swatchesFiltered.map((s) => {
                  const active = selected.color?.id === s.colorId;

                  return (
                    <button
                      key={s.colorId}
                      type="button"
                      onClick={() => onSelect(s.row)}
                      title={s.name}
                      className={cx(
                        "w-full rounded-xl border px-2 py-1.5 text-left transition",
                        "min-h-[44px] flex items-center gap-2",
                        active
                          ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1 ring-offset-white bg-slate-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span
                        className={cx(
                          "h-5 w-5 rounded-md border border-black/10 shrink-0",
                          active ? "outline outline-2 outline-slate-900 outline-offset-1" : ""
                        )}
                        style={{ background: s.hex ?? "#e5e7eb" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cx(
                            "block text-xs font-extrabold truncate",
                            active ? "text-slate-900" : "text-slate-800"
                          )}
                        >
                          {s.name}
                        </span>
                      </span>
                      {active ? (
                        <span className="h-4 w-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ✅ NEW: Variant picker for selected color */}
          {variantOptions.length > 0 ? (
            <div className={cx(card, "p-3 sm:p-4")}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-slate-600">Variants</div>
                <div className="text-xs text-slate-500 font-semibold">{variantOptions.length} options</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {variantOptions.map((v) => {
                  const active = v.key === selectedVariantKey;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => pickVariant(v.key)}
                      className={cx(
                        "rounded-full border px-3 py-1.5 text-xs font-extrabold",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                      title={`Switch to ${v.label}`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <CatalogMiniEditor selected={selected} saving={saving} setSaving={setSaving} setErr={setErr} onPatched={onPatched} />

          {editing ? (
            <div className={cx(card, "p-4")}>
              <div className="mb-3 text-xs font-black text-slate-600">Edit this PartColor</div>
              <PartColorForm
                parts={parts}
                colors={colors}
                catalogItems={catalogItems}
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
