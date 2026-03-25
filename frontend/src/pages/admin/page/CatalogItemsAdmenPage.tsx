import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItem, CatalogItemPayload } from "../../../types/catalog";
import type { CatalogCostEntryPayload } from "../../../types/catalogCostEntry";

import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { DrawerShell } from "../components/DrawerShell";
import { cx, card, btnBase, btnPrimary, inputBase } from "../utils/ui";

import { CatalogItemForm } from "../form/CatalogItemFor";
import { CatalogCostEntryForm } from "../form/CatalogCostEntryForm";

function money(v?: string | null) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `$${n.toFixed(4)}`;
}

function percent(v?: string | null) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

export default function CatalogItemsAdminPage() {
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [costSaving, setCostSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(ENDPOINTS.catalog);
      setRows(getListData<CatalogItem>(res.data));
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (activeOnly && !row.is_active) return false;
      if (!q) return true;

      return (
        row.sku.toLowerCase().includes(q) ||
        (row.notes || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, activeOnly]);

  async function handleCreate(payload: CatalogItemPayload) {
    setSaving(true);
    setError("");
    try {
      await api.post(ENDPOINTS.catalog, payload);
      await load();
      setDrawerOpen(false);
      setSelected(null);
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(payload: CatalogItemPayload) {
    if (!selected) return;

    setSaving(true);
    setError("");
    try {
      await api.patch(`${ENDPOINTS.catalog}${selected.id}/`, payload);
      await load();
      const fresh = rows.find((x) => x.id === selected.id);
      setSelected(fresh ?? null);
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete catalog item "${selected.sku}"?`)) return;

    setSaving(true);
    setError("");
    try {
      await api.delete(`${ENDPOINTS.catalog}${selected.id}/`);
      await load();
      setDrawerOpen(false);
      setSelected(null);
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCost(payload: CatalogCostEntryPayload) {
    setCostSaving(true);
    setError("");
    try {
      await api.post(ENDPOINTS.catalogCostEntries, payload);
      await load();

      if (selected) {
        const res = await api.get(`${ENDPOINTS.catalog}${selected.id}/`);
        setSelected(res.data);
      }
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setCostSaving(false);
    }
  }

  function openCreate() {
    setSelected(null);
    setDrawerOpen(true);
  }

  async function openEdit(item: CatalogItem) {
    setError("");
    try {
      const res = await api.get(`${ENDPOINTS.catalog}${item.id}/`);
      setSelected(res.data);
      setDrawerOpen(true);
    } catch (e: any) {
      setError(formatApiError(e));
    }
  }

  return (
    <div className="space-y-5">
      <div className={cx(card, "p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Catalog
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Catalog Items
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage sell pricing, reference pricing, and real cost history.
            </p>
          </div>

          <div className="flex gap-3">
            <button className={btnBase} onClick={load}>
              Refresh
            </button>
            <button className={btnPrimary} onClick={openCreate}>
              New Catalog Item
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className={inputBase}
            placeholder="Search SKU or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-700">Active only</span>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cx(card, "p-4")}>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Total Items
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">{rows.length}</div>
        </div>

        <div className={cx(card, "p-4")}>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            With Cost Data
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">
            {rows.filter((r) => r.current_cost != null).length}
          </div>
        </div>

        <div className={cx(card, "p-4")}>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            With Sell Price
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">
            {rows.filter((r) => r.current_price != null).length}
          </div>
        </div>

        <div className={cx(card, "p-4")}>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            With Positive Margin
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">
            {rows.filter((r) => Number(r.margin_amount ?? 0) > 0).length}
          </div>
        </div>
      </div>

      <div className={cx(card, "overflow-hidden p-0")}>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading catalog items...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No catalog items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">SKU</th>
                  <th className="px-4 py-3 font-bold">Sell</th>
                  <th className="px-4 py-3 font-bold">Cost</th>
                  <th className="px-4 py-3 font-bold">Margin $</th>
                  <th className="px-4 py-3 font-bold">Margin %</th>
                  <th className="px-4 py-3 font-bold">LEGO</th>
                  <th className="px-4 py-3 font-bold">BrickLink</th>
                  <th className="px-4 py-3 font-bold">Units</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => openEdit(row)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.sku}</td>
                    <td className="px-4 py-3 text-slate-700">{money(row.current_price)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(row.current_cost)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(row.margin_amount)}</td>
                    <td className="px-4 py-3 text-slate-700">{percent(row.margin_percent)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(row.lego_reference_price)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {money(row.bricklink_reference_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.total_units_purchased ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                          row.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DrawerShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected ? selected.sku : "New Catalog Item"}
        width={1100}
      >
        <div className="space-y-6">
          {selected ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={cx(card, "p-4")}>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Current Sell Price
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {money(selected.current_price)}
                </div>
              </div>

              <div className={cx(card, "p-4")}>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Current Cost
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {money(selected.current_cost)}
                </div>
              </div>

              <div className={cx(card, "p-4")}>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Margin
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {money(selected.margin_amount)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {percent(selected.margin_percent)}
                </div>
              </div>

              <div className={cx(card, "p-4")}>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Total Purchased
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {selected.total_units_purchased ?? 0}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {money(selected.total_spent)}
                </div>
              </div>
            </div>
          ) : null}

          <div className={cx(card, "p-5")}>
            <CatalogItemForm
              initialValues={selected ?? undefined}
              submitting={saving}
              onSubmit={selected ? handleUpdate : handleCreate}
              onDelete={selected ? handleDelete : undefined}
            />
          </div>

          {selected ? (
            <>
              <div className={cx(card, "p-5")}>
                <div className="mb-4">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Add Cost Entry
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    Log Purchase Cost
                  </h3>
                </div>

                <CatalogCostEntryForm
                  catalogItems={rows.map((r) => ({
                    id: r.id,
                    sku: r.sku,
                    is_active: r.is_active,
                    base_price_override: r.base_price_override,
                    force_override: r.force_override,
                    notes: r.notes,
                  }))}
                  defaultCatalogItemId={selected.id}
                  submitting={costSaving}
                  onSubmit={handleAddCost}
                />
              </div>

              <div className={cx(card, "p-5")}>
                <div className="mb-4">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Cost History
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    Purchase Entries
                  </h3>
                </div>

                {!selected.cost_entries || selected.cost_entries.length === 0 ? (
                  <div className="text-sm text-slate-500">No cost entries yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-bold">Date</th>
                          <th className="px-3 py-2 font-bold">Source</th>
                          <th className="px-3 py-2 font-bold">Qty</th>
                          <th className="px-3 py-2 font-bold">Unit</th>
                          <th className="px-3 py-2 font-bold">Total</th>
                          <th className="px-3 py-2 font-bold">Landed Unit</th>
                          <th className="px-3 py-2 font-bold">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.cost_entries.map((entry: any) => (
                          <tr key={entry.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">{entry.purchased_at}</td>
                            <td className="px-3 py-2">{entry.source}</td>
                            <td className="px-3 py-2">{entry.quantity}</td>
                            <td className="px-3 py-2">{money(entry.unit_cost)}</td>
                            <td className="px-3 py-2">{money(entry.total_cost)}</td>
                            <td className="px-3 py-2">{money(entry.landed_unit_cost)}</td>
                            <td className="px-3 py-2">{entry.reference || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DrawerShell>
    </div>
  );
}