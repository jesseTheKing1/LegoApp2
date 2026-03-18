import React, { useMemo, useState } from "react";
import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type {
  LegoSet,
  SetPayload,
  SetPartPayload,
  SetMinifigPayload,
  ColorMatchMode,
} from "../../../types/set";

import { PartColorSearchPicker } from "../components/PartColorSearchPicker";

type PartRow = SetPartPayload & {
  _rowId: string;
};

type MinifigRow = SetMinifigPayload & {
  _rowId: string;
};

function makeRowId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function SetForm({
  themes,
  catalogItems,
  minifigs,
  initialValues,
  submitting,
  onSubmit,
}: {
  themes: Theme[];
  catalogItems: CatalogItemMini[];
  minifigs: Minifig[];
  initialValues?: Partial<LegoSet>;
  submitting?: boolean;
  onSubmit: (payload: SetPayload) => Promise<void> | void;
}) {
  const [setNum, setSetNum] = useState(initialValues?.set_num ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [pieceCount, setPieceCount] = useState(initialValues?.official_piece_count ?? 0);

  const [themeId, setThemeId] = useState<number | "">(initialValues?.theme?.id ?? "");
  const [catalogId, setCatalogId] = useState<number | "">(initialValues?.catalog_item?.id ?? "");

  const [parts, setParts] = useState<PartRow[]>(
    (initialValues?.parts ?? []).map((row, i) => ({
      _rowId: makeRowId(`part-${i}`),
      part_color_id: row.part_color,
      quantity: row.quantity,
      instruction_page: row.instruction_page,
      sort_order: row.sort_order ?? i,
      bag_number: row.bag_number ?? "",
      is_visible: row.is_visible,
      is_structural: row.is_structural,
      color_match_mode: row.color_match_mode ?? "exact",
      notes: row.notes ?? "",
    }))
  );

  const [minifigsState, setMinifigs] = useState<MinifigRow[]>(
    (initialValues?.minifigs ?? []).map((row, i) => ({
      _rowId: makeRowId(`minifig-${i}`),
      minifig_id: row.minifig,
      quantity: row.quantity,
      sort_order: row.sort_order ?? i,
      bag_number: row.bag_number ?? "",
      is_required: row.is_required ?? true,
      notes: row.notes ?? "",
    }))
  );

  const canSave = useMemo(() => {
    return !!setNum.trim() && !!name.trim() && !submitting;
  }, [setNum, name, submitting]);

  const totalPartQty = useMemo(() => {
    return parts.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [parts]);

  const totalMinifigQty = useMemo(() => {
    return minifigsState.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [minifigsState]);

  function addPart() {
    setParts((prev) => [
      ...prev,
      {
        _rowId: makeRowId("part"),
        part_color_id: 0,
        quantity: 1,
        instruction_page: null,
        sort_order: prev.length,
        bag_number: "",
        is_visible: true,
        is_structural: false,
        color_match_mode: "exact",
        notes: "",
      },
    ]);
  }

  function updatePart(rowId: string, patch: Partial<PartRow>) {
    setParts((prev) => prev.map((row) => (row._rowId === rowId ? { ...row, ...patch } : row)));
  }

  function removePart(rowId: string) {
    setParts((prev) => prev.filter((row) => row._rowId !== rowId));
  }

  function addMinifig() {
    setMinifigs((prev) => [
      ...prev,
      {
        _rowId: makeRowId("minifig"),
        minifig_id: 0,
        quantity: 1,
        sort_order: prev.length,
        bag_number: "",
        is_required: true,
        notes: "",
      },
    ]);
  }

  function updateMinifig(rowId: string, patch: Partial<MinifigRow>) {
    setMinifigs((prev) => prev.map((row) => (row._rowId === rowId ? { ...row, ...patch } : row)));
  }

  function removeMinifig(rowId: string) {
    setMinifigs((prev) => prev.filter((row) => row._rowId !== rowId));
  }

  async function submit(e: React.FormEvent) {
  e.preventDefault();

  const payload: SetPayload = {
    set_num: setNum.trim(),
    name: name.trim(),
    image_url: imageUrl.trim() || undefined,
    official_piece_count: Number(pieceCount) || 0,
    theme_id: themeId || null,
    catalog_item_id: catalogId || null,
    parts: parts
      .filter((p) => p.part_color_id)
      .map(({ _rowId, ...p }, i) => ({
        ...p,
        sort_order: i,
        instruction_page: p.instruction_page ?? null,
        bag_number: p.bag_number ?? "",
        notes: p.notes ?? "",
      })),
    minifigs: minifigsState
      .filter((m) => m.minifig_id)
      .map(({ _rowId, ...m }, i) => ({
        ...m,
        sort_order: i,
        bag_number: m.bag_number ?? "",
        notes: m.notes ?? "",
      })),
  };

  console.log("SET PAYLOAD", payload);
  await onSubmit(payload);
}

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Set Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage set info, included parts, and minifigs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryPill label="Part Rows" value={parts.length} />
              <SummaryPill label="Part Qty" value={totalPartQty} />
              <SummaryPill label="Minifig Rows" value={minifigsState.length} />
              <SummaryPill label="Piece Count" value={pieceCount || 0} />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-5 lg:grid-cols-12">
            <Field label="Set Number" className="lg:col-span-3">
              <TextInput value={setNum} onChange={(e) => setSetNum(e.target.value)} placeholder="75313" />
            </Field>

            <Field label="Set Name" className="lg:col-span-5">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="AT-AT" />
            </Field>

            <Field label="Official Piece Count" className="lg:col-span-2">
              <TextInput
                type="number"
                value={pieceCount}
                onChange={(e) => setPieceCount(Number(e.target.value) || 0)}
                placeholder="6785"
              />
            </Field>

            <Field label="Theme" className="lg:col-span-2">
              <SelectInput
                value={themeId}
                onChange={(e) => setThemeId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">No theme</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Catalog Item" className="lg:col-span-4">
              <SelectInput
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">No catalog item</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Image URL" className="lg:col-span-8">
              <TextInput
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </Field>

            {imageUrl ? (
              <div className="lg:col-span-12">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Image Preview
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                    <img
                      src={imageUrl}
                      alt={name || "Set preview"}
                      className="max-h-64 rounded-xl object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Parts</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add exact part and color combinations used in this set.
            </p>
          </div>

          <button
            type="button"
            onClick={addPart}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            + Add Part
          </button>
        </div>

        <div className="p-6">
          {parts.length === 0 ? (
            <EmptyState text="No parts added yet." />
          ) : (
            <div className="space-y-4">
              {parts.map((row, index) => (
                <div
                  key={row._rowId}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">Part Row {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removePart(row._rowId)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-12">
                    <Field label="Piece" className="xl:col-span-5">
                      <PartColorSearchPicker
                        value={row.part_color_id || 0}
                        onChange={(id) => updatePart(row._rowId, { part_color_id: id })}
                      />
                    </Field>

                    <Field label="Quantity" className="xl:col-span-2">
                      <TextInput
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updatePart(row._rowId, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </Field>

                    <Field label="Bag Number" className="xl:col-span-2">
                      <TextInput
                        value={row.bag_number}
                        onChange={(e) => updatePart(row._rowId, { bag_number: e.target.value })}
                        placeholder="1"
                      />
                    </Field>

                    <Field label="Instruction Page" className="xl:col-span-3">
                      <TextInput
                        type="number"
                        value={row.instruction_page ?? ""}
                        onChange={(e) =>
                          updatePart(row._rowId, {
                            instruction_page: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="Optional"
                      />
                    </Field>

                    <Field label="Color Match" className="xl:col-span-4">
                      <SelectInput
                        value={row.color_match_mode}
                        onChange={(e) =>
                          updatePart(row._rowId, {
                            color_match_mode: e.target.value as ColorMatchMode,
                          })
                        }
                      >
                        <option value="exact">Exact Color</option>
                        <option value="any_color">Any Color</option>
                      </SelectInput>
                    </Field>

                    <Field label="Notes" className="xl:col-span-8">
                      <TextInput
                        value={row.notes}
                        onChange={(e) => updatePart(row._rowId, { notes: e.target.value })}
                        placeholder="Optional notes about this piece"
                      />
                    </Field>

                    <div className="xl:col-span-12">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Options
                      </label>
                      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <ToggleBox
                          label="Visible"
                          checked={row.is_visible}
                          onChange={(checked) => updatePart(row._rowId, { is_visible: checked })}
                        />
                        <ToggleBox
                          label="Structural"
                          checked={row.is_structural}
                          onChange={(checked) => updatePart(row._rowId, { is_structural: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Minifigs</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add the minifigs included in this set.
            </p>
          </div>

          <button
            type="button"
            onClick={addMinifig}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            + Add Minifig
          </button>
        </div>

        <div className="p-6">
          {minifigsState.length === 0 ? (
            <EmptyState text="No minifigs added yet." />
          ) : (
            <div className="space-y-4">
              {minifigsState.map((row, index) => (
                <div
                  key={row._rowId}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">Minifig Row {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeMinifig(row._rowId)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-12">
                    <Field label="Minifig" className="xl:col-span-6">
                      <SelectInput
                        value={row.minifig_id || ""}
                        onChange={(e) =>
                          updateMinifig(row._rowId, {
                            minifig_id: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
                      >
                        <option value="">Select a minifig</option>
                        {minifigs.map((mf) => (
                          <option key={mf.id} value={mf.id}>
                            {mf.name}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    <Field label="Quantity" className="xl:col-span-2">
                      <TextInput
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updateMinifig(row._rowId, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </Field>

                    <Field label="Bag Number" className="xl:col-span-2">
                      <TextInput
                        value={row.bag_number}
                        onChange={(e) => updateMinifig(row._rowId, { bag_number: e.target.value })}
                        placeholder="1"
                      />
                    </Field>

                    <div className="xl:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Required
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <ToggleBox
                          label="Required"
                          checked={row.is_required}
                          onChange={(checked) => updateMinifig(row._rowId, { is_required: checked })}
                        />
                      </div>
                    </div>

                    <Field label="Notes" className="xl:col-span-12">
                      <TextInput
                        value={row.notes}
                        onChange={(e) => updateMinifig(row._rowId, { notes: e.target.value })}
                        placeholder="Optional notes about this minifig"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{parts.length}</span> part rows •{" "}
            <span className="font-semibold text-slate-800">{minifigsState.length}</span> minifig rows
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Set"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70",
        props.className || "",
      ].join(" ")}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition",
        "focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70",
        props.className || "",
      ].join(" ")}
    />
  );
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-base font-bold text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function ToggleBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}