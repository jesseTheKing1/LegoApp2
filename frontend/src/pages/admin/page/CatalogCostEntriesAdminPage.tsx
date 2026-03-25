import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItem } from "../../../types/catalog";
import type {
  CatalogCostEntry,
  CatalogCostEntryPayload,
} from "../../../types/catalogCostEntry";

import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { DrawerShell } from "../components/DrawerShell";
import { card, btnBase, btnPrimary, inputBase, cx } from "../utils/ui";
import { CatalogCostEntryForm } from "../form/CatalogCostEntryForm";

function money(v?: string | null) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `$${n.toFixed(4)}`;
}

export default function CatalogCostEntriesAdminPage() {
  const [rows, setRows] = useState<CatalogCostEntry[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [costRes, itemRes] = await Promise.all([
        api.get(ENDPOINTS.catalogCostEntries),
        api.get(ENDPOINTS.catalog),
      ]);

      setRows(getListData<CatalogCostEntry>(costRes.data));
      setCatalogItems(getListData<CatalogItem>(itemRes.data));
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(payload: CatalogCostEntryPayload) {
    setSaving(true);
    setError("");
    try {
      await api.post(ENDPOINTS.catalogCostEntries, payload);
      await load();
      setDrawerOpen(false);
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const skuMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const item of catalogItems) m.set(item.id, item.sku);
    return m;
  }, [catalogItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const sku = skuMap.get(row.catalog_item) || "";
      return (
        sku.toLowerCase().includes(q) ||
        row.source.toLowerCase().includes(q) ||
        (row.reference || "").toLowerCase().includes(q) ||
        (row.supplier_name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, skuMap]);

  return (
    <div className="space-y-5">
      <div className={cx(card, "p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Catalog
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Cost Entries
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Log purchases and landed cost for catalog items.
            </p>
          </div>

          <div className="flex gap-3">
            <button className={btnBase} onClick={load}>
              Refresh
            </button>
            <button className={btnPrimary} onClick={() => setDrawerOpen(true)}>
              New Cost Entry
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            className={inputBase}
            placeholder="Search by SKU, source, supplier, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className={cx(card, "overflow-hidden p-0")}>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading cost entries...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No cost entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">SKU</th>
                  <th className="px-4 py-3 font-bold">Source</th>
                  <th className="px-4 py-3 font-bold">Supplier</th>
                  <th className="px-4 py-3 font-bold">Qty</th>
                  <th className="px-4 py-3 font-bold">Unit</th>
                  <th className="px-4 py-3 font-bold">Shipping</th>
                  <th className="px-4 py-3 font-bold">Tax</th>
                  <th className="px-4 py-3 font-bold">Total</th>
                  <th className="px-4 py-3 font-bold">Landed Unit</th>
                  <th className="px-4 py-3 font-bold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.purchased_at}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {skuMap.get(row.catalog_item) || `#${row.catalog_item}`}
                    </td>
                    <td className="px-4 py-3">{row.source}</td>
                    <td className="px-4 py-3">{row.supplier_name || "—"}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{money(row.unit_cost)}</td>
                    <td className="px-4 py-3">{money(row.shipping_cost)}</td>
                    <td className="px-4 py-3">{money(row.tax_cost)}</td>
                    <td className="px-4 py-3">{money(row.total_cost)}</td>
                    <td className="px-4 py-3">{money(row.landed_unit_cost)}</td>
                    <td className="px-4 py-3">{row.reference || "—"}</td>
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
        title="New Cost Entry"
        width={720}
        >
        <div className={cx(card, "p-5")}>
          <CatalogCostEntryForm
            catalogItems={catalogItems.map((item) => ({
              id: item.id,
              sku: item.sku,
              is_active: item.is_active,
              base_price_override: item.base_price_override,
              force_override: item.force_override,
              notes: item.notes,
            }))}
            submitting={saving}
            onSubmit={handleCreate}
          />
        </div>
      </DrawerShell>
    </div>
  );
}