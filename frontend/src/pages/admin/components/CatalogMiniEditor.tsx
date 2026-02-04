import React, { useEffect, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { formatApiError } from "../utils/errors";

import { cx, card, btnPrimary, btnDanger, inputBase } from "../utils/ui";

import type { PartColorRow } from "../../../types/partColor";
import type { CatalogItemMini, CatalogItemPayload } from "../../../types/catalog";

function buildSuggestedSku(pc: PartColorRow) {
  const pid = pc.part?.part_id ?? "PART";
  const cname = pc.color?.name ?? "COLOR";
  const v = pc.variant ? `-${pc.variant}` : "";
  return `PC-${pid}-${cname}${v}`.replace(/\s+/g, "_").toUpperCase();
}

export function CatalogMiniEditor({
  selected,
  saving,
  setSaving,
  setErr,
  onPatched,
}: {
  selected: PartColorRow;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setErr: (v: string | null) => void;
  onPatched: (pc: PartColorRow) => void;
}) {
  const ci: CatalogItemMini | null = selected.catalog_item ?? null;

  const [sku, setSku] = useState(ci?.sku ?? "");
  const [isActive, setIsActive] = useState(ci?.is_active ?? true);
  const [baseOverride, setBaseOverride] = useState<string>(ci?.base_price_override ?? "");
  const [forceOverride, setForceOverride] = useState<boolean>(ci?.force_override ?? false);
  const [notes, setNotes] = useState(ci?.notes ?? "");

  useEffect(() => {
    const next = selected.catalog_item ?? null;
    setSku(next?.sku ?? "");
    setIsActive(next?.is_active ?? true);
    setBaseOverride(next?.base_price_override ?? "");
    setForceOverride(next?.force_override ?? false);
    setNotes(next?.notes ?? "");
  }, [selected.id, selected.catalog_item?.id]);

  async function refreshPartColor() {
    const refreshed = await api.get(`${ENDPOINTS.partColors}${selected.id}/`);
    onPatched(refreshed.data);
  }

  async function createAndAttach() {
    setSaving(true);
    setErr(null);
    try {
      const createPayload: CatalogItemPayload = {
        sku: sku.trim() ? sku.trim() : buildSuggestedSku(selected),
        is_active: true,
        base_price_override: null,
        force_override: false,
        notes: "",
      };

      const created = await api.post(ENDPOINTS.catalog, createPayload);
      const newId = created.data?.id;

      await api.patch(`${ENDPOINTS.partColors}${selected.id}/`, { catalog_item_id: newId });
      await refreshPartColor();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function detach() {
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`${ENDPOINTS.partColors}${selected.id}/`, { catalog_item_id: null });
      await refreshPartColor();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveCatalog() {
    if (!ci?.id) return;
    setSaving(true);
    setErr(null);
    try {
      const payload: CatalogItemPayload = {
        sku: sku.trim(),
        is_active: isActive,
        base_price_override: baseOverride.trim() === "" ? null : baseOverride.trim(),
        force_override: forceOverride,
        notes,
      };

      await api.patch(`${ENDPOINTS.catalog}${ci.id}/`, payload);
      await refreshPartColor();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cx(card, "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black text-slate-600">Pricing (Catalog Item)</div>
        {ci ? (
          <button type="button" className={btnDanger} onClick={detach} disabled={saving}>
            Detach
          </button>
        ) : (
          <button type="button" className={btnPrimary} onClick={createAndAttach} disabled={saving}>
            Create & Attach
          </button>
        )}
      </div>

      {!ci ? (
        <div className="mt-3">
          <div className="text-sm text-slate-600">
            No catalog item attached. Create one to store price override, active flag, and notes.
          </div>

          <div className="mt-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">SKU (optional)</label>
            <input
              className={inputBase}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder={buildSuggestedSku(selected)}
              disabled={saving}
              autoComplete="off"
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">SKU</label>
            <input className={inputBase} value={sku} onChange={(e) => setSku(e.target.value)} disabled={saving} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Base price override</label>
            <input
              className={inputBase}
              value={baseOverride}
              onChange={(e) => setBaseOverride(e.target.value)}
              placeholder="e.g. 0.0375"
              disabled={saving}
              autoComplete="off"
            />
            <div className="mt-1 text-[11px] text-slate-500 font-semibold">Blank = null (clears override).</div>
          </div>

          <div className="flex items-end gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={forceOverride}
                onChange={(e) => setForceOverride(e.target.checked)}
                disabled={saving}
              />
              Force override
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
              />
              Active
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
            <textarea
              className={cx(inputBase, "min-h-[90px]")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button type="button" className={btnPrimary} onClick={saveCatalog} disabled={saving}>
              Save pricing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
