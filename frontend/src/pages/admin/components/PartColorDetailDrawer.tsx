import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { PartColorRow } from "../../../types/partColor";
import type { CatalogCostEntry, CatalogCostEntryPayload } from "../../../types/catalogCostEntry";
import type { InventoryRecordPayload, InventoryRecordRow, LocationRow } from "../../../types/inventory";
import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { btnBase, btnPrimary, card, cx } from "../utils/ui";
import { RowThumb } from "./Thumbs";
import { InventoryRecordForm } from "../form/InventoryRecordForm";
import { integer, money } from "../utils/number";
import CatalogCostEntryForm from "../form/CatalogCostEntryForm";

type TabKey = "overview" | "inventory" | "costs";

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
  if (!row?.catalog_item) return null;
  return (
    asMoneyNumber(row.catalog_item.current_price) ??
    asMoneyNumber(row.catalog_item.base_price_override) ??
    null
  );
}

function getDisplayImage(row: PartColorRow | null) {
  if (!row) return "";
  return row.image_url_1 || row.image_url_2 || row.part?.image_url || "";
}

function StatCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-black tracking-tight text-slate-900">{value}</div>
      {subvalue ? <div className="mt-1 text-xs text-slate-500">{subvalue}</div> : null}
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
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
        "rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      )}
    >
      {children}
    </button>
  );
}

export function PartColorDetailDrawer({
  row,
  allRows,
  onSelectRow,
  onUpdated,
}: {
  row: PartColorRow | null;
  allRows: PartColorRow[];
  onSelectRow?: (row: PartColorRow) => void;
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

  const [editingInventory, setEditingInventory] = useState<InventoryRecordRow | null>(null);
  const [editingCost, setEditingCost] = useState<CatalogCostEntry | null>(null);

  const [savingInventory, setSavingInventory] = useState(false);
  const [savingCost, setSavingCost] = useState(false);

  const catalogItemId = row?.catalog_item?.id ?? null;

  useEffect(() => {
    setTab("overview");
    setShowInventoryForm(false);
    setShowCostForm(false);
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
        setLocations(getListData<LocationRow>(locationsRes.data));
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

    for (const rec of inventoryRows) {
      onHand += Number(rec.quantity_on_hand || 0);
      reserved += Number(rec.quantity_reserved || 0);
      available += Number(rec.quantity_available || 0);
      totalCost += Number(rec.total_cost || 0);
    }

    return {
      onHand,
      reserved,
      available,
      totalCost,
      locations: new Set(inventoryRows.map((x) => x.location?.id)).size,
    };
  }, [inventoryRows]);

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
    if (!catalogItemId) return;

    const [inventoryRes, costRes] = await Promise.all([
      api.get(`${ENDPOINTS.inventoryRecords}?catalog_item=${catalogItemId}`),
      api.get(`${ENDPOINTS.catalogCostEntries}?catalog_item=${catalogItemId}`),
    ]);

    setInventoryRows(getListData<InventoryRecordRow>(inventoryRes.data));
    setCostRows(getListData<CatalogCostEntry>(costRes.data));
    onUpdated?.();
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

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="flex items-start gap-4">
            <RowThumb
              src={imageUrl}
              alt={row.part_color_code || row.part?.name || "Part color"}
              className="h-28 w-28 rounded-[22px]"
            />

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Selected Variant
              </div>

              <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {row.part?.name || "Unnamed Part"}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {row.part?.part_id || "—"}
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {row.color?.name || "—"}
                </div>
                {row.variant ? (
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {row.variant}
                  </div>
                ) : null}
                {row.catalog_item?.sku ? (
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    SKU {row.catalog_item.sku}
                  </div>
                ) : (
                  <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    No SKU linked
                  </div>
                )}
              </div>

              <div className="mt-3 text-sm text-slate-600">
                Code: <span className="font-semibold text-slate-900">{row.part_color_code || "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              This Variant
            </div>

            <div className="mt-4 grid gap-4">
              <MetaItem label="Current Price" value={moneyText(getDisplayPrice(row))} />
              <MetaItem label="Current Cost" value={money(row.catalog_item?.current_cost)} />
              <MetaItem
                label="Margin"
                value={
                  row.catalog_item?.margin_percent
                    ? `${money(row.catalog_item?.margin_amount)} (${Number(row.catalog_item.margin_percent).toFixed(2)}%)`
                    : money(row.catalog_item?.margin_amount)
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className={cx(card, "rounded-[28px]")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Part Family
              </div>
              <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
                {row.part?.part_id} — {row.part?.name}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                All colors and variants with this same part ID
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
                {familyStats.totalVariants} variants
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
                {familyStats.pricedVariants} priced
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
                Avg {moneyText(familyStats.avgPrice)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {siblingRows.map((sib) => {
              const selected = sib.id === row.id;
              const sibImg = getDisplayImage(sib);

              return (
                <button
                  key={sib.id}
                  type="button"
                  onClick={() => onSelectRow?.(sib)}
                  className={cx(
                    "flex items-center gap-3 rounded-[22px] border p-3 text-left transition",
                    selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <RowThumb
                    src={sibImg}
                    alt={sib.part_color_code || sib.part?.name || "Part color"}
                    className="h-14 w-14 rounded-xl"
                  />

                  <div className="min-w-0 flex-1">
                    <div
                      className={cx(
                        "truncate text-sm font-bold",
                        selected ? "text-white" : "text-slate-900"
                      )}
                    >
                      {sib.color?.name || "—"}
                    </div>

                    <div
                      className={cx(
                        "truncate text-xs",
                        selected ? "text-slate-200" : "text-slate-500"
                      )}
                    >
                      {[sib.variant || null, sib.part_color_code || null].filter(Boolean).join(" • ")}
                    </div>

                    <div
                      className={cx(
                        "mt-1 text-xs font-semibold",
                        selected ? "text-slate-100" : "text-slate-700"
                      )}
                    >
                      {moneyText(getDisplayPrice(sib))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cx(card, "rounded-[28px]")}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Selected Details
          </div>

          <div className="mt-4 grid gap-4">
            <MetaItem label="General Category" value={row.part?.general_category || "—"} />
            <MetaItem label="Specific Category" value={row.part?.specific_category || "—"} />
            <MetaItem label="Actual Category" value={row.part?.actual_category || "—"} />
            <MetaItem label="Part Color Code" value={row.part_color_code || "—"} />
            <MetaItem label="Color" value={row.color?.name || "—"} />
            <MetaItem label="Variant" value={row.variant || "—"} />
            <MetaItem label="SKU" value={row.catalog_item?.sku || "—"} />
          </div>
        </div>
      </div>

      {row.catalog_item ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="On Hand" value={integer(inventorySummary.onHand)} />
            <StatCard label="Reserved" value={integer(inventorySummary.reserved)} />
            <StatCard label="Available" value={integer(inventorySummary.available)} />
            <StatCard
              label="Stock Cost"
              value={money(inventorySummary.totalCost)}
              subvalue={`${inventorySummary.locations} locations`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
              Inventory
            </TabButton>
            <TabButton active={tab === "costs"} onClick={() => setTab("costs")}>
              Cost History
            </TabButton>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading inventory and cost history...
            </div>
          ) : null}

          {!loading && tab === "overview" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={cx(card, "rounded-[28px]")}>
                <div className="text-sm font-bold text-slate-900">Pricing Snapshot</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Current price</span>
                    <span className="font-semibold text-slate-900">
                      {money(row.catalog_item.current_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Current cost</span>
                    <span className="font-semibold text-slate-900">
                      {money(row.catalog_item.current_cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Margin</span>
                    <span className="font-semibold text-slate-900">
                      {money(row.catalog_item.margin_amount)}{" "}
                      {row.catalog_item.margin_percent
                        ? `(${Number(row.catalog_item.margin_percent).toFixed(2)}%)`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">LEGO reference</span>
                    <span className="font-semibold text-slate-900">
                      {money(row.catalog_item.lego_reference_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">BrickLink reference</span>
                    <span className="font-semibold text-slate-900">
                      {money(row.catalog_item.bricklink_reference_price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={cx(card, "rounded-[28px]")}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-900">Quick Actions</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setEditingInventory(null);
                      setShowInventoryForm(true);
                      setTab("inventory");
                    }}
                  >
                    Add inventory
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
                    Add cost entry
                  </button>
                </div>

                {row.catalog_item.notes ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    {row.catalog_item.notes}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && tab === "inventory" ? (
            <div className="space-y-4">
              <div className={cx(card, "rounded-[28px]")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Inventory by Location</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Track stock rows for this part color&apos;s catalog item.
                    </div>
                  </div>

                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setEditingInventory(null);
                      setShowInventoryForm((v) => !v);
                    }}
                  >
                    {showInventoryForm ? "Close form" : "Add inventory"}
                  </button>
                </div>

                {showInventoryForm ? (
                  <div className="mt-4">
                    <InventoryRecordForm
                      catalogItemId={row.catalog_item.id}
                      locations={locations}
                      initialValues={editingInventory}
                      submitting={savingInventory}
                      onSubmit={handleSaveInventory}
                      onCancel={() => {
                        setShowInventoryForm(false);
                        setEditingInventory(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className={cx(card, "rounded-[28px]")}>
                {inventoryRows.length === 0 ? (
                  <div className="text-sm text-slate-500">No inventory records yet.</div>
                ) : (
                  <div className="space-y-3">
                    {inventoryRows.map((rec) => (
                      <div
                        key={rec.id}
                        className="rounded-[24px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
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

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <StatCard label="On Hand" value={integer(rec.quantity_on_hand)} />
                          <StatCard label="Reserved" value={integer(rec.quantity_reserved)} />
                          <StatCard label="Available" value={integer(rec.quantity_available)} />
                          <StatCard label="Unit Cost" value={money(rec.unit_cost)} />
                        </div>

                        {(rec.acquired_at || rec.notes) ? (
                          <div className="mt-4 text-sm text-slate-600">
                            {rec.acquired_at ? <div>Acquired: {rec.acquired_at}</div> : null}
                            {rec.notes ? <div className="mt-1">{rec.notes}</div> : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {!loading && tab === "costs" ? (
            <div className="space-y-4">
              <div className={cx(card, "rounded-[28px]")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Cost History</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Record new lot purchases and landed costs for this item.
                    </div>
                  </div>

                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setEditingCost(null);
                      setShowCostForm((v) => !v);
                    }}
                  >
                    {showCostForm ? "Close form" : "Add cost entry"}
                  </button>
                </div>

                {showCostForm ? (
                  <div className="mt-4">
                    <CatalogCostEntryForm
                      catalogItemId={row.catalog_item.id}
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

              <div className={cx(card, "rounded-[28px]")}>
                {costRows.length === 0 ? (
                  <div className="text-sm text-slate-500">No cost entries yet.</div>
                ) : (
                  <div className="space-y-3">
                    {costRows.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[24px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {entry.vendor_name || entry.reference_number || "Cost entry"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {[
                                entry.purchased_at || null,
                                entry.currency || null,
                                entry.source_type || null,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
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

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <StatCard label="Qty" value={integer(entry.quantity)} />
                          <StatCard label="Unit Cost" value={money(entry.unit_cost)} />
                          <StatCard label="Landed Cost" value={money(entry.landed_unit_cost)} />
                          <StatCard label="Total" value={money(entry.total_cost)} />
                        </div>

                        {entry.notes ? (
                          <div className="mt-4 text-sm text-slate-600">{entry.notes}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          No catalog item linked yet. Link or create one before using inventory and cost history.
        </div>
      )}
    </div>
  );
}