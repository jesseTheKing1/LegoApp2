// src/pages/admin/page/PartColorsPage.tsx
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
type SpecificCategoryGroup = { specificCategory: string; shapes: ShapeGroup[] };
type CategoryGroup = { category: string; specifics: SpecificCategoryGroup[] };

type VariantGroup = { variantLabel: string; rows: PartColorRow[] };
type ColorGroup = { colorId: number; colorName: string; groups: VariantGroup[] };

function readStr(v: unknown) {
  return String(v ?? "").trim();
}

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

function getSpecificCategoryLabel(p: Part): string {
  const s = getSpecificCategory(p);
  return s || "Unspecified";
}

function makeSpecificKey(general: string, specific: string) {
  return `${general}__${specific}`;
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

function groupRowsByColorThenVariant(rows: PartColorRow[]): ColorGroup[] {
  const colorMap = new Map<number, { colorName: string; variantMap: Map<string, PartColorRow[]> }>();

  for (const r of rows) {
    const cid = r.color?.id;
    if (!cid) continue;

    const cname = r.color?.name ?? "—";
    const v = (r.variant ?? "").trim();
    const vKey = v ? v.toLowerCase() : "__none__";

    if (!colorMap.has(cid)) {
      colorMap.set(cid, { colorName: cname, variantMap: new Map() });
    }

    const entry = colorMap.get(cid)!;
    if (!entry.variantMap.has(vKey)) entry.variantMap.set(vKey, []);
    entry.variantMap.get(vKey)!.push(r);
  }

  const colorGroups: ColorGroup[] = [];

  for (const [colorId, entry] of colorMap.entries()) {
    const groups: VariantGroup[] = [];

    for (const [vKey, vRows] of entry.variantMap.entries()) {
      sortRows(vRows);

      const first = vRows[0];
      const variantLabel =
        vKey === "__none__" ? "(no variant)" : (first?.variant ?? "").trim() || "(no variant)";

      groups.push({ variantLabel, rows: vRows });
    }

    groups.sort((a, b) => {
      if (a.variantLabel === "(no variant)" && b.variantLabel !== "(no variant)") return -1;
      if (b.variantLabel === "(no variant)" && a.variantLabel !== "(no variant)") return 1;
      return a.variantLabel.localeCompare(b.variantLabel);
    });

    colorGroups.push({
      colorId,
      colorName: entry.colorName,
      groups,
    });
  }

  colorGroups.sort((a, b) => a.colorName.localeCompare(b.colorName));
  return colorGroups;
}

export default function PartColorsPage() {
  const [items, setItems] = useState<PartColorRow[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);
  const [q, setQ] = useState("");

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [catExpanded, setCatExpanded] = useState<Record<string, boolean>>({});
  const [specificExpanded, setSpecificExpanded] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
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
  }, []);

  const partsById = useMemo(() => {
    const m = new Map<number, Part>();
    for (const p of parts) m.set(p.id, p);
    return m;
  }, [parts]);

  const groupedByCategory: CategoryGroup[] = useMemo(() => {
    const shapeMap = new Map<number, ShapeGroup>();

    for (const pc of items) {
      const pid = pc.part?.id;
      if (!pid) continue;

      const fullPart = partsById.get(pid) ?? pc.part;
      if (!fullPart) continue;

      if (!shapeMap.has(pid)) {
        shapeMap.set(pid, { part: fullPart, rows: [] });
      }

      shapeMap.get(pid)!.rows.push(pc);
    }

    for (const sg of shapeMap.values()) {
      sortRows(sg.rows);
    }

    let shapes = Array.from(shapeMap.values()).sort((a, b) =>
      (a.part.part_id ?? "").localeCompare(b.part.part_id ?? "")
    );

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

    const generalMap = new Map<string, Map<string, ShapeGroup[]>>();

    for (const sg of shapes) {
      const general = getCategoryLabel(sg.part);
      const specific = getSpecificCategoryLabel(sg.part);

      if (!generalMap.has(general)) generalMap.set(general, new Map());
      const specificMap = generalMap.get(general)!;

      if (!specificMap.has(specific)) specificMap.set(specific, []);
      specificMap.get(specific)!.push(sg);
    }

    const generalEntries = Array.from(generalMap.entries()).sort(([a], [b]) => {
      if (a === "Uncategorized" && b !== "Uncategorized") return 1;
      if (b === "Uncategorized" && a !== "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    return generalEntries.map(([category, specificMap]) => {
      const specifics = Array.from(specificMap.entries())
        .sort(([a], [b]) => {
          if (a === "Unspecified" && b !== "Unspecified") return 1;
          if (b === "Unspecified" && a !== "Unspecified") return -1;
          return a.localeCompare(b);
        })
        .map(([specificCategory, shapes]) => ({
          specificCategory,
          shapes: shapes.sort((a, b) => (a.part.part_id ?? "").localeCompare(b.part.part_id ?? "")),
        }));

      return { category, specifics };
    });
  }, [items, q, partsById]);

  const totalShapeGroups = useMemo(
    () =>
      groupedByCategory.reduce(
        (sum, cg) => sum + cg.specifics.reduce((inner, sg) => inner + sg.shapes.length, 0),
        0
      ),
    [groupedByCategory]
  );

  function toggleShape(partPk: number) {
    setExpanded((prev) => ({ ...prev, [partPk]: !prev[partPk] }));
  }

  function toggleCategory(cat: string) {
    setCatExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function toggleSpecific(general: string, specific: string) {
    const key = makeSpecificKey(general, specific);
    setSpecificExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function expandAll() {
    const allCats: Record<string, boolean> = {};
    const allSpecifics: Record<string, boolean> = {};
    const allShapes: Record<number, boolean> = {};

    groupedByCategory.forEach((cg) => {
      allCats[cg.category] = true;

      cg.specifics.forEach((scg) => {
        allSpecifics[makeSpecificKey(cg.category, scg.specificCategory)] = true;

        scg.shapes.forEach((sg) => {
          if (sg.part?.id != null) allShapes[sg.part.id] = true;
        });
      });
    });

    setCatExpanded(allCats);
    setSpecificExpanded(allSpecifics);
    setExpanded(allShapes);
  }

  function collapseAll() {
    setCatExpanded({});
    setSpecificExpanded({});
    setExpanded({});
  }

  function openDetail(pc: PartColorRow) {
    setSelected(pc);
    setDetailOpen(true);
    setErr(null);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelected(null);
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

  async function refreshCatalogItems() {
    const catRes = await api.get(ENDPOINTS.catalog);
    setCatalogItems(getListData<CatalogItemMini>(catRes.data));
  }

  async function saveEdit(payload: any) {
    if (!selected?.id) return;

    setSaving(true);
    setErr(null);

    try {
      const res = await api.patch(`${ENDPOINTS.partColors}${selected.id}/`, payload);
      applyPatched(res.data);
      await refreshCatalogItems();
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
      closeDetail();
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
          placeholder="Search category, specific category, shape, color, variant, or your ID..."
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

        <div className="text-xs font-semibold text-slate-500 sm:ml-auto">
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
            const specificCount = cg.specifics.length;
            const shapeCount = cg.specifics.reduce((sum, scg) => sum + scg.shapes.length, 0);

            return (
              <div key={cg.category} className={catIdx === 0 ? "" : "border-t border-slate-200"}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cg.category)}
                  className="flex w-full items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                >
                  <div className="w-6 font-black text-slate-600">{catOpen ? "▾" : "▸"}</div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-700">
                      {cg.category}{" "}
                      <span className="font-semibold text-slate-500">
                        ({specificCount} specific • {shapeCount} shapes)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">{catOpen ? "hide" : "show"}</div>
                </button>

                {catOpen
                  ? cg.specifics.map((scg, scgIdx) => {
                      const specificKey = makeSpecificKey(cg.category, scg.specificCategory);
                      const specificOpen = !!specificExpanded[specificKey];

                      return (
                        <div key={specificKey} className={scgIdx === 0 ? "" : "border-t border-slate-200"}>
                          <button
                            type="button"
                            onClick={() => toggleSpecific(cg.category, scg.specificCategory)}
                            className="flex w-full items-center gap-3 bg-white px-6 py-3 text-left hover:bg-slate-50"
                          >
                            <div className="w-6 font-black text-slate-500">{specificOpen ? "▾" : "▸"}</div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black uppercase tracking-wide text-slate-600">
                                {scg.specificCategory}{" "}
                                <span className="font-semibold text-slate-400">({scg.shapes.length})</span>
                              </div>
                            </div>

                            <div className="text-xs font-semibold text-slate-500">
                              {specificOpen ? "hide" : "show"}
                            </div>
                          </button>

                          {specificOpen
                            ? scg.shapes.map((sg, idx) => {
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
                                      className="flex w-full items-center gap-3 px-8 py-3 text-left hover:bg-slate-50"
                                      onClick={() => toggleShape(sg.part.id)}
                                    >
                                      <div className="w-6 font-black text-slate-500">{isOpen ? "▾" : "▸"}</div>

                                      <div className="min-w-0 flex-1">
                                        <div className="break-words text-sm font-extrabold text-slate-900">
                                          {sg.part.part_id} — {sg.part.name}{" "}
                                          <span className="font-bold text-slate-500">({sg.rows.length})</span>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          {thumbs.map((t, i) => (
                                            <MiniThumb key={`${sg.part.id}-t-${i}`} src={t} />
                                          ))}

                                          {Array.from({ length: showPlaceholders }).map((_, i) => (
                                            <MiniThumb key={`${sg.part.id}-p-${i}`} src={null} />
                                          ))}

                                          <div className="text-xs font-semibold text-slate-500">
                                            {thumbs.length > 0 ? "preview" : "no images yet"}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-xs font-semibold text-slate-500">
                                        {isOpen ? "hide" : "show"}
                                      </div>
                                    </button>

                                    {isOpen ? (
                                      <div className="border-t border-slate-200">
                                        {groupRowsByColorThenVariant(sg.rows).map((cg2, cgIdx) => (
                                          <div
                                            key={cg2.colorId}
                                            className={cgIdx === 0 ? "" : "border-t border-slate-200"}
                                          >
                                            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
                                              <div className="truncate">{cg2.colorName}</div>
                                              <div className="font-semibold text-slate-500">
                                                {cg2.groups.reduce((sum, g) => sum + g.rows.length, 0)} rows
                                              </div>
                                            </div>

                                            {cg2.groups.map((vg, vgIdx) => (
                                              <div
                                                key={`${cg2.colorId}-${vg.variantLabel}`}
                                                className={vgIdx === 0 ? "" : "border-t border-slate-100"}
                                              >
                                                {cg2.groups.length > 1 ? (
                                                  <div className="px-4 py-2 text-xs font-bold text-slate-600">
                                                    {vg.variantLabel}{" "}
                                                    <span className="font-semibold text-slate-400">
                                                      ({vg.rows.length})
                                                    </span>
                                                  </div>
                                                ) : null}

                                                {vg.rows.map((pc: PartColorRow, pcIdx: number) => {
                                                  const img =
                                                    pc.thumb_url || pc.image_url_1 || pc.image_url_2 || null;

                                                  const idText = pc.part_color_code
                                                    ? `ID: ${pc.part_color_code}`
                                                    : "ID: —";

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
                                                        "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50",
                                                        pcIdx === 0 ? "" : "border-t border-slate-100"
                                                      )}
                                                      onClick={() => openDetail(pc)}
                                                    >
                                                      <RowThumb src={img} />

                                                      <div className="hidden w-[240px] truncate text-xs font-semibold text-slate-600 sm:block">
                                                        {idText}
                                                      </div>

                                                      <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-extrabold text-slate-900">
                                                          {nameText}
                                                          {pc.variant ? (
                                                            <span className="font-bold text-slate-500">
                                                              {" "}• {pc.variant}
                                                            </span>
                                                          ) : null}

                                                          {priceBadge ? (
                                                            <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                                                              {priceBadge}
                                                            </span>
                                                          ) : null}
                                                        </div>

                                                        <div className="truncate text-xs font-semibold text-slate-500 sm:hidden">
                                                          {idText}
                                                        </div>
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            : null}
                        </div>
                      );
                    })
                  : null}
              </div>
            );
          })
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

      <DrawerShell
        open={detailOpen}
        title={selected?.part?.name ? `${selected.part.part_id} — ${selected.part.name}` : "Part Color Details"}
        onClose={closeDetail}
        width={1180}
      >
        <PartColorDetailDrawer
          row={selected}
          onUpdated={async () => {
            await loadAll();
            await refreshCatalogItems();
          }}
        />
      </DrawerShell>
    </div>
  );
}