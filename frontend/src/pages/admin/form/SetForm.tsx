import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type {
  LegoSet,
  SetPayload,
  SetPartPayload,
  SetMinifigPayload,
  ColorMatchMode,
} from "../../../types/set";
import type { LibraryPickerResult } from "../../../types/libraryPicker";

import { GlobalLibraryPicker } from "../components/GlobalLibraryPicker";
import { cx } from "../utils/ui";

type PartRow = SetPartPayload & {
  _rowId: string;
  _label?: string;
  _subtitle?: string;
};

type MinifigRow = SetMinifigPayload & {
  _rowId: string;
  _label?: string;
  _subtitle?: string;
};

function makeRowId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatErr(e: any) {
  return (
    e?.message ||
    e?.response?.data?.detail ||
    (typeof e?.response?.data === "string" ? e.response.data : null) ||
    "Upload failed"
  );
}

function validateFile(file: File) {
  if (!file.type?.startsWith("image/")) return "Please choose an image file.";
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) return "Image is too large (max 10 MB).";
  return null;
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
  const [catalogPreview, setCatalogPreview] = useState<LibraryPickerResult | null>(
    initialValues?.catalog_item
      ? {
          id: initialValues.catalog_item.id,
          type: "catalog",
          title: initialValues.catalog_item.sku,
          subtitle: initialValues.catalog_item.sku,
          image_url: null,
          search_text: initialValues.catalog_item.sku,
          meta: { sku: initialValues.catalog_item.sku },
        }
      : null
  );

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
      _label:
        row.part_color_detail?.part?.name ||
        row.part_color_detail?.part_color_code ||
        `Part ${row.part_color}`,
      _subtitle: [
        row.part_color_detail?.part?.part_id,
        row.part_color_detail?.color?.name,
        row.part_color_detail?.variant,
      ]
        .filter(Boolean)
        .join(" • "),
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
      _label: row.minifig_detail?.name || `Minifig ${row.minifig}`,
      _subtitle: row.minifig_detail?.bricklink_id || "",
    }))
  );

  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [minifigPickerOpen, setMinifigPickerOpen] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageErr, setUploadImageErr] = useState<string | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);

  const canSave = useMemo(() => {
    return !!setNum.trim() && !!name.trim() && !submitting && !uploadingImage;
  }, [setNum, name, submitting, uploadingImage]);

  const totalPartQty = useMemo(() => {
    return parts.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [parts]);

  const totalMinifigQty = useMemo(() => {
    return minifigsState.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [minifigsState]);

  function resetImageFileInput() {
    if (imageFileRef.current) imageFileRef.current.value = "";
  }

  async function uploadSetImage(file: File) {
    const err = validateFile(file);
    if (err) {
      setUploadImageErr(err);
      resetImageFileInput();
      return;
    }

    setUploadImageErr(null);
    setUploadingImage(true);

    try {
      const res = await uploadImageToR2(file);
      setImageUrl(res.public_url);
    } catch (e) {
      setUploadImageErr(formatErr(e));
    } finally {
      setUploadingImage(false);
      resetImageFileInput();
    }
  }

  function updatePart(rowId: string, patch: Partial<PartRow>) {
    setParts((prev) => prev.map((row) => (row._rowId === rowId ? { ...row, ...patch } : row)));
  }

  function removePart(rowId: string) {
    setParts((prev) => prev.filter((row) => row._rowId !== rowId));
  }

  function updateMinifig(rowId: string, patch: Partial<MinifigRow>) {
    setMinifigs((prev) => prev.map((row) => (row._rowId === rowId ? { ...row, ...patch } : row)));
  }

  function removeMinifig(rowId: string) {
    setMinifigs((prev) => prev.filter((row) => row._rowId !== rowId));
  }

  function handleCatalogPick(item: LibraryPickerResult) {
  console.log("catalog pick", item);

  if (item.type !== "catalog") {
    console.warn("Expected catalog result but got:", item.type);
    return;
  }

  setCatalogId(item.id);
  setCatalogPreview(item);
  setCatalogPickerOpen(false);
}

function handlePartPick(item: LibraryPickerResult) {
  console.log("part pick", item);

  if (item.type !== "part_color") {
    console.warn("Expected part_color result but got:", item.type);
    return;
  }

  setParts((prev) => [
    ...prev,
    {
      _rowId: makeRowId("part"),
      part_color_id: item.id,
      quantity: 1,
      instruction_page: null,
      sort_order: prev.length,
      bag_number: "",
      is_visible: true,
      is_structural: false,
      color_match_mode: "exact",
      notes: "",
      _label: item.title,
      _subtitle: item.subtitle,
    },
  ]);

  setPartPickerOpen(false);
}

function handleMinifigPick(item: LibraryPickerResult) {
  console.log("minifig pick", item);

  if (item.type !== "minifig") {
    console.warn("Expected minifig result but got:", item.type);
    return;
  }

  setMinifigs((prev) => [
    ...prev,
    {
      _rowId: makeRowId("minifig"),
      minifig_id: item.id,
      quantity: 1,
      sort_order: prev.length,
      bag_number: "",
      is_required: true,
      notes: "",
      _label: item.title,
      _subtitle: item.subtitle,
    },
  ]);

  setMinifigPickerOpen(false);
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
        .map(({ _rowId, _label, _subtitle, ...p }, i) => ({
          ...p,
          sort_order: i,
          instruction_page: p.instruction_page ?? null,
          bag_number: p.bag_number ?? "",
          notes: p.notes ?? "",
        })),
      minifigs: minifigsState
        .filter((m) => m.minifig_id)
        .map(({ _rowId, _label, _subtitle, ...m }, i) => ({
          ...m,
          sort_order: i,
          bag_number: m.bag_number ?? "",
          notes: m.notes ?? "",
        })),
    };

    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Set Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage set info, linked catalog pricing, included parts, and minifigs.
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

            <div className="lg:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Catalog Item</label>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                {catalogPreview ? (
                  <SelectedCard
                    title={catalogPreview.title}
                    subtitle={catalogPreview.subtitle}
                    onClear={() => {
                      setCatalogId("");
                      setCatalogPreview(null);
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    No catalog item linked.
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={() => setCatalogPickerOpen((v) => !v)}
                  >
                    {catalogPickerOpen ? "Close Search" : catalogPreview ? "Change Catalog Item" : "Search Catalog"}
                  </button>
                </div>

                {catalogPickerOpen ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <GlobalLibraryPicker
                      mode="catalog"
                      allowedModes={["catalog"]}
                      title="Select Catalog Item"
                      placeholder="Search SKU, part, minifig, or pricing..."
                      onPick={handleCatalogPick}
                      autoFocus
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-8">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Image</label>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <TextInput
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={!!submitting || uploadingImage}
                  />

                  <button
                    type="button"
                    onClick={() => imageFileRef.current?.click()}
                    disabled={!!submitting || uploadingImage}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingImage ? "Uploading…" : "Upload"}
                  </button>

                  {imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      disabled={!!submitting || uploadingImage}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadSetImage(f);
                  }}
                />

                {uploadImageErr ? (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {uploadImageErr}
                  </div>
                ) : null}

                <div className="mt-3 text-[11px] font-semibold text-slate-500">
                  Upload an image to R2 or paste an image URL manually.
                </div>
              </div>
            </div>

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
            <h3 className="text-lg font-black text-slate-900">Parts</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search exact part-color combinations, then fill in bag, page, and visibility details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPartPickerOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {partPickerOpen ? "Close Part Search" : "+ Add Part"}
          </button>
        </div>

        <div className="p-6 space-y-5">
          {partPickerOpen ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <GlobalLibraryPicker
                mode="part_color"
                allowedModes={["part_color"]}
                title="Add Part Color"
                placeholder="Search part id, name, color, category, or variant..."
                onPick={handlePartPick}
                autoFocus
              />
            </div>
          ) : null}

          {parts.length === 0 ? (
            <EmptyState text="No parts added yet." />
          ) : (
            <div className="space-y-4">
              {parts.map((row, index) => (
                <div
                  key={row._rowId}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-slate-800">Part Row {index + 1}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row._label || "Unselected part"}
                      </div>
                      <div className="text-sm text-slate-500">{row._subtitle || "Choose a part color"}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePart(row._rowId)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-12">
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

                    <Field label="Instruction Page" className="xl:col-span-2">
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

                    <Field label="Color Match" className="xl:col-span-3">
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

                    <Field label="Replace Part Selection" className="xl:col-span-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPartPickerOpen(true);
                          removePart(row._rowId);
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        Search Another Part
                      </button>
                    </Field>

                    <Field label="Notes" className="xl:col-span-8">
                      <TextInput
                        value={row.notes}
                        onChange={(e) => updatePart(row._rowId, { notes: e.target.value })}
                        placeholder="Optional notes about this piece"
                      />
                    </Field>

                    <div className="xl:col-span-4">
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
            <h3 className="text-lg font-black text-slate-900">Minifigs</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search and add minifigs cleanly instead of digging through a huge dropdown.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMinifigPickerOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {minifigPickerOpen ? "Close Minifig Search" : "+ Add Minifig"}
          </button>
        </div>

        <div className="p-6 space-y-5">
          {minifigPickerOpen ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <GlobalLibraryPicker
                mode="minifig"
                allowedModes={["minifig"]}
                title="Add Minifig"
                placeholder="Search minifig name, BrickLink ID, or theme..."
                onPick={handleMinifigPick}
                autoFocus
              />
            </div>
          ) : null}

          {minifigsState.length === 0 ? (
            <EmptyState text="No minifigs added yet." />
          ) : (
            <div className="space-y-4">
              {minifigsState.map((row, index) => (
                <div
                  key={row._rowId}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-slate-800">Minifig Row {index + 1}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row._label || "Unselected minifig"}
                      </div>
                      <div className="text-sm text-slate-500">{row._subtitle || "Choose a minifig"}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMinifig(row._rowId)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-12">
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

                    <Field label="Bag Number" className="xl:col-span-3">
                      <TextInput
                        value={row.bag_number}
                        onChange={(e) => updateMinifig(row._rowId, { bag_number: e.target.value })}
                        placeholder="1"
                      />
                    </Field>

                    <div className="xl:col-span-3">
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

                    <Field label="Replace Minifig" className="xl:col-span-4">
                      <button
                        type="button"
                        onClick={() => {
                          setMinifigPickerOpen(true);
                          removeMinifig(row._rowId);
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        Search Another Minifig
                      </button>
                    </Field>

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
            {submitting || uploadingImage ? "Saving..." : "Save Set"}
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

function SelectedCard({
  title,
  subtitle,
  onClear,
}: {
  title: string;
  subtitle?: string;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle || "—"}</div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}