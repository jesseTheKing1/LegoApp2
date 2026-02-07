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

function readStr(v: unknown): string {
  return String(v ?? "").trim();
}

// Safe getters (won't explode if your TS Part type is missing these fields)
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

function sortRowsInShape(rows: PartColorRow[]) {
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

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
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

  /**
   * ✅ Grouping:
   * Category (general_category)
   *   -> Shape (Part)
   *      -> Rows (PartColorRow)
   */
  const groupedByCategory: CategoryGroup[] = useMemo(() => {
    // A) build ShapeGroups (by part.id)
    const shapeMap = new Map<number, ShapeGroup>();

    for (const pc of items) {
      const part = pc.part;
      const key = part?.id;
      if (!key || !part) continue;

      if (!shapeMap.has(key)) shapeMap.set(key, { part, rows: [] });
      shapeMap.get(key)!.rows.push(pc);
    }

    // B) sort rows inside each shape
    for (const sg of shapeMap.values()) sortRowsInShape(sg.rows);

    // C) turn into array and sort shapes by part_id
    let shapes = Array.from(shapeMap.values()).sort((a, b) =>
      (a.part.part_id ?? "").localeCompare(b.part.part_id ?? "")
    );

    // D) apply search:
    // - if search hits the PART blob (including category fields), keep all rows
    // - else filter rows by row blob
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

    // E) group the shapes by category (general_category)
    const catMap = new Map<string, ShapeGroup[]>();
    for (const sg of shapes) {
      const cat = getCategoryLabel(sg.part);
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(sg);
    }

    // F) return categories sorted A->Z, but put "Uncategorized" last (nicer UX)
    const cats = Array.from(catMap.entries()).sort(([a], [b]) => {
      if (a === "Uncategorized" && b !== "Uncategorized") return 1;
      if (b === "Uncategorized" && a !== "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    return cats.map(([category, shapes]) => ({ category, shapes }));
  }, [items, q]);

  const totalShapeGroups = useMemo(
    () => groupedByCategory.reduce((sum, cg) => sum + cg.shapes.length, 0),
    [groupedByCategory]
  );

  function toggle(partPk: number) {
    setExpanded((prev) => ({ ...prev, [partPk]: !prev[partPk] }));
  }

  function expandAll() {
    const all: Record<number, boolean> = {};
    groupedByCategory.forEach((cg) => {
      cg.shapes.forEach((sg) => {
        if (sg.part?.id != null) all[sg.part.id] = true;
      });
    });
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
          groupedByCategory.map((cg, catIdx) => (
            <div key={cg.category} className={catIdx === 0 ? "" : "border-t border-slate-200"}>
              {/* Category header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="text-xs font-black tracking-wide text-slate-700 uppercase">
                  {cg.category}{" "}
                  <span className="text-slate-500 font-semibold">({cg.shapes.length})</span>
                </div>
              </div>

              {/* Shapes within category */}
              {cg.shapes.map((sg, idx) => {
                const isOpen = !!expanded[sg.part.id];
                const thumbs = sg.rows
                  .map((r) => r.thumb_url || r.image_url_1 || r.image_url_2 || null)
                  .filter(Boolean)
                  .slice(0, 4) as string[];

                const showPlaceholders = Math.max(0, 4 - thumbs.length);

                return (
                  <div key={sg.part.id} className={idx === 0 ? "" : "border-t border-slate-200"}>
                    <button
                      type="button"
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                      onClick={() => toggle(sg.part.id)}
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
              })}
            </div>
          ))
        )}
      </div>

      <DrawerShell open={createOpen} title="New PartColor" onClose={() => setCreateOpen(false)} width={980}>
        <PartColorForm
          parts={parts}
          colors={colors}
          catalogItems={catalogItems}
          submitting={saving}
          onSubmit={create}
        />
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
