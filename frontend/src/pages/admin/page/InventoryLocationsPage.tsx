import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { InventoryLocation, InventoryLocationPayload } from "../../../types/inventory";
import { DrawerShell } from "../components/DrawerShell";
import { LocationForm } from "../form/LocationForm";
import { formatApiError } from "../utils/errors";
import { getListData } from "../utils/list";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

export default function InventoryLocationsPage() {
  const [items, setItems] = useState<InventoryLocation[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InventoryLocation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const res = await api.get(ENDPOINTS.inventoryLocations);
    setItems(getListData<InventoryLocation>(res.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((x) =>
      `${x.name} ${x.code} ${x.location_type}`.toLowerCase().includes(qq)
    );
  }, [items, q]);

  async function create(payload: InventoryLocationPayload) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.inventoryLocations, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function update(payload: InventoryLocationPayload) {
    if (!selected) return;
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`${ENDPOINTS.inventoryLocations}${selected.id}/`, payload);
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
          <div className="text-lg font-black text-slate-950">Locations</div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-slate-200/70 md:max-w-md"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search locations..."
            />
            <div className="flex gap-2 md:ml-auto">
              <button
                onClick={() => setCreateOpen(true)}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                + New location
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                onClick={() => {
                  setSelected(loc);
                  setDetailOpen(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:bg-slate-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{loc.name}</div>
                    <div className="text-xs text-slate-500">
                      {loc.code} • {loc.location_type}
                      {loc.parent_name ? ` • Parent: ${loc.parent_name}` : ""}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {loc.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DrawerShell open={createOpen} title="New Location" onClose={() => setCreateOpen(false)} width={1100}>
        <LocationForm allLocations={items} submitting={saving} onSubmit={create} />
      </DrawerShell>

      <DrawerShell
        open={detailOpen}
        title={selected ? `${selected.code} — ${selected.name}` : "Location"}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        width={1100}
      >
        {selected ? (
          <LocationForm
            initialValues={selected}
            allLocations={items.filter((x) => x.id !== selected.id)}
            submitting={saving}
            onSubmit={update}
          />
        ) : null}
      </DrawerShell>
    </div>
  );
}