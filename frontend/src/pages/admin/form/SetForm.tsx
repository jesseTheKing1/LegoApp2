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

type PartRow = SetPartPayload & {
  _rowId: string;
  _label?: string;
  _subtitle?: string;
  _unitCost?: number | null;
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

function asMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function parsePrice(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function bagLabel(raw: string) {
  return raw.trim() || "Unbagged";
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
          meta: {
            sku: initialValues.catalog_item.sku,
            current_price: initialValues.catalog_item.base_price_override,
          },

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
      step_number: row.step_number ?? null,
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
      _unitCost: parsePrice(row.part_color_detail?.catalog_item?.base_price_override),
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

  const totalPartCost = useMemo(() => {
    return parts.reduce((sum, row) => sum + parsePrice(row._unitCost) * (Number(row.quantity) || 0), 0);
  }, [parts]);

  const sellPrice = useMemo(() => {
    const selectedCatalog = catalogItems.find((item) => item.id === catalogId);
    return parsePrice(
      selectedCatalog?.base_price_override ??
        catalogPreview?.meta?.base_price_override ??
        initialValues?.catalog_item?.base_price_override
    );
  }, [catalogId, catalogItems, catalogPreview, initialValues?.catalog_item?.base_price_override]);

  const grossSpread = sellPrice - totalPartCost;

  const groupedParts = useMemo(() => {
    const sorted = [...parts].sort((a, b) => {
      const bagA = (a.bag_number || "").localeCompare(b.bag_number || "", undefined, { numeric: true });
      if (bagA !== 0) return bagA;

      const stepA = a.step_number ?? Number.MAX_SAFE_INTEGER;
      const stepB = b.step_number ?? Number.MAX_SAFE_INTEGER;
      if (stepA !== stepB) return stepA - stepB;

      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    return sorted.reduce<Array<{ bag: string; rows: PartRow[] }>>((acc, row) => {
      const bag = bagLabel(row.bag_number);
      const existing = acc.find((group) => group.bag === bag);
      if (existing) {
        existing.rows.push(row);
      } else {
        acc.push({ bag, rows: [row] });
      }
      return acc;
    }, []);
  }, [parts]);

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
    if (item.type !== "catalog") return;
    setCatalogId(item.id);
    setCatalogPreview(item);
    setCatalogPickerOpen(false);
  }

  function handlePartPick(item: LibraryPickerResult) {
    if (item.type !== "part_color") return;

    setParts((prev) => [
      ...prev,
      {
        _rowId: makeRowId("part"),
        part_color_id: item.id,
        quantity: 1,
        instruction_page: null,
        sort_order: prev.length,
        bag_number: "",
        step_number: null,
        is_visible: true,
        is_structural: false,
        color_match_mode: "exact",
        notes: "",
        _label: item.title,
        _subtitle: item.subtitle,
        _unitCost: parsePrice(item.meta?.base_price_override),
      },
    ]);

    setPartPickerOpen(false);
  }

  function handleMinifigPick(item: LibraryPickerResult) {
    if (item.type !== "minifig") return;

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

    const orderedParts = [...parts]
      .filter((p) => p.part_color_id)
      .sort((a, b) => {
        const bag = (a.bag_number || "").localeCompare(b.bag_number || "", undefined, { numeric: true });
        if (bag !== 0) return bag;

        const stepA = a.step_number ?? Number.MAX_SAFE_INTEGER;
        const stepB = b.step_number ?? Number.MAX_SAFE_INTEGER;
        if (stepA !== stepB) return stepA - stepB;

        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

    const payload: SetPayload = {
      set_num: setNum.trim(),
      name: name.trim(),
      image_url: imageUrl.trim() || undefined,
      official_piece_count: Number(pieceCount) || 0,
      theme_id: themeId || null,
      catalog_item_id: catalogId || null,
      parts: orderedParts.map(({ _rowId, _label, _subtitle, _unitCost, ...p }, i) => ({
        ...p,
        sort_order: i,
        instruction_page: p.instruction_page ?? null,
        step_number: p.step_number ?? null,
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
    <form onSubmit={submit} className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Set Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Set identity, pricing link, build order, and inventory totals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <SummaryPill label="Part Rows" value={parts.length} />
              <SummaryPill label="Part Cost" value={asMoney(totalPartCost)} />
              <SummaryPill label="Sell Price" value={asMoney(sellPrice)} />
              <SummaryPill label="Spread" value={asMoney(grossSpread)} />
              <SummaryPill label="Minifigs" value={totalMinifigQty} />
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-4 lg:grid-cols-12">
            <Field label="Set Number" className="lg:col-span-2">
              <TextInput value={setNum} onChange={(e) => setSetNum(e.target.value)} placeholder="75313" />
            </Field>

            <Field label="Set Name" className="lg:col-span-4">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="AT-AT" />
            </Field>

            <Field label="Piece Count" className="lg:col-span-2">
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

            <Field label="Image URL" className="lg:col-span-2">
              <TextInput
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                disabled={!!submitting || uploadingImage}
              />
            </Field>

            <div className="lg:col-span-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Catalog Item</label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
                  <EmptyState text="No catalog item linked." />
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={() => setCatalogPickerOpen((v) => !v)}
                  >
                    {catalogPickerOpen ? "Close Search" : "Search Catalog"}
                  </button>

                  <button
                    type="button"
                    onClick={() => imageFileRef.current?.click()}
                    disabled={!!submitting || uploadingImage}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </button>
                </div>

                {catalogPickerOpen ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
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

            <div className="lg:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Build Summary</label>
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <MiniStat label="Part quantity" value={String(totalPartQty)} />
                <MiniStat label="Minifig quantity" value={String(totalMinifigQty)} />
                <MiniStat label="Internal parts cost" value={asMoney(totalPartCost)} />
                <MiniStat label="Set sell price" value={asMoney(sellPrice)} />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Preview</label>
              <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {imageUrl ? (
                  <img src={imageUrl} alt={name || "Set preview"} className="max-h-44 rounded-xl object-contain" />
                ) : (
                  <div className="text-sm text-slate-400">No image yet</div>
                )}
              </div>
            </div>
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
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {uploadImageErr}
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Parts</h3>
            <p className="mt-1 text-sm text-slate-500">
              Grouped by bag, sorted by step, and edited inline for faster entry.
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

        <div className="space-y-4 p-5">
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

          {groupedParts.length === 0 ? (
            <EmptyState text="No parts added yet." />
          ) : (
            groupedParts.map((group) => (
              <div key={group.bag} className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">Bag {group.bag}</div>
                    <div className="text-xs text-slate-500">{group.rows.length} rows</div>
                  </div>

                  <div className="text-sm font-semibold text-slate-600">
                    {asMoney(group.rows.reduce((sum, row) => sum + parsePrice(row._unitCost) * row.quantity, 0))}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.rows.map((row) => (
                    <div key={row._rowId} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(220px,2fr)_70px_80px_90px_90px_120px_1fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{row._label || "Unselected part"}</div>
                        <div className="truncate text-xs text-slate-500">{row._subtitle || "Choose a part color"}</div>
                        <div className="mt-1 text-xs font-medium text-slate-400">
                          Unit {asMoney(row._unitCost)} • Line {asMoney(parsePrice(row._unitCost) * row.quantity)}
                        </div>
                      </div>

                      <TextInput
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => updatePart(row._rowId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        placeholder="Qty"
                      />

                      <TextInput
                        value={row.bag_number}
                        onChange={(e) => updatePart(row._rowId, { bag_number: e.target.value })}
                        placeholder="Bag"
                      />

                      <TextInput
                        type="number"
                        value={row.step_number ?? ""}
                        onChange={(e) =>
                          updatePart(row._rowId, { step_number: e.target.value ? Number(e.target.value) : null })
                        }
                        placeholder="Step"
                      />

                      <TextInput
                        type="number"
                        value={row.instruction_page ?? ""}
                        onChange={(e) =>
                          updatePart(row._rowId, {
                            instruction_page: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="Page"
                      />

                      <SelectInput
                        value={row.color_match_mode}
                        onChange={(e) =>
                          updatePart(row._rowId, { color_match_mode: e.target.value as ColorMatchMode })
                        }
                      >
                        <option value="exact">Exact</option>
                        <option value="any_color">Any color</option>
                      </SelectInput>

                      <TextInput
                        value={row.notes}
                        onChange={(e) => updatePart(row._rowId, { notes: e.target.value })}
                        placeholder="Notes"
                      />

                      <div className="flex items-center gap-2">
                        <ToggleBox
                          label="V"
                          checked={row.is_visible}
                          onChange={(checked) => updatePart(row._rowId, { is_visible: checked })}
                        />
                        <ToggleBox
                          label="S"
                          checked={row.is_structural}
                          onChange={(checked) => updatePart(row._rowId, { is_structural: checked })}
                        />
                        <button
                          type="button"
                          onClick={() => removePart(row._rowId)}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Minifigs</h3>
            <p className="mt-1 text-sm text-slate-500">
              Keep this simple and lightweight beside the part workflow.
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

        <div className="space-y-4 p-5">
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
            <div className="space-y-3">
              {minifigsState.map((row) => (
                <div key={row._rowId} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(220px,2fr)_80px_90px_1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{row._label || "Unselected minifig"}</div>
                    <div className="truncate text-xs text-slate-500">{row._subtitle || "Choose a minifig"}</div>
                  </div>

                  <TextInput
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateMinifig(row._rowId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  />

                  <TextInput
                    value={row.bag_number}
                    onChange={(e) => updateMinifig(row._rowId, { bag_number: e.target.value })}
                    placeholder="Bag"
                  />

                  <TextInput
                    value={row.notes}
                    onChange={(e) => updateMinifig(row._rowId, { notes: e.target.value })}
                    placeholder="Notes"
                  />

                  <div className="flex items-center gap-2">
                    <ToggleBox
                      label="Req"
                      checked={row.is_required}
                      onChange={(checked) => updateMinifig(row._rowId, { is_required: checked })}
                    />
                    <button
                      type="button"
                      onClick={() => removeMinifig(row._rowId)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{parts.length}</span> part rows •{" "}
            <span className="font-semibold text-slate-900">{totalPartQty}</span> parts •{" "}
            <span className="font-semibold text-slate-900">{asMoney(totalPartCost)}</span> internal cost
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
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
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
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
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
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700">
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle || "-"}</div>
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
