import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItem, CatalogItemPayload } from "../../../types/catalog";
import type { CatalogCostEntry, CatalogCostEntryPayload } from "../../../types/catalogCostEntry";

import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { DrawerShell } from "../components/DrawerShell";
import { cx, card, btnPrimary, btnBase, inputBase } from "../utils/ui";
import CatalogCostEntryForm from "./CatalogCostEntriesAdminPage";

function money(v?: string | number | null) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(4)}`;
}

function pct(v?: string | number | null) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function boolPill(active: boolean, yes = "Active", no = "Inactive") {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      )}
    >
      {active ? yes : no}
    </span>
  );
}

function numberInput(v?: string | null) {
  return v ?? "";
}

function CatalogItemForm({
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: {
  initialValues?: CatalogItem | null;
  submitting?: boolean;
  onSubmit: (payload: CatalogItemPayload) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [sku, setSku] = useState(initialValues?.sku ?? "");
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [basePriceOverride, setBasePriceOverride] = useState(
    numberInput(initialValues?.base_price_override)
  );
  const [forceOverride, setForceOverride] = useState(initialValues?.force_override ?? false);
  const [legoReferencePrice, setLegoReferencePrice] = useState(
    numberInput(initialValues?.lego_reference_price)
  );
  const [bricklinkReferencePrice, setBricklinkReferencePrice] = useState(
    numberInput(initialValues?.bricklink_reference_price)
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setSku(initialValues?.sku ?? "");
    setIsActive(initialValues?.is_active ?? true);
    setBasePriceOverride(numberInput(initialValues?.base_price_override));
    setForceOverride(initialValues?.force_override ?? false);
    setLegoReferencePrice(numberInput(initialValues?.lego_reference_price));
    setBricklinkReferencePrice(numberInput(initialValues?.bricklink_reference_price));
    setNotes(initialValues?.notes ?? "");
    setFormError("");
  }, [initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const cleanSku = sku.trim();
    if (!cleanSku) {
      setFormError("SKU is required.");
      return;
    }

    await onSubmit({
      sku: cleanSku,
      is_active: isActive,
      base_price_override: basePriceOverride.trim() ? basePriceOverride.trim() : null,
      force_override: forceOverride,
      lego_reference_price: legoReferencePrice.trim() ? legoReferencePrice.trim() : null,
      bricklink_reference_price: bricklinkReferencePrice.trim()
        ? bricklinkReferencePrice.trim()
        : null,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">SKU</div>
          <input
            className={inputBase}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="ex: 3001-black-plain"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Base price override
          </div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={basePriceOverride}
            onChange={(e) => setBasePriceOverride(e.target.value)}
            placeholder="0.0000"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            LEGO reference price
          </div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={legoReferencePrice}
            onChange={(e) => setLegoReferencePrice(e.target.value)}
            placeholder="0.0000"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            BrickLink reference price
          </div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={bricklinkReferencePrice}
            onChange={(e) => setBricklinkReferencePrice(e.target.value)}
            placeholder="0.0000"
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
        <textarea
          className={cx(inputBase, "min-h-[90px]")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={forceOverride}
            onChange={(e) => setForceOverride(e.target.checked)}
          />
          Force override
        </label>
      </div>

      {formError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving..." : initialValues ? "Update catalog item" : "Create catalog item"}
        </button>
        {onCancel ? (
          <button type="button" className={btnBase} onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function CatalogItemsAdmenPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [costEntries, setCostEntries] = useState<CatalogCostEntry[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);

  const [editingCost, setEditingCost] = useState<CatalogCostEntry | null>(null);

  const [saving, setSaving] = useState(false);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadItems() {
    const res = await api.get(ENDPOINTS.catalog);
    setItems(getListData<CatalogItem>(res.data));
  }

  async function loadCosts(catalogItemId: number) {
    setLoadingCosts(true);
    try {
      const res = await api.get(`${ENDPOINTS.catalogCostEntries}?catalog_item=${catalogItemId}`);
      setCostEntries(getListData<CatalogCostEntry>(res.data));
    } finally {
      setLoadingCosts(false);
    }
  }

  useEffect(() => {
    loadItems().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const blob = [
        item.sku,
        item.notes,
        item.current_price,
        item.current_cost,
        item.pricing_source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [items, query]);

  async function createItem(payload: CatalogItemPayload) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.catalog, payload);
      setCreateOpen(false);
      await loadItems();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(payload: CatalogItemPayload) {
    if (!selected) return;

    setSaving(true);
    setErr(null);
    try {
      const res = await api.patch(`${ENDPOINTS.catalog}${selected.id}/`, payload);
      const next = res.data as CatalogItem;
      setSelected(next);
      setItems((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveCost(payload: CatalogCostEntryPayload) {
    setSaving(true);
    setErr(null);

    try {
      if (editingCost) {
        await api.patch(`${ENDPOINTS.catalogCostEntries}${editingCost.id}/`, payload);
      } else {
        await api.post(ENDPOINTS.catalogCostEntries, payload);
      }

      if (selected?.id) {
        await Promise.all([loadItems(), loadCosts(selected.id)]);
      }

      setEditingCost(null);
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function openCosts(item: CatalogItem) {
    setSelected(item);
    setCostOpen(true);
    setEditingCost(null);
    setErr(null);
    await loadCosts(item.id);
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          className={cx(inputBase, "sm:max-w-md")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU, notes, pricing source..."
          autoComplete="off"
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
            + New Catalog Item
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-500 sm:ml-auto">
          {filtered.length} items
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className={card}>
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No catalog items found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-extrabold text-slate-900">{item.sku}</div>
                    {boolPill(item.is_active)}
                    {item.force_override ? boolPill(true, "Forced", "Not forced") : null}
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                    <div>Current Price: <span className="font-bold text-slate-800">{money(item.current_price)}</span></div>
                    <div>Current Cost: <span className="font-bold text-slate-800">{money(item.current_cost)}</span></div>
                    <div>Margin: <span className="font-bold text-slate-800">{money(item.margin_amount)}</span></div>
                    <div>Margin %: <span className="font-bold text-slate-800">{pct(item.margin_percent)}</span></div>
                    <div>LEGO Ref: <span className="font-bold text-slate-800">{money(item.lego_reference_price)}</span></div>
                    <div>BrickLink Ref: <span className="font-bold text-slate-800">{money(item.bricklink_reference_price)}</span></div>
                    <div>Total Purchased: <span className="font-bold text-slate-800">{item.total_units_purchased ?? 0}</span></div>
                    <div>Total Spent: <span className="font-bold text-slate-800">{money(item.total_spent)}</span></div>
                  </div>

                  {item.notes ? (
                    <div className="mt-2 line-clamp-2 text-xs text-slate-500">{item.notes}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnBase}
                    onClick={() => {
                      setSelected(item);
                      setEditOpen(true);
                      setErr(null);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={btnBase}
                    onClick={() => openCosts(item)}
                  >
                    Cost History
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DrawerShell
        open={createOpen}
        title="New Catalog Item"
        onClose={() => setCreateOpen(false)}
        width={860}
      >
        <CatalogItemForm
          submitting={saving}
          onSubmit={createItem}
          onCancel={() => setCreateOpen(false)}
        />
      </DrawerShell>

      <DrawerShell
        open={editOpen}
        title={selected ? `Edit ${selected.sku}` : "Edit Catalog Item"}
        onClose={() => setEditOpen(false)}
        width={860}
      >
        <CatalogItemForm
          initialValues={selected}
          submitting={saving}
          onSubmit={updateItem}
          onCancel={() => setEditOpen(false)}
        />
      </DrawerShell>

      <DrawerShell
        open={costOpen}
        title={selected ? `Cost History — ${selected.sku}` : "Cost History"}
        onClose={() => {
          setCostOpen(false);
          setEditingCost(null);
          setCostEntries([]);
        }}
        width={1080}
      >
        <div className="space-y-4">
          {selected ? (
            <CatalogCostEntryForm
              catalogItemId={selected.id}
              initialValues={editingCost}
              submitting={saving}
              onSubmit={saveCost}
              onCancel={() => setEditingCost(null)}
            />
          ) : null}

          <div className={card}>
            <div className="mb-3 text-sm font-semibold text-slate-900">Existing Cost Entries</div>

            {loadingCosts ? (
              <div className="text-sm text-slate-500">Loading cost entries...</div>
            ) : costEntries.length === 0 ? (
              <div className="text-sm text-slate-500">No cost entries yet.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {costEntries.map((entry) => (
                  <div key={entry.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-bold text-slate-900">
                          {entry.source}
                          {entry.supplier_name ? ` — ${entry.supplier_name}` : ""}
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.purchased_at} • qty {entry.quantity}
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
                        <div>Unit: <span className="font-bold text-slate-800">{money(entry.unit_cost)}</span></div>
                        <div>Shipping: <span className="font-bold text-slate-800">{money(entry.shipping_cost)}</span></div>
                        <div>Tax: <span className="font-bold text-slate-800">{money(entry.tax_cost)}</span></div>
                        <div>Total: <span className="font-bold text-slate-800">{money(entry.total_cost)}</span></div>
                        <div>Landed: <span className="font-bold text-slate-800">{money(entry.landed_unit_cost)}</span></div>
                      </div>

                      {entry.reference || entry.notes ? (
                        <div className="mt-2 text-xs text-slate-500">
                          {entry.reference ? `Ref: ${entry.reference}` : ""}
                          {entry.reference && entry.notes ? " • " : ""}
                          {entry.notes ? entry.notes : ""}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <button
                        type="button"
                        className={btnBase}
                        onClick={() => setEditingCost(entry)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerShell>
    </div>
  );
}