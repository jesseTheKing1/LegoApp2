import React, { useEffect, useState } from "react";
import type { CatalogItem, CatalogItemPayload } from "../../../types/catalog";
import { btnBase, btnPrimary, cx, inputBase } from "../utils/ui";

function nz(v?: string | null) {
  return v ?? "";
}

export function CatalogItemForm({
  initialValues,
  submitting,
  onSubmit,
  onDelete,
}: {
  initialValues?: Partial<CatalogItem>;
  submitting?: boolean;
  onSubmit: (payload: CatalogItemPayload) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const [sku, setSku] = useState(initialValues?.sku ?? "");
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);

  const [basePriceOverride, setBasePriceOverride] = useState(
    nz(initialValues?.base_price_override)
  );
  const [forceOverride, setForceOverride] = useState(initialValues?.force_override ?? false);

  const [legoReferencePrice, setLegoReferencePrice] = useState(
    nz(initialValues?.lego_reference_price)
  );
  const [bricklinkReferencePrice, setBricklinkReferencePrice] = useState(
    nz(initialValues?.bricklink_reference_price)
  );

  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  useEffect(() => {
    setSku(initialValues?.sku ?? "");
    setIsActive(initialValues?.is_active ?? true);
    setBasePriceOverride(nz(initialValues?.base_price_override));
    setForceOverride(initialValues?.force_override ?? false);
    setLegoReferencePrice(nz(initialValues?.lego_reference_price));
    setBricklinkReferencePrice(nz(initialValues?.bricklink_reference_price));
    setNotes(initialValues?.notes ?? "");
  }, [initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      sku: sku.trim(),
      is_active: isActive,
      base_price_override: basePriceOverride.trim() || null,
      force_override: forceOverride,
      lego_reference_price: legoReferencePrice.trim() || null,
      bricklink_reference_price: bricklinkReferencePrice.trim() || null,
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">SKU</span>
          <input
            className={inputBase}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="3001-black-plain"
            required
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-700">Active</span>
        </label>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
          Sell Pricing
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Sell Price Override</span>
            <input
              className={inputBase}
              value={basePriceOverride}
              onChange={(e) => setBasePriceOverride(e.target.value)}
              placeholder="0.1200"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={forceOverride}
              onChange={(e) => setForceOverride(e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-700">
              Force sell price override
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
          Market Reference Pricing
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">LEGO Reference Price</span>
            <input
              className={inputBase}
              value={legoReferencePrice}
              onChange={(e) => setLegoReferencePrice(e.target.value)}
              placeholder="0.1200"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">BrickLink Reference Price</span>
            <input
              className={inputBase}
              value={bricklinkReferencePrice}
              onChange={(e) => setBricklinkReferencePrice(e.target.value)}
              placeholder="0.0900"
            />
          </label>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-700">Notes</span>
        <textarea
          className={cx(inputBase, "min-h-[110px]")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes..."
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving..." : initialValues?.id ? "Save Changes" : "Create Catalog Item"}
        </button>

        {initialValues?.id && onDelete ? (
          <button
            type="button"
            className={cx(btnBase, "border-red-200 text-red-700 hover:bg-red-50")}
            onClick={() => onDelete()}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}