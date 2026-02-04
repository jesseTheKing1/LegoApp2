import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import { PartColorForm } from "../form/PartColorForm";
import type { PartColorRow } from "../../../types/partColor";
import type { CatalogItemMini} from "../../../types/catalog";
import type { Color } from "../../../types/color";
import type { Part } from "../../../types/part";
import { getListData } from "../utils/list"
import { formatApiError } from "../utils/errors"
import { DrawerShell } from "../components/DrawerShell";
import { RowThumb, MiniThumb } from "../components/Thumbs";
import {
  cx,
  card,
  btnPrimary,
  btnDanger,
  btnBase,
  inputBase,
} from "../utils/ui";
import { PartColorDetailDrawer } from "../components/PartColorDetailDrawer";

function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
}

function buildSuggestedSku(pc: PartColorRow) {
  const pid = pc.part?.part_id ?? "PART";
  const cname = pc.color?.name ?? "COLOR";
  const v = pc.variant ? `-${pc.variant}` : "";
  return `PC-${pid}-${cname}${v}`.replace(/\s+/g, "_").toUpperCase();
}


/** ---------------- Page ---------------- */

type Group = { part: Part; rows: PartColorRow[] };

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

    let arr = Array.from(map.values()).sort((a, b) => (a.part.part_id ?? "").localeCompare(b.part.part_id ?? ""));

    const qq = q.trim().toLowerCase();
    if (qq) {
      arr = arr
        .map((g) => {
          const partHit = `${g.part.part_id ?? ""} ${g.part.name ?? ""}`.toLowerCase().includes(qq);
          const rows = partHit
            ? g.rows
            : g.rows.filter((pc) =>
                `${pc.part_color_code ?? ""} ${pc.color?.name ?? ""} ${pc.variant ?? ""}`.toLowerCase().includes(qq)
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
    grouped.forEach((g) => {
      if (g.part?.id != null) all[g.part.id] = true;
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
      // also refresh catalog list in case SKU/price changed
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
    <div className="space-y-3">
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

      {err ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

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
                    <div className="text-sm font-extrabold text-slate-900 break-words">
                      {g.part.part_id} — {g.part.name}{" "}
                      <span className="text-slate-500 font-bold">({g.rows.length})</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {thumbs.map((t, i) => (
                        <MiniThumb key={`${g.part.id}-t-${i}`} src={t} />
                      ))}
                      {Array.from({ length: showPlaceholders }).map((_, i) => (
                        <MiniThumb key={`${g.part.id}-p-${i}`} src={null} />
                      ))}
                      <div className="text-xs text-slate-500 font-semibold">{thumbs.length > 0 ? "preview" : "no images yet"}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-semibold">{isOpen ? "hide" : "show"}</div>
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-200">
                    {g.rows.map((pc, pcIdx) => {
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

                          <div className="hidden sm:block w-[240px] text-xs font-semibold text-slate-600 truncate">{idText}</div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-extrabold text-slate-900 truncate">
                              {nameText}{" "}
                              {pc.variant ? <span className="text-slate-500 font-bold">• {pc.variant}</span> : null}

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
          // also refresh catalog list because pricing could have changed
          api.get(ENDPOINTS.catalog).then((res) => setCatalogItems(getListData<CatalogItemMini>(res.data))).catch(() => {});
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
