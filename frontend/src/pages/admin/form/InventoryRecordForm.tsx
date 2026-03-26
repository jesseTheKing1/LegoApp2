import React, { useEffect, useMemo, useState } from "react";
import type {
  InventoryCondition,
  InventoryRecordPayload,
  InventoryRecordRow,
  InventorySourceType,
  LocationRow,
} from "../../../types/inventory";
import { btnBase, btnPrimary, inputBase, cx } from "../utils/ui";

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

const selectBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900";

type Props = {
  catalogItemId?: number;
  locations: LocationRow[];
  initialValues?: InventoryRecordRow | null;
  submitting?: boolean;
  onSubmit: (payload: InventoryRecordPayload) => Promise<void> | void;
  onCancel?: () => void;
};

export function InventoryRecordForm({
  catalogItemId,
  locations,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [locationId, setLocationId] = useState<number | "">("");
  const [condition, setCondition] = useState<InventoryCondition>("loose");
  const [sourceType, setSourceType] = useState<InventorySourceType>("other");
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [quantityReserved, setQuantityReserved] = useState("0");
  const [unitCost, setUnitCost] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSellable, setIsSellable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    if (!initialValues) {
      const firstActive = locations.find((x) => x.is_active);
      setLocationId(firstActive?.id ?? "");
      setCondition("loose");
      setSourceType("other");
      setQuantityOnHand("0");
      setQuantityReserved("0");
      setUnitCost("");
      setAcquiredAt("");
      setNotes("");
      setIsSellable(true);
      setIsActive(true);
      return;
    }

    setLocationId(initialValues.location?.id ?? "");
    setCondition(initialValues.condition ?? "loose");
    setSourceType(initialValues.source_type ?? "other");
    setQuantityOnHand(String(initialValues.quantity_on_hand ?? 0));
    setQuantityReserved(String(initialValues.quantity_reserved ?? 0));
    setUnitCost(initialValues.unit_cost ?? "");
    setAcquiredAt(initialValues.acquired_at ?? "");
    setNotes(initialValues.notes ?? "");
    setIsSellable(Boolean(initialValues.is_sellable));
    setIsActive(Boolean(initialValues.is_active));
  }, [initialValues, locations]);

  const activeLocations = useMemo(
    () => locations.filter((x) => x.is_active),
    [locations]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const qoh = Number(quantityOnHand);
    const qr = Number(quantityReserved);

    if (!locationId) {
      setFormError("Please choose a location.");
      return;
    }

    if (!Number.isFinite(qoh) || qoh < 0) {
      setFormError("Quantity on hand must be 0 or greater.");
      return;
    }

    if (!Number.isFinite(qr) || qr < 0) {
      setFormError("Reserved quantity must be 0 or greater.");
      return;
    }

    if (qr > qoh) {
      setFormError("Reserved quantity cannot be greater than quantity on hand.");
      return;
    }

    const payload: InventoryRecordPayload = {
      location_id: Number(locationId),
      condition,
      source_type: sourceType,
      quantity_on_hand: qoh,
      quantity_reserved: qr,
      unit_cost: unitCost.trim() ? unitCost.trim() : null,
      acquired_at: acquiredAt || null,
      notes,
      is_sellable: isSellable,
      is_active: isActive,
    };

    if (catalogItemId) {
      payload.catalog_item_id = catalogItemId;
    }

    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</div>
          <select
            className={selectBase}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select location</option>
            {activeLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} — {loc.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Condition</div>
          <select
            className={selectBase}
            value={condition}
            onChange={(e) => setCondition(e.target.value as InventoryCondition)}
          >
            {conditionOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</div>
          <select
            className={selectBase}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as InventorySourceType)}
          >
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Acquired date</div>
          <input
            type="date"
            className={inputBase}
            value={acquiredAt}
            onChange={(e) => setAcquiredAt(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Quantity on hand</div>
          <input
            type="number"
            min={0}
            className={inputBase}
            value={quantityOnHand}
            onChange={(e) => setQuantityOnHand(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Quantity reserved</div>
          <input
            type="number"
            min={0}
            className={inputBase}
            value={quantityReserved}
            onChange={(e) => setQuantityReserved(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Unit cost</div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.0000"
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
        <textarea
          className={cx(inputBase, "min-h-[84px]")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this stock row"
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isSellable}
            onChange={(e) => setIsSellable(e.target.checked)}
          />
          Sellable
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      {formError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving..." : initialValues ? "Update inventory" : "Add inventory"}
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