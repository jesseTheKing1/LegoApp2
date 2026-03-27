import React, { useEffect, useState } from "react";
import type {
  CatalogCostEntry,
  CatalogCostEntryPayload,
  CatalogCostSource,
} from "../../../types/catalogCostEntry";
import { btnBase, btnPrimary, inputBase, cx } from "../utils/ui";

const sourceOptions: CatalogCostSource[] = [
  "lego",
  "bricklink",
  "brickowl",
  "ebay",
  "local",
  "other",
];

const selectBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900";

export default function CatalogCostEntryForm({
  catalogItemId,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: {
  catalogItemId: number;
  initialValues?: CatalogCostEntry | null;
  submitting?: boolean;
  onSubmit: (payload: CatalogCostEntryPayload) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [source, setSource] = useState<CatalogCostSource>("bricklink");
  const [supplierName, setSupplierName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [taxCost, setTaxCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!initialValues) return;
    setSource(initialValues.source);
    setSupplierName(initialValues.supplier_name || "");
    setQuantity(String(initialValues.quantity ?? 1));
    setUnitCost(initialValues.unit_cost ?? "");
    setShippingCost(initialValues.shipping_cost ?? "");
    setTaxCost(initialValues.tax_cost ?? "");
    setOtherCost(initialValues.other_cost ?? "");
    setPurchasedAt(initialValues.purchased_at ?? "");
    setReference(initialValues.reference ?? "");
    setNotes(initialValues.notes ?? "");
  }, [initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }

    if (!unitCost.trim()) {
      setFormError("Unit cost is required.");
      return;
    }

    if (!purchasedAt) {
      setFormError("Purchased date is required.");
      return;
    }

    await onSubmit({
      catalog_item: catalogItemId,
      source,
      supplier_name: supplierName.trim() || undefined,
      quantity: qty,
      unit_cost: unitCost.trim(),
      shipping_cost: shippingCost.trim() || undefined,
      tax_cost: taxCost.trim() || undefined,
      other_cost: otherCost.trim() || undefined,
      purchased_at: purchasedAt,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</div>
          <select
            className={selectBase}
            value={source}
            onChange={(e) => setSource(e.target.value as CatalogCostSource)}
          >
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier</div>
          <input
            className={inputBase}
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Store / seller"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Quantity</div>
          <input
            type="number"
            min={1}
            className={inputBase}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
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

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Shipping</div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="0.0000"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tax</div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={taxCost}
            onChange={(e) => setTaxCost(e.target.value)}
            placeholder="0.0000"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Other cost</div>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputBase}
            value={otherCost}
            onChange={(e) => setOtherCost(e.target.value)}
            placeholder="0.0000"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Purchased date</div>
          <input
            type="date"
            className={inputBase}
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference</div>
        <input
          className={inputBase}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Order number / invoice"
        />
      </label>

      <label className="space-y-1 block">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
        <textarea
          className={cx(inputBase, "min-h-[84px]")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </label>

      {formError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving..." : initialValues ? "Update cost entry" : "Add cost entry"}
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