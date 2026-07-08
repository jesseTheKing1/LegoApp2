import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { PartColorRow } from "../../../types/partColor";
import type { CatalogCostEntry, CatalogCostEntryPayload } from "../../../types/catalogCostEntry";
import type { CatalogItemPayload } from "../../../types/catalog";
import type {
  InventoryRecordPayload,
  InventoryRecordRow,
  LocationRow,
} from "../../../types/inventory";

import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { btnBase, btnPrimary, card, cx } from "../utils/ui";
import { RowThumb } from "./Thumbs";
import { InventoryRecordForm } from "../form/InventoryRecordForm";
import { integer, money } from "../utils/number";
import CatalogCostEntryForm from "../form/CatalogCostEntryForm";

type TabKey = "overview" | "inventory" | "costs";

function getEffectiveCatalog(row: PartColorRow | null | undefined) {
  return row?.effective_catalog_item ?? row?.catalog_item ?? null;
}

function getBrickLinkRef(row: PartColorRow): number | null {
  const v = getEffectiveCatalog(row)?.bricklink_reference_price;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type RarityTier = {
  label: string;
  className: string;
};

function getRarityTier(
  row: PartColorRow,
  familyRows: PartColorRow[]
): RarityTier | null {
  const current = getBrickLinkRef(row);
  if (current == null) return null;

  const priced = familyRows
    .map(getBrickLinkRef)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  if (priced.length < 2) {
    return {
      label: "Unclear",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  const min = priced[0];
  const max = priced[priced.length - 1];

  if (min <= 0 || max <= 0 || min === max) {
    return {
      label: "Even",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  const ratio = current / min;

  if (ratio >= 8) {
    return {
      label: "Rare",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (ratio >= 4) {
    return {
      label: "Scarce",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (ratio >= 2) {
    return {
      label: "Less Common",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "Common",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function asMoneyNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function moneyText(v: unknown) {
  const n = asMoneyNumber(v);
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function getDisplayPrice(row: PartColorRow | null) {
  const catalog = getEffectiveCatalog(row);
  if (!catalog) return null;
  return (
    asMoneyNumber(catalog.current_price) ??
    asMoneyNumber(catalog.base_price_override) ??
    null
  );
}

function getDisplayImage(row: PartColorRow | null) {
  if (!row) return "";
  return row.image_url_1 || row.image_url_2 || row.part?.image_url || "";
}

function metaValue(v: unknown) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function CompactStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cx(
        "rounded-xl border px-3 py-2",
        tone === "warn"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      )}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function MiniMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900 break-words">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      )}
    >
      {children}
    </button>
  );
}

function CatalogEditor({
  row,
  submitting,
  onSubmit,
  onCancel,
}: {
  row: PartColorRow;
  submitting: boolean;
  onSubmit: (payload: CatalogItemPayload) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [sku, setSku] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [basePriceOverride, setBasePriceOverride] = useState("");
  const [forceOverride, setForceOverride] = useState(false);
  const [legoReferencePrice, setLegoReferencePrice] = useState("");
  const [bricklinkReferencePrice, setBricklinkReferencePrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const catalog = getEffectiveCatalog(row);
    setSku(catalog?.sku ?? "");
    setIsActive(catalog?.is_active ?? true);
    setBasePriceOverride(catalog?.base_price_override ?? "");
    setForceOverride(catalog?.force_override ?? false);
    setLegoReferencePrice(catalog?.lego_reference_price ?? "");
    setBricklinkReferencePrice(catalog?.bricklink_reference_price ?? "");
    setNotes(catalog?.notes ?? "");
  }, [row]);

  function cleanNullable(v: string) {
    const s = v.trim();
    return s ? s : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      sku: sku.trim(),
      is_active: isActive,
      base_price_override: cleanNullable(basePriceOverride),
      force_override: forceOverride,
      lego_reference_price: cleanNullable(legoReferencePrice),
      bricklink_reference_price: cleanNullable(bricklinkReferencePrice),
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">SKU</span>
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Enter SKU"
            required
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Base Price Override</span>
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            value={basePriceOverride}
            onChange={(e) => setBasePriceOverride(e.target.value)}
            placeholder="e.g. 0.15"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">LEGO Reference Price</span>
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            value={legoReferencePrice}
            onChange={(e) => setLegoReferencePrice(e.target.value)}
            placeholder="e.g. 0.18"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">BrickLink Reference Price</span>
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            value={bricklinkReferencePrice}
            onChange={(e) => setBricklinkReferencePrice(e.target.value)}
            placeholder="e.g. 0.09"
          />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-bold text-slate-600">Notes</span>
        <textarea
          className="min-h-[88px] rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={forceOverride}
            onChange={(e) => setForceOverride(e.target.checked)}
          />
          Force Override
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving..." : getEffectiveCatalog(row) ? "Save Catalog Item" : "Create Catalog Item"}
        </button>
        <button type="button" className={btnBase} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PartColorDetailDrawer({
  row,
  allRows,
  onSelectRow,
  onEditPartColor,
  onUpdated,
}: {
  row: PartColorRow | null;
  allRows: PartColorRow[];
  onSelectRow?: (row: PartColorRow) => void;
  onEditPartColor?: (row: PartColorRow) => void;
  onUpdated?: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  const [inventoryRows, setInventoryRows] = useState<InventoryRecordRow[]>([]);
  const [costRows, setCostRows] = useState<CatalogCostEntry[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showCatalogEditor, setShowCatalogEditor] = useState(false);

  const [editingInventory, setEditingInventory] = useState<InventoryRecordRow | null>(null);
  const [editingCost, setEditingCost] = useState<CatalogCostEntry | null>(null);

  const [savingInventory, setSavingInventory] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);

  const effectiveCatalog = getEffectiveCatalog(row);
  const catalogItemId = effectiveCatalog?.id ?? null;

  useEffect(() => {
    setTab("overview");
    setShowInventoryForm(false);
    setShowCostForm(false);
    setShowCatalogEditor(false);
    setEditingInventory(null);
    setEditingCost(null);
  }, [row?.id]);

  useEffect(() => {
    if (!catalogItemId) {
      setInventoryRows([]);
      setCostRows([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [inventoryRes, costRes, locationsRes] = await Promise.all([
          api.get(`${ENDPOINTS.inventoryRecords}?catalog_item=${catalogItemId}`),
          api.get(`${ENDPOINTS.catalogCostEntries}?catalog_item=${catalogItemId}`),
          api.get(`${ENDPOINTS.inventoryLocations}?is_active=true`),
        ]);

        if (cancelled) return;

        setInventoryRows(getListData<InventoryRecordRow>(inventoryRes.data));
        setCostRows(getListData<CatalogCostEntry>(costRes.data));
        const nextLocations = Array.isArray(locationsRes.data)
          ? locationsRes.data
          : Array.isArray(locationsRes.data?.results)
          ? locationsRes.data.results
          : [];

        console.log("locationsRes.data", locationsRes.data);
        console.log("nextLocations", nextLocations);

        setLocations(nextLocations);
      } catch (e: any) {
        if (!cancelled) setError(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [catalogItemId]);

  const inventorySummary = useMemo(() => {
  let onHand = 0;
  let reserved = 0;
  let available = 0;
  let totalCost = 0;

  const catalog = getEffectiveCatalog(row);
  const sellingPrice = Number(catalog?.current_price ?? catalog?.base_price_override ?? 0);
  const bricklinkFallback = Number(catalog?.bricklink_reference_price ?? 0);

  let estimatedRetailValue = 0;
  let estimatedInvestedCost = 0;

  for (const rec of inventoryRows) {
    const qtyOnHand = Number(rec.quantity_on_hand || 0);
    const qtyReserved = Number(rec.quantity_reserved || 0);
    const qtyAvailable = Number(rec.quantity_available || 0);

    onHand += qtyOnHand;
    reserved += qtyReserved;
    available += qtyAvailable;
    totalCost += Number(rec.total_cost || 0);

    const recordUnitCost =
      rec.unit_cost !== null && rec.unit_cost !== undefined && rec.unit_cost !== ""
        ? Number(rec.unit_cost)
        : bricklinkFallback;

    estimatedInvestedCost += qtyOnHand * (Number.isFinite(recordUnitCost) ? recordUnitCost : 0);
    estimatedRetailValue += qtyAvailable * (Number.isFinite(sellingPrice) ? sellingPrice : 0);
  }

  return {
    onHand,
    reserved,
    available,
    totalCost,
    estimatedRetailValue,
    estimatedInvestedCost,
    estimatedProfitEstimate: estimatedRetailValue - estimatedInvestedCost,
    locations: new Set(inventoryRows.map((x) => x.location?.id)).size,
  };
}, [inventoryRows, row]);

  const siblingRows = useMemo(() => {
    if (!row?.part?.part_id) return [];

    return allRows
      .filter((r) => r.part?.part_id === row.part.part_id)
      .sort((a, b) => {
        const ac = (a.color?.name ?? "").toLowerCase();
        const bc = (b.color?.name ?? "").toLowerCase();
        if (ac !== bc) return ac.localeCompare(bc);

        const av = (a.variant ?? "").toLowerCase();
        const bv = (b.variant ?? "").toLowerCase();
        if (av !== bv) return av.localeCompare(bv);

        return (a.part_color_code ?? "").localeCompare(b.part_color_code ?? "");
      });
  }, [allRows, row?.part?.part_id]);

  const familyStats = useMemo(() => {
    const prices = siblingRows
      .map(getDisplayPrice)
      .filter((v): v is number => v != null);

    const avgPrice =
      prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    return {
      totalVariants: siblingRows.length,
      pricedVariants: prices.length,
      avgPrice,
    };
  }, [siblingRows]);

  async function reloadData() {
    if (!catalogItemId) {
      onUpdated?.();
      return;
    }

    const [inventoryRes, costRes] = await Promise.all([
      api.get(`${ENDPOINTS.inventoryRecords}?catalog_item=${catalogItemId}`),
      api.get(`${ENDPOINTS.catalogCostEntries}?catalog_item=${catalogItemId}`),
    ]);

    setInventoryRows(getListData<InventoryRecordRow>(inventoryRes.data));
    setCostRows(getListData<CatalogCostEntry>(costRes.data));
    onUpdated?.();
  }

  async function handleSaveCatalog(payload: CatalogItemPayload) {
    if (!row) return;

    setSavingCatalog(true);
    setError("");
    try {
      let catalogId = getEffectiveCatalog(row)?.id ?? null;

      if (catalogId) {
        await api.patch(`${ENDPOINTS.catalog}${catalogId}/`, payload);
      } else {
        const created = await api.post(ENDPOINTS.catalog, payload);
        const createdItem = created?.data;
        catalogId = createdItem?.id ?? null;

        if (!catalogId) {
          throw new Error("Catalog item was created, but no catalog item ID was returned.");
        }

        const targetPartColorId = row.root_part_color?.id ?? row.id;
        await api.patch(`${ENDPOINTS.partColors}${targetPartColorId}/`, {
          catalog_item_id: catalogId,
        });
      }

      await onUpdated?.();
      setShowCatalogEditor(false);
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSavingCatalog(false);
    }
  }

  async function handleSaveInventory(payload: InventoryRecordPayload) {
    if (!catalogItemId) return;

    setSavingInventory(true);
    setError("");
    try {
      if (editingInventory) {
        await api.patch(`${ENDPOINTS.inventoryRecords}${editingInventory.id}/`, payload);
      } else {
        await api.post(ENDPOINTS.inventoryRecords, payload);
      }

      setShowInventoryForm(false);
      setEditingInventory(null);
      await reloadData();
      setTab("inventory");
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSavingInventory(false);
    }
  }

  async function handleSaveCost(payload: CatalogCostEntryPayload) {
    if (!catalogItemId) return;

    setSavingCost(true);
    setError("");
    try {
      if (editingCost) {
        await api.patch(`${ENDPOINTS.catalogCostEntries}${editingCost.id}/`, payload);
      } else {
        await api.post(ENDPOINTS.catalogCostEntries, payload);
      }

      setShowCostForm(false);
      setEditingCost(null);
      await reloadData();
      setTab("costs");
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSavingCost(false);
    }
  }

  if (!row) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a part color to view details.
      </div>
    );
  }

  const imageUrl = getDisplayImage(row);
  const catalog = getEffectiveCatalog(row);
  const isInheritedCatalog = !row.catalog_item && !!catalog;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <RowThumb
              src={imageUrl}
              alt={row.part_color_code || row.part?.name || "Part color"}
              className="h-20 w-20 rounded-2xl"
            />

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Selected Variant
              </div>

              <div className="mt-1 text-lg font-black leading-tight text-slate-900">
                {row.part?.name || "Unnamed Part"}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {metaValue(row.part?.part_id)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {metaValue(row.color?.name)}
                </span>
                {row.variant ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    {row.variant}
                  </span>
                ) : null}
                <span
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold",
                    catalog
                      ? "border border-slate-200 bg-white text-slate-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
                  )}
                >
                  {catalog ? `${isInheritedCatalog ? "Inherited " : ""}SKU ${catalog.sku}` : "No SKU linked"}
                </span>
                {row.root_part_color ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                    Variant of {row.root_part_color.part_color_code}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <CompactStat label="Code" value={metaValue(row.part_color_code)} />
                <CompactStat label="Price" value={moneyText(getDisplayPrice(row))} />
                <CompactStat label="Current Cost" value={money(catalog?.current_cost)} />
                <CompactStat label="Margin" value={money(catalog?.margin_amount)} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Part Family
              </div>
              <div className="mt-1 text-base font-black text-slate-900">
                {metaValue(row.part?.part_id)} — {metaValue(row.part?.name)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Same part ID across all colors and variants
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-2">
              <CompactStat label="Variants" value={String(familyStats.totalVariants)} />
              <CompactStat label="Priced" value={String(familyStats.pricedVariants)} />
              <CompactStat label="Avg" value={moneyText(familyStats.avgPrice)} />
            </div>
          </div>

          <div className="mt-3 max-h-[320px] overflow-auto rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 divide-y divide-slate-200">
              {siblingRows.map((sib) => {
                const rarity = getRarityTier(sib, siblingRows);
                const sibCatalog = getEffectiveCatalog(sib);
                const bricklinkRef = sibCatalog?.bricklink_reference_price || "—";
                const selected = sib.id === row.id;

                return (
                <button
                  key={sib.id}
                  type="button"
                  onClick={() => onSelectRow?.(sib)}
                  className={cx(
                    "grid grid-cols-[92px_minmax(0,1fr)_90px_120px] items-center gap-3 px-3 py-2 text-left transition",
                    selected ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="truncate text-xs font-black">
                    {metaValue(sib.part_color_code)}
                  </div>

                  <div className="min-w-0">
                    <div className={cx("truncate text-sm font-bold", selected ? "text-white" : "text-slate-900")}>
                      {metaValue(sib.color?.name)}
                    </div>
                    <div className={cx("truncate text-[11px]", selected ? "text-slate-200" : "text-slate-500")}>
                      {sib.variant ? sib.variant : "—"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={cx("text-xs font-bold", selected ? "text-slate-100" : "text-slate-700")}>
                      {bricklinkRef !== "—" ? `$${bricklinkRef}` : "—"}
                    </div>
                    <div className={cx("text-[10px]", selected ? "text-slate-300" : "text-slate-400")}>
                      BrickLink
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {rarity ? (
                      <span
                        className={cx(
                          "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
                          selected
                            ? "border-white/20 bg-white/10 text-white"
                            : rarity.className
                        )}
                      >
                        {rarity.label}
                      </span>
                    ) : (
                      <span
                        className={cx(
                          "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
                          selected
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-400"
                        )}
                      >
                        No Data
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-900">Selected Details</div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnBase}
                onClick={() => onEditPartColor?.(row)}
              >
                Edit Part
              </button>

              <button
                type="button"
                className={btnBase}
                onClick={() => setShowCatalogEditor((v) => !v)}
              >
                {showCatalogEditor
                  ? "Close Catalog"
                  : catalog
                  ? isInheritedCatalog ? "Edit Root Catalog" : "Edit Catalog"
                  : "Add Catalog"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MiniMeta label="General Category" value={metaValue(row.part?.general_category)} />
            <MiniMeta label="Specific Category" value={metaValue(row.part?.specific_category)} />
            <MiniMeta label="Actual Category" value={metaValue(row.part?.actual_category)} />
            <MiniMeta label="Part Color Code" value={metaValue(row.part_color_code)} />
            <MiniMeta label="Color" value={metaValue(row.color?.name)} />
            <MiniMeta label="Variant" value={metaValue(row.variant)} />
            <MiniMeta label="Root Group" value={row.root_part_color ? metaValue(row.root_part_color.part_color_code) : "Root / standalone"} />
            <MiniMeta label="SKU" value={metaValue(catalog?.sku)} />
            <MiniMeta label="Pricing Source" value={metaValue(catalog?.pricing_source)} />
            <MiniMeta
              label="LEGO Reference"
              value={money(catalog?.lego_reference_price)}
            />
            <MiniMeta
              label="BrickLink Reference"
              value={money(catalog?.bricklink_reference_price)}
            />
          </div>

          {showCatalogEditor ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {catalog ? (isInheritedCatalog ? "Edit Root Catalog Item" : "Edit Catalog Item") : "Create Catalog Item"}
              </div>

              <CatalogEditor
                key={`${row.id}-${catalog?.id ?? "none"}`}
                row={row}
                submitting={savingCatalog}
                onSubmit={handleSaveCatalog}
                onCancel={() => setShowCatalogEditor(false)}
              />
            </div>
          ) : null}

          {!catalog && !showCatalogEditor ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No catalog item linked yet.
            </div>
          ) : null}
          {isInheritedCatalog && !showCatalogEditor ? (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              This variant is using the root PartColor catalog item. Pricing, inventory, and cost history are shared with the group.
            </div>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-black text-slate-900">Operations</div>
            {catalog ? (
              <div className="flex flex-wrap gap-2">
                <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                  Overview
                </TabButton>
                <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
                  Inventory
                </TabButton>
                <TabButton active={tab === "costs"} onClick={() => setTab("costs")}>
                  Costs
                </TabButton>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!catalog ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              Add or link a catalog item to enable inventory and cost history.
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <CompactStat label="On Hand" value={integer(inventorySummary.onHand)} />
                <CompactStat label="Reserved" value={integer(inventorySummary.reserved)} />
                <CompactStat label="Available" value={integer(inventorySummary.available)} />
                <CompactStat label="Recorded Cost" value={money(inventorySummary.totalCost)} />
                <CompactStat label="Estimated Invested" value={money(inventorySummary.estimatedInvestedCost)} />
                <CompactStat label="Retail Value" value={money(inventorySummary.estimatedRetailValue)} />
                <CompactStat label="Est. Profit" value={money(inventorySummary.estimatedProfitEstimate)} />
              </div>

              {loading ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Loading...
                </div>
              ) : null}

              {!loading && tab === "overview" ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Pricing Snapshot
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Current price</span>
                        <span className="font-semibold text-slate-900">
                          {money(catalog.current_price)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Base override</span>
                        <span className="font-semibold text-slate-900">
                          {money(catalog.base_price_override)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">LEGO reference</span>
                        <span className="font-semibold text-slate-900">
                          {money(catalog.lego_reference_price)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">BrickLink reference</span>
                        <span className="font-semibold text-slate-900">
                          {money(catalog.bricklink_reference_price)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Current cost</span>
                        <span className="font-semibold text-slate-900">
                          {money(catalog.current_cost)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Margin</span>
                        <span className="font-semibold text-slate-900">
                          {money(catalog.margin_amount)}
                          {catalog.margin_percent
                            ? ` (${Number(catalog.margin_percent).toFixed(2)}%)`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Quick Actions
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => {
                          setEditingInventory(null);
                          setShowInventoryForm(true);
                          setTab("inventory");
                        }}
                      >
                        Add Inventory
                      </button>

                      <button
                        type="button"
                        className={btnBase}
                        onClick={() => {
                          setEditingCost(null);
                          setShowCostForm(true);
                          setTab("costs");
                        }}
                      >
                        Add Cost Entry
                      </button>
                    </div>

                    {catalog.notes ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        {catalog.notes}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!loading && tab === "inventory" ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-slate-900">Inventory</div>
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => {
                          setEditingInventory(null);
                          setShowInventoryForm((v) => !v);
                        }}
                      >
                        {showInventoryForm ? "Close" : "Add Inventory"}
                      </button>
                    </div>

                    {showInventoryForm ? (
                      <div className="mt-3">
                        <InventoryRecordForm
                          catalogItemId={catalog.id}
                          initialValues={editingInventory}
                          submitting={savingInventory}
                          onSubmit={handleSaveInventory}
                          onCancel={() => {
                            setShowInventoryForm(false);
                            setEditingInventory(null);
                          }}
                          locations={locations}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white">
                    {inventoryRows.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">No inventory records yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {inventoryRows.map((rec) => (
                          <div key={rec.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">
                                  {rec.location?.code} — {rec.location?.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {rec.condition} • {rec.source_type} • {rec.is_sellable ? "sellable" : "not sellable"}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={btnBase}
                                onClick={() => {
                                  setEditingInventory(rec);
                                  setShowInventoryForm(true);
                                }}
                              >
                                Edit
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2">
                              <CompactStat label="On Hand" value={integer(rec.quantity_on_hand)} />
                              <CompactStat label="Reserved" value={integer(rec.quantity_reserved)} />
                              <CompactStat label="Available" value={integer(rec.quantity_available)} />
                              <CompactStat label="Unit Cost" value={money(rec.unit_cost)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {!loading && tab === "costs" ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-slate-900">Cost History</div>
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => {
                          setEditingCost(null);
                          setShowCostForm((v) => !v);
                        }}
                      >
                        {showCostForm ? "Close" : "Add Cost Entry"}
                      </button>
                    </div>

                    {showCostForm ? (
                      <div className="mt-3">
                        <CatalogCostEntryForm
                          catalogItemId={catalog.id}
                          initialValues={editingCost ?? undefined}
                          submitting={savingCost}
                          onSubmit={handleSaveCost}
                          onCancel={() => {
                            setShowCostForm(false);
                            setEditingCost(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white">
                    {costRows.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">No cost entries yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {costRows.map((entry) => (
                          <div key={entry.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">
                                  {entry.purchased_at || "Cost entry"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {entry.notes ? "has notes" : "—"}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={btnBase}
                                onClick={() => {
                                  setEditingCost(entry);
                                  setShowCostForm(true);
                                }}
                              >
                                Edit
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2">
                              <CompactStat label="Qty" value={integer(entry.quantity)} />
                              <CompactStat label="Unit" value={money(entry.unit_cost)} />
                              <CompactStat label="Landed" value={money(entry.landed_unit_cost)} />
                              <CompactStat label="Total" value={money(entry.total_cost)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
