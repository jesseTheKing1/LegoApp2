import React, { useEffect, useState } from "react";
import type {
  CatalogCostEntry,
  CatalogCostEntryPayload,
  CatalogCostSource,
} from "../../../types/catalogCostEntry";
import type { CatalogItemMini } from "../../../types/catalog";
import { btnBase, btnPrimary, cx, inputBase } from "../utils/ui";

const SOURCE_OPTIONS: CatalogCostSource[] = [
  "lego",
  "bricklink",
  "brickowl",
  "ebay",
  "local",
  "other",
];

function nz(v?: string | null) {
  return v ?? "";
}

export function CatalogCostEntryForm({
  catalogItems,
  initialValues,
  defaultCatalogItemId,
  submitting,
  onSubmit,
}: {
  catalogItems: CatalogItemMini[];
  initialValues?: Partial<CatalogCostEntry>;
  defaultCatalogItemId?: number | null;
  submitting?: boolean;
  onSubmit: (payload: CatalogCostEntryPayload) => Promise<void> | void;
}) {
  const [catalogItem, setCatalogItem] = useState<number>(
    initialValues?.catalog_item ?? defaultCatalogItemId ?? 0
  );
  const [source, setSource] = useState<CatalogCostSource>(
    (initialValues?.source as CatalogCostSource) || "bricklink"
  );
  const [supplierName, setSupplierName] = useState(initialValues?.supplier_name ?? "");
  const [quantity, setQuantity] = useState(
    initialValues?.quantity ? String(initialValues.quantity) : ""
  );
  const [unitCost, setUnitCost] = useState(nz(initialValues?.unit_cost));
  const [shippingCost, setShippingCost] = useState(nz(initialValues?.shipping_cost) || "0.0000");
  const [taxCost, setTaxCost] = useState(nz(initialValues?.tax_cost) || "0.0000");
  const [otherCost, setOtherCost] = useState(nz(initialValues?.other_cost) || "0.0000");
  const [purchasedAt, setPurchasedAt] = useState(initialValues?.purchased_at ?? "");
  const [reference, setReference] = useState(initialValues?.reference ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  useEffect(() => {
    setCatalogItem(initialValues?.catalog_item ?? defaultCatalogItemId ?? 0);
    setSource((initialValues?.source as CatalogCostSource) || "bricklink");
    setSupplierName(initialValues?.supplier_name ?? "");
    setQuantity(initialValues?.quantity ? String(initialValues.quantity) : "");
    setUnitCost(nz(initialValues?.unit_cost));
    setShippingCost(nz(initialValues?.shipping_cost) || "0.0000");
    setTaxCost(nz(initialValues?.tax_cost) || "0.0000");
    setOtherCost(nz(initialValues?.other_cost) || "0.0000");
    setPurchasedAt(initialValues?.purchased_at ?? "");
    setReference(initialValues?.reference ?? "");
    setNotes(initialValues?.notes ?? "");
  }, [initialValues, defaultCatalogItemId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      catalog_item: Number(catalogItem),
      source,
      supplier_name: supplierName.trim(),
      quantity: Number(quantity),
      unit_cost: unitCost.trim(),
      shipping_cost: shippingCost.trim() || "0.0000",
      tax_cost: taxCost.trim() || "0.0000",
      other_cost: otherCost.trim() || "0.0000",
      purchased_at: purchasedAt,
      reference: reference.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Catalog Item</span>
          <select
            className={inputBase}
            value={catalogItem}
            onChange={(e) => setCatalogItem(Number(e.target.value))}
            required
          >
            <option value={0}>Select catalog item...</option>
            {catalogItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sku}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Source</span>
          <select
            className={inputBase}
            value={source}
            onChange={(e) => setSource(e.target.value as CatalogCostSource)}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Supplier Name</span>
          <input
            className={inputBase}
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Store name / seller"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Quantity</span>
          <input
            className={inputBase}
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Unit Cost</span>
          <input
            className={inputBase}
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.0500"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Shipping Cost</span>
          <input
            className={inputBase}
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Tax Cost</span>
          <input
            className={inputBase}
            value={taxCost}
            onChange={(e) => setTaxCost(e.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Other Cost</span>
          <input
            className={inputBase}
            value={otherCost}
            onChange={(e) => setOtherCost(e.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Purchased At</span>
          <input
            className={inputBase}
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            required
          />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Reference</span>
          <input
            className={inputBase}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Order # / invoice #"
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-700">Notes</span>
        <textarea
          className={cx(inputBase, "min-h-[100px]")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal purchase notes..."
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving..." : "Save Cost Entry"}
        </button>
        <button type="reset" className={btnBase}>
          Reset
        </button>
      </div>
    </form>
  );
}