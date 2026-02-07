import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import { PartColorForm } from "../form/PartColorForm";
import type { PartColorRow } from "../../../types/partColor";
import type { CatalogItemMini } from "../../../types/catalog";
import type { Color } from "../../../types/color";
import type { Part } from "../../../types/part";

import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { DrawerShell } from "../components/DrawerShell";
import { RowThumb, MiniThumb } from "../components/Thumbs";
import { cx, card, btnPrimary, btnBase, inputBase } from "../utils/ui";
import { PartColorDetailDrawer } from "../components/PartColorDetailDrawer";

type ShapeGroup = { part: Part; rows: PartColorRow[] };
type CategoryGroup = { category: string; shapes: ShapeGroup[] };

function readStr(v: unknown) {
  return String(v ?? "").trim();
}

// Safe reads for category fields (won't break if types drift)
function getGeneralCategory(p: Part): string {
  return readStr((p as any)?.general_category);
}
function getSpecificCategory(p: Part): string {
  return readStr((p as any)?.specific_category);
}
function getActualCategory(p: Part): string {
  return readStr((p as any)?.actual_category);
}
function getCategoryLabel(p: Part): string {
  const g = getGeneralCategory(p);
  return g || "Uncategorized";
}

function sortRows(rows: PartColorRow[]) {
  rows.sort((a, b) => {
    const ac = (a.part_color_code ?? "").toLowerCase();
    const bc = (b.part_color_code ?? "").toLowerCase();
    if (ac !== bc) return ac.localeCompare(bc);

    const an = (a.color?.name ?? "").toLowerCase();
    const bn = (b.color?.name ?? "").toLowerCase();
    if (an !== bn) return an.localeCompare(bn);

    return (a.variant ?? "").localeCompare(b.variant ?? "");
  });
}

export default function PartColorsPage() {
  const [items, setItems] = useState<PartColorRow[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);
  const [q, setQ] = useState("");

  // Shape expand/collapse (part.id -> bool)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Category expand/collapse (category string -> bool)
  const [catExpanded, setCatExpanded] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<PartColorRow | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const [pcRes, pRes, cRes, catRes] = await Promise.all([
      api.get(ENDPOINTS.partColors),
      api.get(ENDPOINTS.parts),
      api.get(ENDPOINTS.colors),
      api.get(ENDPOINTS.catalog),
    ]);

    setItems(getListData<PartColorRow>(pcRes.data));
    setParts(getListData<Part>(pRes.data));
    setColors(getListData<Color>(cRes.data));
    setCatalogItems(getListData<CatalogItemMini>(catRes.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use /parts as the source of truth (category fields always present here)
  const partsById = useMemo(() => {
    const m = new Map<number, Part>();
    for (const p of parts) m.set(p.id, p);
    return m;
  }, [parts]);

  /**
   * ✅ Grouping:
   * Category (general_category)
   *   -> Shape (part.id)
   *      -> Rows
   */
  const groupedByCategory: CategoryGroup[] = useMemo(() => {
    // A) group by shape (part.id)
    const shapeMap = new Map<number, ShapeGroup>();

    for (const pc of items) {
      const pid = pc.part?.id;
      if (!pid) continue;

      // ✅ always prefer the full part from /parts
      const fullPart = partsById.get(pid) ?? pc.part;
      if (!fullPart) continue;

      if (!shapeMap.has(pid)) shapeMap.set(pid, { part: fullPart, rows: [] });
      shapeMap.get(pid)!.rows.push(pc);
    }

    // B) sort rows inside each shape
    for (const sg of shapeMap.values()) sortRows(sg.rows);

    // C) shapes array sorted by part_id
    let shapes = Array.from(shapeMap.values()).sort((a, b) =>
      (a.part.part_id ?? "").localeCompare(b.part.part_id ?? "")
    );

    // D) search filter
    const qq = q.trim().toLowerCase();
    if (qq) {
      shapes = shapes
        .map((sg) => {
          const gc = getGeneralCategory(sg.part);
          const sc = getSpecificCategory(sg.part);
          const ac = getActualCategory(sg.part);

          const partBlob = `${sg.part.part_id ?? ""} ${sg.part.name ?? ""} ${gc} ${sc} ${ac}`.toLowerCase();
          const partHit = partBlob.includes(qq);

          const rows = partHit
            ? sg.rows
            : sg.rows.filter((pc) =>
                `${pc.part_color_code ?? ""} ${pc.color?.name ?? ""} ${pc.variant ?? ""}`
                  .toLowerCase()
                  .includes(qq)
              );

          return { ...sg, rows };
        })
        .filter((sg) => sg.rows.length > 0);
    }

    // E) group shapes by category
    const catMap = new Map<string, ShapeGroup[]>();
    for (const sg of shapes) {
      const cat = getCategoryLabel(sg.part);
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(sg);
    }

    // F) sort categories (Uncategorized last), shapes already sorted
    const cats = Array.from(catMap.entries()).sort(([a], [b]) => {
      if (a === "Uncategorized" && b !== "Uncategorized") return 1;
      if (b === "Uncategorized" && a !== "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    return cats.map(([category, shapes]) => ({ category, shapes }));
  }, [items, q, partsById]);

  const totalShapeGroups = useMemo(
    () => groupedByCategory.reduce((sum, cg) => sum + cg.shapes.length, 0),
    [groupedByCategory]
  );

  // Open all categories by default once we have data (only if user hasn't interacted)
  useEffect(() => {
    if (groupedByCategory.length === 0) return;
    if (Object.keys(catExpanded).length > 0) return;

    const all: Record<string, boolean> = {};
    groupedByCategory.forEach((cg) => (all[cg.category] = true));
    setCatExpanded(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedByCategory]);

  function toggleShape(partPk: number) {
    setExpanded((prev) => ({ ...prev, [partPk]: !prev[partPk] }));
  }

  function toggleCategory(cat: string) {
    setCatExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function expandAll() {
    // categories
    const allCats: Record<string, boolean> = {};
    groupedByCategory.forEach((cg) => (allCats[cg.category] = true));
    setCatExpanded(allCats);

    // shapes
    const allShapes: Record<number, boolean> = {};
    groupedByCategory.forEach((cg) => {
      cg.shapes.forEach((sg) => {
        if (sg.part?.id != null) allShapes[sg.part.id] = true;
      });
    });
    setExpanded(allShapes);
  }

  function collapseAll() {
    setCatExpanded({});
    setExpanded({});
  }

  function openDetail(pc: PartColorRow) {
    setSelected(pc);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  function applyPatched(pc: PartColorRow) {
    setSelected(pc);
    setItems((prev) => prev.map((x) => (x.id === pc.id ? pc : x)));
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
      applyPatched(res.data);
      setEditing(false);

      const catRes = await api.get(ENDPOINTS.catalog);
      setCatalogItems(getListData<CatalogItemMini>(catRes.data));
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
      setEditing(false);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          className={cx(inputBase, "sm:max-w-md")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search category, shape, color, variant, or your ID..."
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
          {totalShapeGroups} shapes • {items.length} rows
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className={card}>
        {groupedByCategory.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No results.</div>
        ) : (
          groupedByCategory.map((cg, catIdx) => {
            const catOpen = !!catExpanded[cg.category];

            return (
              <div key={cg.category} className={catIdx === 0 ? "" : "border-t border-slate-200"}>
                {/* ✅ Category accordion header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cg.category)}
                  className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 flex items-center gap-3 text-left"
                >
                  <div className="w-6 text-slate-600 font-black">{catOpen ? "▾" : "▸"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black tracking-wide text-slate-700 uppercase">
                      {cg.category}{" "}
                      <span className="text-slate-500 font-semibold">({cg.shapes.length})</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">{catOpen ? "hide" : "show"}</div>
                </button>

                {/* ✅ Shapes list only renders when category is open */}
                {catOpen ? (
                  cg.shapes.map((sg, idx) => {
                    const isOpen = !!expanded[sg.part.id];

                    const thumbs = sg.rows
                      .map((r) => r.thumb_url || r.image_url_1 || r.image_url_2 || null)
                      .filter(Boolean)
                      .slice(0, 4) as string[];

                    const showPlaceholders = Math.max(0, 4 - thumbs.length);

                    return (
                      <div key={sg.part.id} className={idx === 0 ? "" : "border-t border-slate-200"}>
                        {/* ✅ Shape accordion header */}
                        <button
                          type="button"
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                          onClick={() => toggleShape(sg.part.id)}
                        >
                          <div className="w-6 text-slate-500 font-black">{isOpen ? "▾" : "▸"}</div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-extrabold text-slate-900 break-words">
                              {sg.part.part_id} — {sg.part.name}{" "}
                              <span className="text-slate-500 font-bold">({sg.rows.length})</span>
                            </div>

                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {thumbs.map((t, i) => (
                                <MiniThumb key={`${sg.part.id}-t-${i}`} src={t} />
                              ))}
                              {Array.from({ length: showPlaceholders }).map((_, i) => (
                                <MiniThumb key={`${sg.part.id}-p-${i}`} src={null} />
                              ))}
                              <div className="text-xs text-slate-500 font-semibold">
                                {thumbs.length > 0 ? "preview" : "no images yet"}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 font-semibold">{isOpen ? "hide" : "show"}</div>
                        </button>

                        {/* Rows only render when shape is open */}
                        {isOpen ? (
                          <div className="border-t border-slate-200">
                            {sg.rows.map((pc, pcIdx) => {
                              const img = pc.thumb_url || pc.image_url_1 || pc.image_url_2 || null;
                              const idText = pc.part_color_code ? `ID: ${pc.part_color_code}` : "ID: —";
                              const nameText = pc.color?.name ?? "—";

                              const priceBadge =
                                pc.catalog_item && pc.catalog_item.base_price_override != null
                                  ? `$${pc.catalog_item.base_price_override}`
                                  : null;

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

                                  <div className="hidden sm:block w-[240px] text-xs font-semibold text-slate-600 truncate">
                                    {idText}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-extrabold text-slate-900 truncate">
                                      {nameText}{" "}
                                      {pc.variant ? (
                                        <span className="text-slate-500 font-bold">• {pc.variant}</span>
                                      ) : null}

                                      {priceBadge ? (
                                        <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                                          {priceBadge}
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="sm:hidden text-xs text-slate-500 font-semibold truncate">{idText}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <DrawerShell open={createOpen} title="New PartColor" onClose={() => setCreateOpen(false)} width={980}>
        <PartColorForm parts={parts} colors={colors} catalogItems={catalogItems} submitting={saving} onSubmit={create} />
      </DrawerShell>

      <PartColorDetailDrawer
        open={detailOpen}
        selected={selected}
        allItems={items}
        parts={parts}
        colors={colors}
        catalogItems={catalogItems}
        saving={saving}
        setSaving={setSaving}
        err={err}
        setErr={setErr}
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
        onPatched={(pc) => {
          applyPatched(pc);
          api
            .get(ENDPOINTS.catalog)
            .then((res) => setCatalogItems(getListData<CatalogItemMini>(res.data)))
            .catch(() => {});
        }}
        onSelect={(pc) => {
          setSelected(pc);
          setEditing(false);
          setErr(null);
        }}
      />
    </div>
  );
}
