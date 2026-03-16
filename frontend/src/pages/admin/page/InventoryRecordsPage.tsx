import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { CatalogItemMini } from "../../../types/catalog";
import type {
  InventoryLocation,
  InventoryRecord,
  InventoryRecordPayload,
} from "../../../types/inventory";
import { DrawerShell } from "../components/DrawerShell";
import { InventoryRecordForm } from "../form/InventoryRecordForm";
import { formatApiError } from "../utils/errors";
import { getListData } from "../utils/list";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

export default function InventoryRecordsPage() {
  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InventoryRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const [recordsRes, locationsRes] = await Promise.all([
      api.get(ENDPOINTS.inventoryRecords),
      api.get(ENDPOINTS.inventoryLocations),
    ]);

    setItems(getListData<InventoryRecord>(recordsRes.data));
    setLocations(getListData<InventoryLocation>(locationsRes.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((x) =>
      `${x.catalog_item?.sku ?? ""} ${x.location?.code ?? ""} ${x.condition} ${x.source_type}`
        .toLowerCase()
        .includes(qq)
    );
  }, [items, q]);

  async function create(payload: InventoryRecordPayload) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.inventoryRecords, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function update(payload: InventoryRecordPayload) {
    if (!selected) return;
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`${ENDPOINTS.inventoryRecords}${selected.id}/`, payload);
      setDetailOpen(false);
      setSelected(null);
      await loadAll();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className={shellCard}>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-black text-slate-950">Inventory Records</div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-slate-200/70 md:max-w-md"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by SKU, location, condition..."
            />
            <div className="flex gap-2 md:ml-auto">
              <button
                onClick={() => setCreateOpen(true)}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                + New record
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((row) => (
              <button
                key={row.id}
                onClick={() => {
                  setSelected(row);
                  setDetailOpen(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:bg-slate-100"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-950">
                      {row.catalog_item?.sku}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.location?.code} • {row.condition} • {row.source_type}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center lg:w-[360px]">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">On Hand</div>
                      <div className="text-sm font-black text-slate-950">{row.quantity_on_hand}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Reserved</div>
                      <div className="text-sm font-black text-slate-950">{row.quantity_reserved}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Available</div>
                      <div className="text-sm font-black text-slate-950">{row.quantity_available}</div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DrawerShell open={createOpen} title="New Inventory Record" onClose={() => setCreateOpen(false)} width={1200}>
        <InventoryRecordForm
          locations={locations}
          submitting={saving}
          onSubmit={create}
        />
      </DrawerShell>

      <DrawerShell
        open={detailOpen}
        title={selected ? `Inventory #${selected.id}` : "Inventory Record"}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        width={1200}
      >
        {selected ? (
          <InventoryRecordForm
            initialValues={selected}
            locations={locations}
            submitting={saving}
            onSubmit={update}
          />
        ) : null}
      </DrawerShell>
    </div>
  );
}