import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
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

function getRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results?: unknown[] }).results)
  ) {
    return (data as { results: T[] }).results;
  }

  return [];
}

export default function InventoryRecordsPage() {
  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InventoryRecord | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
  setLoading(true);
  setErr(null);

  try {
    const [recordsRes, locationsRes] = await Promise.all([
      api.get(ENDPOINTS.inventoryRecords),
      api.get(`${ENDPOINTS.inventoryLocations}?is_active=true`),
    ]);

    const recordRows =
      typeof getListData === "function"
        ? getListData<InventoryRecord>(recordsRes.data)
        : getRows<InventoryRecord>(recordsRes.data);

    const locationRows = getRows<InventoryLocation>(locationsRes.data);

    console.log("locationsRes.data", locationsRes.data);
    console.log("locationRows", locationRows);

    setItems(recordRows);
    setLocations(locationRows);
  } catch (e: any) {
    console.error("Failed loading inventory page data:", e);
    setItems([]);
    setLocations([]);
    setErr(formatApiError(e));
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((x) =>
      [
        x.catalog_item?.sku ?? "",
        x.location?.code ?? "",
        x.location?.name ?? "",
        x.condition ?? "",
        x.source_type ?? "",
        x.notes ?? "",
      ]
        .join(" ")
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
    } catch (e: any) {
      console.error("Failed creating inventory record:", e);
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
    } catch (e: any) {
      console.error("Failed updating inventory record:", e);
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
          <div className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading inventory records..."
              : `${items.length} record${items.length === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-slate-200/70 md:max-w-md"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by SKU, location, condition..."
            />

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white md:ml-auto"
            >
              + New record
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading inventory records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No inventory records found.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    setDetailOpen(true);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-950">
                        {row.catalog_item?.sku || "No SKU"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.location?.code || "—"} — {row.location?.name || "No location"} •{" "}
                        {row.condition} • {row.source_type}
                      </div>
                      {row.notes ? (
                        <div className="mt-2 line-clamp-2 text-xs text-slate-500">
                          {row.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center lg:w-[360px]">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                          On Hand
                        </div>
                        <div className="text-sm font-black text-slate-950">
                          {row.quantity_on_hand}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                          Reserved
                        </div>
                        <div className="text-sm font-black text-slate-950">
                          {row.quantity_reserved}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                          Available
                        </div>
                        <div className="text-sm font-black text-slate-950">
                          {row.quantity_available}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <DrawerShell
        open={createOpen}
        title="New Inventory Record"
        onClose={() => setCreateOpen(false)}
        width={1200}
      >
        <InventoryRecordForm
          locations={locations}
          submitting={saving}
          onSubmit={create}
          onCancel={() => setCreateOpen(false)}
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
            locations={locations}
            initialValues={selected}
            submitting={saving}
            onSubmit={update}
            onCancel={() => {
              setDetailOpen(false);
              setSelected(null);
            }}
          />
        ) : null}
      </DrawerShell>
    </div>
  );
}