import React, { useEffect, useState } from "react";
import type {
  CatalogCostEntry,
  CatalogCostEntryPayload,
  CatalogCostSource,
} from "../../../types/catalogCostEntry";
import type { CatalogItemMini } from "../../../types/catalog";
import type { LibraryPickerResult } from "../../../types/libraryPicker";

import { btnBase, btnPrimary, cx, inputBase } from "../utils/ui";
import { GlobalLibraryPicker } from "../components/GlobalLibraryPicker";

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
  const [catalogPreview, setCatalogPreview] = useState<LibraryPickerResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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

    if (defaultCatalogItemId && !initialValues?.catalog_item) {
      const found = catalogItems.find((x) => x.id === defaultCatalogItemId);
      if (found) {
        setCatalogPreview({
          id: found.id,
          type: "catalog",
          title: found.sku,
          subtitle: found.sku,
          image_url: null,
          search_text: found.sku,
          meta: { sku: found.sku },
        });
      }
    }
  }, [initialValues, defaultCatalogItemId, catalogItems]);

  function handleCatalogPick(item: LibraryPickerResult) {
    if (item.type !== "catalog") return;
    setCatalogItem(item.id);
    setCatalogPreview(item);
    setPickerOpen(false);
  }

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
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Catalog Item
        </div>

        {catalogPreview ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900">{catalogPreview.title}</div>
                <div className="mt-1 text-sm text-slate-500">{catalogPreview.subtitle || "—"}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCatalogItem(0);
                  setCatalogPreview(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No catalog item selected.
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={btnBase}
            onClick={() => setPickerOpen((v) => !v)}
          >
            {pickerOpen ? "Close Search" : catalogPreview ? "Change Catalog Item" : "Search Catalog"}
          </button>
        </div>

        {pickerOpen ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <GlobalLibraryPicker
              mode="catalog"
              allowedModes={["catalog"]}
              title="Find Catalog Item"
              placeholder="Search SKU, linked part, minifig, or price..."
              onPick={handleCatalogPick}
              autoFocus
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
        <button type="submit" className={btnPrimary} disabled={submitting || !catalogItem}>
          {submitting ? "Saving..." : "Save Cost Entry"}
        </button>
        <button type="reset" className={btnBase}>
          Reset
        </button>
      </div>
    </form>
  );
}