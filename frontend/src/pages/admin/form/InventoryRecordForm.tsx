import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  InventoryLocation,
  InventoryRecord,
  InventoryRecordPayload,
  InventoryCondition,
  InventorySourceType,
} from "../../../types/inventory";

type Props = {
  locations: InventoryLocation[];
  initialValues?: Partial<InventoryRecord> | null;
  catalogItemId?: number;
  submitting?: boolean;
  onSubmit: (payload: InventoryRecordPayload) => Promise<void> | void;
  onCancel?: () => void;
};

const conditionOptions: InventoryCondition[] = [
  "sealed",
  "complete",
  "loose",
  "incomplete",
  "damaged",
];

const sourceOptions: InventorySourceType[] = [
  "lego",
  "bricklink",
  "ebay",
  "thrift",
  "trade",
  "personal",
  "other",
];

function normalize(v: unknown) {
  return String(v ?? "").trim();
}

function buildLocationLabel(loc: InventoryLocation) {
  const parent = [loc.parent_code, loc.parent_name].filter(Boolean).join(" — ");
  return parent
    ? `${loc.code} — ${loc.name} (${parent})`
    : `${loc.code} — ${loc.name}`;
}

export function InventoryRecordForm({
  locations,
  initialValues,
  catalogItemId,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [locationSearch, setLocationSearch] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);

  const [locationId, setLocationId] = useState<number | "">("");
  const [condition, setCondition] = useState<InventoryCondition>("complete");
  const [sourceType, setSourceType] = useState<InventorySourceType>("other");
  const [quantityOnHand, setQuantityOnHand] = useState<number>(0);
  const [quantityReserved, setQuantityReserved] = useState<number>(0);
  const [unitCost, setUnitCost] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSellable, setIsSellable] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextLocationId =
      initialValues?.location?.id ??
      (typeof initialValues?.location === "number" ? initialValues.location : null);

    setLocationId(nextLocationId ?? "");
    setCondition((initialValues?.condition as InventoryCondition) ?? "complete");
    setSourceType((initialValues?.source_type as InventorySourceType) ?? "other");
    setQuantityOnHand(Number(initialValues?.quantity_on_hand ?? 0));
    setQuantityReserved(Number(initialValues?.quantity_reserved ?? 0));
    setUnitCost(initialValues?.unit_cost ? String(initialValues.unit_cost) : "");
    setAcquiredAt(initialValues?.acquired_at ? String(initialValues.acquired_at).slice(0, 10) : "");
    setNotes(normalize(initialValues?.notes));
    setIsSellable(initialValues?.is_sellable ?? true);
    setIsActive(initialValues?.is_active ?? true);
  }, [initialValues]);

  const selectedLocation = useMemo(
    () => locations.find((x) => x.id === locationId) ?? null,
    [locations, locationId]
  );

  useEffect(() => {
    if (selectedLocation) {
      setLocationSearch(buildLocationLabel(selectedLocation));
    } else if (!locationOpen) {
      setLocationSearch("");
    }
  }, [selectedLocation, locationOpen]);

  const filteredLocations = useMemo(() => {
    const qq = locationSearch.trim().toLowerCase();

    const base = [...locations].sort((a, b) => {
      const ac = `${a.code} ${a.name}`.toLowerCase();
      const bc = `${b.code} ${b.name}`.toLowerCase();
      return ac.localeCompare(bc);
    });

    if (!qq) return base;

    return base.filter((loc) =>
      [
        loc.code,
        loc.name,
        loc.location_type,
        loc.parent_code ?? "",
        loc.parent_name ?? "",
        loc.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(qq)
    );
  }, [locations, locationSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!locationId) {
      return;
    }

    const payload: InventoryRecordPayload = {
      catalog_item_id:
        catalogItemId ??
        initialValues?.catalog_item?.id ??
        undefined,
      location_id: Number(locationId),
      condition,
      source_type: sourceType,
      quantity_on_hand: Number(quantityOnHand || 0),
      quantity_reserved: Number(quantityReserved || 0),
      unit_cost: unitCost.trim() ? unitCost.trim() : null,
      acquired_at: acquiredAt.trim() ? acquiredAt.trim() : null,
      notes: notes.trim(),
      is_sellable: isSellable,
      is_active: isActive,
    };

    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2" ref={boxRef}>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Location
          </label>

          <div className="relative">
            <input
              value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                setLocationOpen(true);
              }}
              onFocus={() => setLocationOpen(true)}
              placeholder="Search location code, name, type..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-200/70"
            />

            {locationOpen ? (
              <div className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
                {filteredLocations.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-500">
                    No locations found.
                  </div>
                ) : (
                  filteredLocations.map((loc) => {
                    const active = loc.id === locationId;

                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setLocationId(loc.id);
                          setLocationSearch(buildLocationLabel(loc));
                          setLocationOpen(false);
                        }}
                        className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className={`truncate text-sm font-black ${active ? "text-white" : "text-slate-900"}`}>
                              {loc.code} — {loc.name}
                            </div>
                            <div className={`mt-1 text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                              {loc.location_type}
                              {loc.parent_code || loc.parent_name
                                ? ` • parent: ${loc.parent_code ?? ""} ${loc.parent_name ?? ""}`.trim()
                                : ""}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          {!locationId ? (
            <div className="mt-1.5 text-xs text-rose-600">
              Select a location before saving.
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as InventoryCondition)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
          >
            {conditionOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Source
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as InventorySourceType)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
          >
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Quantity On Hand
          </label>
          <input
            type="number"
            min={0}
            value={quantityOnHand}
            onChange={(e) => setQuantityOnHand(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Quantity Reserved
          </label>
          <input
            type="number"
            min={0}
            value={quantityReserved}
            onChange={(e) => setQuantityReserved(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Unit Cost
          </label>
          <input
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="e.g. 1.2500"
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Acquired At
          </label>
          <input
            type="date"
            value={acquiredAt}
            onChange={(e) => setAcquiredAt(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500"
            placeholder="Optional notes..."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isSellable}
            onChange={(e) => setIsSellable(e.target.checked)}
          />
          Sellable
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !locationId}
          className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Inventory"}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}