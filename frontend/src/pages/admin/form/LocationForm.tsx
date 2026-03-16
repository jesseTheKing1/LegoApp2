import React, { useState } from "react";
import type { InventoryLocation, InventoryLocationPayload } from "../../../types/inventory";

const inputBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-slate-200/70";
const selectBase = inputBase;
const labelText = "text-[11px] font-black uppercase tracking-[0.14em] text-slate-500";

const LOCATION_TYPES: InventoryLocationPayload["location_type"][] = [
  "warehouse",
  "room",
  "shelf",
  "bin",
  "drawer",
  "tote",
  "other",
];

export function LocationForm({
  initialValues,
  allLocations,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<InventoryLocation>;
  allLocations: InventoryLocation[];
  submitting?: boolean;
  onSubmit: (payload: InventoryLocationPayload) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [locationType, setLocationType] = useState<InventoryLocationPayload["location_type"]>(
    (initialValues?.location_type as InventoryLocationPayload["location_type"]) ?? "other"
  );
  const [parentId, setParentId] = useState<number | "">(
    (initialValues?.parent as number | undefined) ?? ""
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);

  const canSave = !!name.trim() && !!code.trim() && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      name: name.trim(),
      code: code.trim(),
      location_type: locationType,
      parent: parentId === "" ? null : Number(parentId),
      notes: notes.trim(),
      is_active: isActive,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <div className={labelText}>Name</div>
            <input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Code</div>
            <input className={inputBase} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Type</div>
            <select
              className={selectBase}
              value={locationType}
              onChange={(e) =>
                setLocationType(e.target.value as InventoryLocationPayload["location_type"])
              }
            >
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Parent</div>
            <select
              className={selectBase}
              value={parentId}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">None</option>
              {allLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <div className={labelText}>Notes</div>
            <textarea
              className={`${inputBase} min-h-[96px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 md:col-span-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active location
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSave}
        className="w-full rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 md:w-auto"
      >
        {submitting ? "Saving…" : "Save location"}
      </button>
    </form>
  );
}