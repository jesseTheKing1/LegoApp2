import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type { PartColorRow } from "../../../types/partColor";
import type {
  LegoSet,
  SetPayload,
  SetPartPayload,
  SetMinifigPayload,
  ColorMatchMode,
} from "../../../types/set";
import type { LibraryPickerResult } from "../../../types/libraryPicker";

import { DrawerShell } from "../components/DrawerShell";
import { GlobalLibraryPicker } from "../components/GlobalLibraryPicker";
import { PartColorDetailDrawer } from "../components/PartColorDetailDrawer";
// Adjust this import if your part-color detail drawer lives in a different admin folder.

type PartRow = SetPartPayload & {
  _rowId: string;
  _label?: string;
  _subtitle?: string;
  _unitCost?: number | null;
  _unitSellPrice?: number | null;
  _imageUrl?: string | null;
  _partColorDetail?: PartColorRow | null;
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

function parsePrice(value: unknown) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseNullablePrice(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function bagLabel(raw: string) {
  const next = raw.trim();
  return next || "Unbagged";
}

function readLooseField(obj: unknown, key: string) {
  if (!obj || typeof obj !== "object") return null;
  return (obj as Record<string, unknown>)[key] ?? null;
}

function getPartImage(part: PartColorRow | null | undefined) {
  return part?.image_url_1 || part?.image_url_2 || part?.part?.image_url || null;
}

function getFirstPrice(...values: unknown[]) {
  for (const value of values) {
    const parsed = parseNullablePrice(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function getLowestPrice(...values: unknown[]) {
  const parsed = values
    .map((value) => parseNullablePrice(value))
    .filter((value): value is number => value != null && value > 0);

  if (parsed.length === 0) return null;
  return Math.min(...parsed);
}

function getPartUnitCost(part: PartColorRow | null | undefined) {
  const catalog = part?.effective_catalog_item ?? part?.catalog_item;
  return (
    getLowestPrice(
      readLooseField(catalog, "lego_reference_price"),
      readLooseField(catalog, "bricklink_reference_price")
    ) ??
    getFirstPrice(
      readLooseField(catalog, "current_cost"),
      readLooseField(catalog, "base_price_override")
    ) ??
    0
  );
}

function getPartUnitSellPrice(part: PartColorRow | null | undefined) {
  const catalog = part?.effective_catalog_item ?? part?.catalog_item;
  return (
    getFirstPrice(
      readLooseField(catalog, "current_price"),
      readLooseField(catalog, "base_price_override")
    ) ?? 0
  );
}

export function SetForm({
  themes,
  catalogItems,
  partColors,
  minifigs,
  initialValues,
  submitting,
  onSubmit,
}: {
  themes: Theme[];
  catalogItems: CatalogItemMini[];
  partColors: PartColorRow[];
  minifigs: Minifig[];
  initialValues?: Partial<LegoSet>;
  submitting?: boolean;
  onSubmit: (payload: SetPayload) => Promise<void> | void;
}) {
  const [setNum, setSetNum] = useState(initialValues?.set_num ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [pieceCount, setPieceCount] = useState(initialValues?.official_piece_count ?? 0);
  const [yearReleased, setYearReleased] = useState<number | "">(initialValues?.year_released ?? "");

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

  const [parts, setParts] = useState<PartRow[]>(() =>
    (initialValues?.parts ?? []).map((row, i) => {
      const fallbackDetail = (row.part_color_detail as PartColorRow | undefined) ?? null;
      const detail = partColors.find((part) => part.id === row.part_color) ?? fallbackDetail;

      return {
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
        _unitCost:
          getPartUnitCost(detail) ||
          (getLowestPrice(
            readLooseField(row.part_color_detail?.effective_catalog_item ?? row.part_color_detail?.catalog_item, "lego_reference_price"),
            readLooseField(row.part_color_detail?.effective_catalog_item ?? row.part_color_detail?.catalog_item, "bricklink_reference_price")
          ) ??
            getFirstPrice(
              readLooseField(row.part_color_detail?.effective_catalog_item ?? row.part_color_detail?.catalog_item, "current_cost"),
              readLooseField(row.part_color_detail?.effective_catalog_item ?? row.part_color_detail?.catalog_item, "base_price_override")
            ) ??
            0),
        _unitSellPrice:
          getPartUnitSellPrice(detail) ||
          (getFirstPrice(
            readLooseField(row.part_color_detail?.effective_catalog_item ?? row.part_color_detail?.catalog_item, "current_price"),
            readLooseField(row.part_color_detail?.effective_catalog_item ?? row.part_color_detail?.catalog_item, "base_price_override")
          ) ??
            0),
        _imageUrl: getPartImage(detail) || row.part_color_detail?.image_url_1 || row.part_color_detail?.image_url_2 || null,
        _partColorDetail: detail,
      };
    })
  );

  const [minifigsState, setMinifigs] = useState<MinifigRow[]>(() =>
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

  const [partInspectorOpen, setPartInspectorOpen] = useState(false);
  const [selectedPartDetail, setSelectedPartDetail] = useState<PartColorRow | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageErr, setUploadImageErr] = useState<string | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);

  const canSave = useMemo(() => {
    return !!setNum.trim() && !!name.trim() && !submitting && !uploadingImage;
  }, [setNum, name, submitting, uploadingImage]);

  const selectedCatalog = useMemo(() => {
    return catalogItems.find((item) => item.id === catalogId) ?? null;
  }, [catalogId, catalogItems]);

  const totalPartQty = useMemo(() => {
    return parts.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [parts]);

  const totalMinifigQty = useMemo(() => {
    return minifigsState.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [minifigsState]);

  const totalPartCost = useMemo(() => {
    return parts.reduce((sum, row) => sum + parsePrice(row._unitCost) * (Number(row.quantity) || 0), 0);
  }, [parts]);

  const totalPartSaleValue = useMemo(() => {
    return parts.reduce(
      (sum, row) => sum + parsePrice(row._unitSellPrice) * (Number(row.quantity) || 0),
      0
    );
  }, [parts]);

  const linkedSetPrice = useMemo(() => {
    return parsePrice(
      selectedCatalog?.base_price_override ??
        catalogPreview?.meta?.current_price ??
        initialValues?.catalog_item?.base_price_override
    );
  }, [selectedCatalog, catalogPreview, initialValues?.catalog_item?.base_price_override]);

  const grossSpread = totalPartSaleValue - totalPartCost;

  const uncostedPartRows = useMemo(() => {
    return parts.filter((row) => parsePrice(row._unitCost) <= 0).length;
  }, [parts]);

  const unsoldPartRows = useMemo(() => {
    return parts.filter((row) => parsePrice(row._unitSellPrice) <= 0).length;
  }, [parts]);

  const groupedParts = useMemo(() => {
    const sorted = [...parts].sort((a, b) => {
      const bagCompare = (a.bag_number || "").localeCompare(b.bag_number || "", undefined, {
        numeric: true,
      });
      if (bagCompare !== 0) return bagCompare;

      const stepA = a.step_number ?? Number.MAX_SAFE_INTEGER;
      const stepB = b.step_number ?? Number.MAX_SAFE_INTEGER;
      if (stepA !== stepB) return stepA - stepB;

      const pageA = a.instruction_page ?? Number.MAX_SAFE_INTEGER;
      const pageB = b.instruction_page ?? Number.MAX_SAFE_INTEGER;
      if (pageA !== pageB) return pageA - pageB;

      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    return sorted.reduce<Array<{ bag: string; rows: PartRow[] }>>((acc, row) => {
      const key = bagLabel(row.bag_number);
      const existing = acc.find((group) => group.bag === key);
      if (existing) {
        existing.rows.push(row);
      } else {
        acc.push({ bag: key, rows: [row] });
      }
      return acc;
    }, []);
  }, [parts]);

  const [openBags, setOpenBags] = useState<Record<string, boolean>>({});

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

  function openPartInspector(row: PartRow) {
    const detail = row._partColorDetail ?? partColors.find((part) => part.id === row.part_color_id) ?? null;
    if (!detail) return;
    setSelectedPartDetail(detail);
    setPartInspectorOpen(true);
  }

  function handleCatalogPick(item: LibraryPickerResult) {
    if (item.type !== "catalog") return;
    setCatalogId(item.id);
    setCatalogPreview(item);
    setCatalogPickerOpen(false);
  }

  function handlePartPick(item: LibraryPickerResult) {
    if (item.type !== "part_color") return;

    const detail = partColors.find((part) => part.id === item.id) ?? null;

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
        _imageUrl: item.image_url ?? getPartImage(detail),
        _partColorDetail: detail,
        _unitCost:
          getPartUnitCost(detail) ||
          (getLowestPrice(item.meta?.current_cost) ?? getFirstPrice(item.meta?.current_cost) ?? 0),
        _unitSellPrice:
          getPartUnitSellPrice(detail) ||
          (getFirstPrice(item.meta?.current_price) ?? 0),
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
        const bagCompare = (a.bag_number || "").localeCompare(b.bag_number || "", undefined, {
          numeric: true,
        });
        if (bagCompare !== 0) return bagCompare;

        const stepA = a.step_number ?? Number.MAX_SAFE_INTEGER;
        const stepB = b.step_number ?? Number.MAX_SAFE_INTEGER;
        if (stepA !== stepB) return stepA - stepB;

        const pageA = a.instruction_page ?? Number.MAX_SAFE_INTEGER;
        const pageB = b.instruction_page ?? Number.MAX_SAFE_INTEGER;
        if (pageA !== pageB) return pageA - pageB;

        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

    const payload: SetPayload = {
      set_num: setNum.trim(),
      name: name.trim(),
      image_url: imageUrl.trim() || undefined,
      official_piece_count: Number(pieceCount) || 0,
      year_released: yearReleased === "" ? null : Number(yearReleased),
      theme_id: themeId || null,
      catalog_item_id: catalogId || null,
      parts: orderedParts.map(({ _rowId, _label, _subtitle, _unitCost, _unitSellPrice, _imageUrl, _partColorDetail, ...p }, i) => ({
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
    <>
      <form onSubmit={submit} className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Set Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set identity, bag flow, lowest-source cost basis, and per-piece sale value.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
                <SummaryPill label="Part Rows" value={parts.length} />
                <SummaryPill label="Part Qty" value={totalPartQty} />
                <SummaryPill label="Cost Basis" value={asMoney(totalPartCost)} />
                <SummaryPill label="Piece Sale" value={asMoney(totalPartSaleValue)} />
                <SummaryPill label="Spread" value={asMoney(grossSpread)} />
                <SummaryPill label="Linked Set Price" value={asMoney(linkedSetPrice)} />
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

              <Field label="Release Year" className="lg:col-span-2">
                <TextInput
                  type="number"
                  value={yearReleased}
                  onChange={(e) => setYearReleased(e.target.value ? Number(e.target.value) : "")}
                  placeholder="2024"
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
                      subtitle={`${catalogPreview.subtitle || ""} • linked set price ${asMoney(
                        parsePrice(catalogPreview.meta?.current_price)
                      )}`}
                      onClear={() => {
                        setCatalogId("");
                        setCatalogPreview(null);
                      }}
                    />
                  ) : (
                    <EmptyState text="No catalog item linked yet." />
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      onClick={() => setCatalogPickerOpen((v) => !v)}
                    >
                      {catalogPickerOpen ? "Close Search" : catalogPreview ? "Change Catalog" : "Search Catalog"}
                    </button>

                    <button
                      type="button"
                      onClick={() => imageFileRef.current?.click()}
                      disabled={!!submitting || uploadingImage}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingImage ? "Uploading..." : "Upload Image"}
                    </button>

                    {imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        disabled={!!submitting || uploadingImage}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Clear Image
                      </button>
                    ) : null}
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">Build Economics</label>
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <MiniStat label="Lowest-Source Cost Basis" value={asMoney(totalPartCost)} />
                  <MiniStat label="Piece Sale Value" value={asMoney(totalPartSaleValue)} />
                  <MiniStat label="Gross Spread" value={asMoney(grossSpread)} />
                  <MiniStat label="Linked Set Price" value={asMoney(linkedSetPrice)} />
                  <MiniStat label="Missing Cost Rows" value={String(uncostedPartRows)} tone={uncostedPartRows > 0 ? "warn" : "default"} />
                  <MiniStat label="Missing Sale Rows" value={String(unsoldPartRows)} tone={unsoldPartRows > 0 ? "warn" : "default"} />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Preview</label>
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={name || "Set preview"}
                      className="max-h-44 rounded-xl object-contain"
                    />
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
                Compact part rows grouped by bag and sorted by step number.
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

            {uncostedPartRows > 0 || unsoldPartRows > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {uncostedPartRows > 0
                  ? `${uncostedPartRows} part row(s) are missing cost basis. `
                  : ""}
                {unsoldPartRows > 0
                  ? `${unsoldPartRows} part row(s) are missing sell pricing.`
                  : ""}
              </div>
            ) : null}

            {groupedParts.length === 0 ? (
              <EmptyState text="No parts added yet." />
            ) : (
              groupedParts.map((group) => {
                const bagCostTotal = group.rows.reduce(
                  (sum, row) => sum + parsePrice(row._unitCost) * (Number(row.quantity) || 0),
                  0
                );
                const bagSaleTotal = group.rows.reduce(
                  (sum, row) => sum + parsePrice(row._unitSellPrice) * (Number(row.quantity) || 0),
                  0
                );

                const isOpen = !!openBags[group.bag];

                return (
                  <div key={group.bag} className="overflow-hidden rounded-3xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Bag {group.bag}</div>
                        <div className="text-xs text-slate-500">{group.rows.length} rows</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MiniPill label="Bag Cost" value={asMoney(bagCostTotal)} />
                        <MiniPill label="Bag Sale" value={asMoney(bagSaleTotal)} />
                        <MiniPill
                          label="Bag Qty"
                          value={String(group.rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0))}
                        />
                        <button
                          type="button"
                          onClick={() => setOpenBags((prev) => ({ ...prev, [group.bag]: !isOpen }))}
                          className="ml-2 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {isOpen ? "Collapse" : "Expand"}
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="divide-y divide-slate-100">
                        {group.rows.map((row) => {
                        const lineCost = parsePrice(row._unitCost) * (Number(row.quantity) || 0);
                        const lineSale = parsePrice(row._unitSellPrice) * (Number(row.quantity) || 0);
                        const lineSpread = lineSale - lineCost;

                        return (
                          <div
                            key={row._rowId}
                            className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(280px,2.5fr)_72px_82px_82px_82px_116px_minmax(170px,1.3fr)_auto]"
                          >
                            <button
                              type="button"
                              onClick={() => openPartInspector(row)}
                              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
                            >
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                {row._imageUrl ? (
                                  <img
                                    src={row._imageUrl}
                                    alt={row._label || "Part"}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <div className="text-[10px] font-bold text-slate-400">No Image</div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-slate-900 group-hover:text-slate-700">
                                  {row._label || "Unselected part"}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {row._subtitle || "Choose a part color"}
                                </div>
                                <div className="mt-1 text-xs font-medium text-slate-400">
                                  Cost {asMoney(row._unitCost)} • Sell {asMoney(row._unitSellPrice)} • Spread {asMoney(lineSpread)}
                                </div>
                                <div className="mt-1 text-xs font-medium text-slate-400">
                                  Line cost {asMoney(lineCost)} • Line sale {asMoney(lineSale)} • click for pricing and inventory
                                </div>
                              </div>
                            </button>

                            <FieldLite label="Qty">
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
                            </FieldLite>

                            <FieldLite label="Bag">
                              <TextInput
                                value={row.bag_number}
                                onChange={(e) => updatePart(row._rowId, { bag_number: e.target.value })}
                                placeholder="Bag"
                              />
                            </FieldLite>

                            <FieldLite label="Step">
                              <TextInput
                                type="number"
                                value={row.step_number ?? ""}
                                onChange={(e) =>
                                  updatePart(row._rowId, {
                                    step_number: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                placeholder="Step"
                              />
                            </FieldLite>

                            <FieldLite label="Page">
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
                            </FieldLite>

                            <FieldLite label="Match">
                              <SelectInput
                                value={row.color_match_mode}
                                onChange={(e) =>
                                  updatePart(row._rowId, {
                                    color_match_mode: e.target.value as ColorMatchMode,
                                  })
                                }
                              >
                                <option value="exact">Exact</option>
                                <option value="any_color">Any Color</option>
                              </SelectInput>
                            </FieldLite>

                            <FieldLite label="Notes">
                              <TextInput
                                value={row.notes}
                                onChange={(e) => updatePart(row._rowId, { notes: e.target.value })}
                                placeholder="Optional notes"
                              />
                            </FieldLite>

                            <div className="flex flex-wrap items-end gap-2 xl:justify-end">
                              <ToggleChip
                                label="Visible"
                                checked={row.is_visible}
                                onChange={(checked) => updatePart(row._rowId, { is_visible: checked })}
                              />
                              <ToggleChip
                                label="Structural"
                                checked={row.is_structural}
                                onChange={(checked) => updatePart(row._rowId, { is_structural: checked })}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPartPickerOpen(true);
                                  removePart(row._rowId);
                                }}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => removePart(row._rowId)}
                                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Minifigs</h3>
              <p className="mt-1 text-sm text-slate-500">
                Search across {minifigs.length} minifigs and keep the add flow lightweight.
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
                  <div
                    key={row._rowId}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(220px,2fr)_76px_90px_minmax(180px,1.2fr)_auto]"
                  >
                    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {row._label || "Unselected minifig"}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {row._subtitle || "Choose a minifig"}
                      </div>
                    </div>

                    <FieldLite label="Qty">
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
                    </FieldLite>

                    <FieldLite label="Bag">
                      <TextInput
                        value={row.bag_number}
                        onChange={(e) => updateMinifig(row._rowId, { bag_number: e.target.value })}
                        placeholder="Bag"
                      />
                    </FieldLite>

                    <FieldLite label="Notes">
                      <TextInput
                        value={row.notes}
                        onChange={(e) => updateMinifig(row._rowId, { notes: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </FieldLite>

                    <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                      <ToggleChip
                        label="Required"
                        checked={row.is_required}
                        onChange={(checked) => updateMinifig(row._rowId, { is_required: checked })}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMinifigPickerOpen(true);
                          removeMinifig(row._rowId);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMinifig(row._rowId)}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
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
              <span className="font-semibold text-slate-900">{totalPartQty}</span> total parts •{" "}
              <span className="font-semibold text-slate-900">{asMoney(totalPartCost)}</span> cost basis •{" "}
              <span className="font-semibold text-slate-900">{asMoney(totalPartSaleValue)}</span> piece sale value
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

      <DrawerShell
        open={partInspectorOpen}
        title={selectedPartDetail?.part?.name || "Part detail"}
        onClose={() => {
          setPartInspectorOpen(false);
          setSelectedPartDetail(null);
        }}
        width={1280}
      >
        <PartColorDetailDrawer
          row={selectedPartDetail}
          allRows={partColors}
          onSelectRow={(next) => setSelectedPartDetail(next)}
          onUpdated={() => {}}
        />
      </DrawerShell>
    </>
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

function FieldLite({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
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

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2",
        tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function MiniPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
      {label}: {value}
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

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
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
