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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      {subvalue ? <div className="mt-1 text-xs text-slate-500">{subvalue}</div> : null}
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
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      )}
    >
      {children}
    </button>
  );
}

export function PartColorDetailDrawer({
  row,
  onUpdated,
}: {
  row: PartColorRow | null;
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

  const imageUrl =
    row.image_url_1 ||
    row.image_url_2 ||
    row.part?.image_url ||
    "";

  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex items-start gap-4">
          <RowThumb
            src={imageUrl}
            alt={row.part_color_code || row.part?.name || "Part color"}
            className="h-24 w-24 rounded-2xl"
          />

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Part Color
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {row.part?.name || "Unnamed Part"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {[row.part?.part_id, row.color?.name, row.variant].filter(Boolean).join(" • ")}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Code: {row.part_color_code || "—"}
            </div>

            {row.catalog_item ? (
              <div className="mt-3 inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                SKU: {row.catalog_item.sku}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No catalog item linked yet. Link or create one before using inventory and cost history.
              </div>
            )}
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
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
              <div className={card}>
                <div className="text-sm font-semibold text-slate-900">Pricing Snapshot</div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current price</span>
                    <span className="font-medium text-slate-900">
                      {money(row.catalog_item.current_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current cost</span>
                    <span className="font-medium text-slate-900">
                      {money(row.catalog_item.current_cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Margin</span>
                    <span className="font-medium text-slate-900">
                      {money(row.catalog_item.margin_amount)}{" "}
                      {row.catalog_item.margin_percent
                        ? `(${Number(row.catalog_item.margin_percent).toFixed(2)}%)`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className={card}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Quick Actions</div>
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
              </div>
            </div>
          ) : null}

          {!loading && tab === "inventory" ? (
            <div className="space-y-4">
              <div className={card}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Inventory by Location</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Track stock rows for this part color's catalog item.
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

              <div className={card}>
                {inventoryRows.length === 0 ? (
                  <div className="text-sm text-slate-500">No inventory records yet.</div>
                ) : (
                  <div className="space-y-3">
                    {inventoryRows.map((rec) => (
                      <div
                        key={rec.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
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
              <div className={card}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Cost History</div>
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
                      initialValues={editingCost}
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

              <div className={card}>
                {costRows.length === 0 ? (
                  <div className="text-sm text-slate-500">No cost entries yet.</div>
                ) : (
                  <div className="space-y-3">
                    {costRows.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {entry.source} {entry.supplier_name ? `— ${entry.supplier_name}` : ""}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Purchased {entry.purchased_at} • Qty {entry.quantity}
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
                          <StatCard label="Unit Cost" value={money(entry.unit_cost)} />
                          <StatCard label="Shipping" value={money(entry.shipping_cost)} />
                          <StatCard label="Tax" value={money(entry.tax_cost)} />
                          <StatCard label="Landed Cost" value={money(entry.landed_unit_cost)} />
                        </div>

                        {(entry.reference || entry.notes) ? (
                          <div className="mt-4 text-sm text-slate-600">
                            {entry.reference ? <div>Reference: {entry.reference}</div> : null}
                            {entry.notes ? <div className="mt-1">{entry.notes}</div> : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}