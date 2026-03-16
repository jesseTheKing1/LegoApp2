import React, { useMemo, useState } from "react";
import type {
  InventoryLocation,
  InventoryRecord,
  InventoryRecordPayload,
} from "../../../types/inventory";
import type { CatalogLookupItem } from "../../../types/catalogLookup";
import { CatalogItemPicker } from "src/components/CatalogItemPicker";

const inputBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-slate-200/70";
const selectBase = inputBase;
const labelText = "text-[11px] font-black uppercase tracking-[0.14em] text-slate-500";

const CONDITIONS: InventoryRecordPayload["condition"][] = [
  "sealed",
  "complete",
  "loose",
  "incomplete",
  "damaged",
];

const SOURCES: InventoryRecordPayload["source_type"][] = [
  "lego",
  "bricklink",
  "ebay",
  "thrift",
  "trade",
  "personal",
  "other",
];

export function InventoryRecordForm({
  initialValues,
  locations,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<InventoryRecord>;
  locations: InventoryLocation[];
  submitting?: boolean;
  onSubmit: (payload: InventoryRecordPayload) => Promise<void> | void;
}) {
  const initialLookupValue: CatalogLookupItem | null = initialValues?.catalog_item
  ? {
      id: initialValues.catalog_item.id,
      sku: initialValues.catalog_item.sku,
      product_type: "catalog",
      display_name: initialValues.catalog_item.sku,
      subtitle: "",
      display_image_url: "",
      current_price: initialValues.catalog_item.base_price_override ?? null,
      pricing_source: initialValues.catalog_item.force_override
        ? "forced_override"
        : initialValues.catalog_item.base_price_override != null
        ? "manual_override"
        : "",
      is_active: initialValues.catalog_item.is_active,
    }
  : null;

  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogLookupItem | null>(
    initialLookupValue
  );

  const [locationId, setLocationId] = useState<number | "">(
    initialValues?.location?.id ?? ""
  );
  const [condition, setCondition] = useState<InventoryRecordPayload["condition"]>(
    initialValues?.condition ?? "loose"
  );
  const [sourceType, setSourceType] = useState<InventoryRecordPayload["source_type"]>(
    initialValues?.source_type ?? "other"
  );
  const [quantityOnHand, setQuantityOnHand] = useState(initialValues?.quantity_on_hand ?? 0);
  const [quantityReserved, setQuantityReserved] = useState(initialValues?.quantity_reserved ?? 0);
  const [unitCost, setUnitCost] = useState(
    initialValues?.unit_cost != null ? String(initialValues.unit_cost) : ""
  );
  const [acquiredAt, setAcquiredAt] = useState(initialValues?.acquired_at ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [isSellable, setIsSellable] = useState(initialValues?.is_sellable ?? true);
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);

  const canSave = useMemo(() => {
    return (
      !!selectedCatalogItem?.id &&
      locationId !== "" &&
      quantityReserved <= quantityOnHand &&
      !submitting
    );
  }, [selectedCatalogItem, locationId, quantityReserved, quantityOnHand, submitting]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCatalogItem?.id || locationId === "") return;

    await onSubmit({
      catalog_item_id: selectedCatalogItem.id,
      location_id: Number(locationId),
      condition,
      source_type: sourceType,
      quantity_on_hand: Number(quantityOnHand) || 0,
      quantity_reserved: Number(quantityReserved) || 0,
      unit_cost: unitCost.trim() === "" ? null : unitCost.trim(),
      acquired_at: acquiredAt || null,
      notes: notes.trim(),
      is_sellable: isSellable,
      is_active: isActive,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-1.5 lg:col-span-2">
            <div className={labelText}>Catalog Item</div>
            <CatalogItemPicker
              value={selectedCatalogItem}
              onChange={setSelectedCatalogItem}
            />
          </div>

          <label className="space-y-1.5">
            <div className={labelText}>Location</div>
            <select
              className={selectBase}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select location…</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Condition</div>
            <select
              className={selectBase}
              value={condition}
              onChange={(e) => setCondition(e.target.value as InventoryRecordPayload["condition"])}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Source</div>
            <select
              className={selectBase}
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as InventoryRecordPayload["source_type"])}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Acquired At</div>
            <input
              className={inputBase}
              type="date"
              value={acquiredAt ?? ""}
              onChange={(e) => setAcquiredAt(e.target.value)}
            />
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Qty On Hand</div>
            <input
              className={inputBase}
              type="number"
              min={0}
              value={quantityOnHand}
              onChange={(e) => setQuantityOnHand(Number(e.target.value) || 0)}
            />
          </label>

          <label className="space-y-1.5">
            <div className={labelText}>Qty Reserved</div>
            <input
              className={inputBase}
              type="number"
              min={0}
              value={quantityReserved}
              onChange={(e) => setQuantityReserved(Number(e.target.value) || 0)}
            />
          </label>

          <label className="space-y-1.5 lg:col-span-2">
            <div className={labelText}>Unit Cost</div>
            <input
              className={inputBase}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="3.2500"
              inputMode="decimal"
            />
          </label>

          <label className="space-y-1.5 lg:col-span-2">
            <div className={labelText}>Notes</div>
            <textarea
              className={`${inputBase} min-h-[96px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={isSellable}
              onChange={(e) => setIsSellable(e.target.checked)}
            />
            Sellable
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSave}
        className="w-full rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 md:w-auto"
      >
        {submitting ? "Saving…" : "Save record"}
      </button>
    </form>
  );
}