import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type { PartColor } from "../../../types/partColor";
import type {
  LegoSet,
  SetPayload,
  SetPartRequirementPayload,
  SetMinifigRequirementPayload,
} from "../../../types/set";

function formatErr(e: any) {
  return (
    e?.message ||
    e?.response?.data?.detail ||
    (typeof e?.response?.data === "string" ? e.response.data : null) ||
    "Upload failed"
  );
}

const inputBase =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition " +
  "placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70";

const selectBase =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition " +
  "focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70";

const labelText = "text-[11px] font-black uppercase tracking-[0.14em] text-slate-500";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

const softCard =
  "rounded-[24px] border border-slate-200/80 bg-slate-50/70 shadow-[0_8px_24px_rgba(15,23,42,0.04)]";

function partColorLabel(pc: PartColor) {
  const p = pc.part;
  const c = pc.color;

  return [
    p?.part_id ?? "PART",
    p?.name ?? "Unnamed Part",
    c?.name ?? "No Color",
    pc.variant ? `(${pc.variant})` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

function minifigLabel(mf: Minifig) {
  return [mf.bricklink_id ?? "MINIFIG", mf.name ?? "Unnamed Minifig"]
    .filter(Boolean)
    .join(" — ");
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
  partColors: PartColor[];
  minifigs: Minifig[];
  initialValues?: Partial<LegoSet>;
  submitting?: boolean;
  onSubmit: (payload: SetPayload) => Promise<void> | void;
}) {
  const initialThemeId =
    (initialValues as any)?.theme_id ?? initialValues?.theme?.id ?? "";

  const initialCatalogId =
    (initialValues as any)?.catalog_item_id ??
    (initialValues as any)?.catalog_item?.id ??
    "";

  const [themeId, setThemeId] = useState<number | "">(initialThemeId || "");
  const [catalogId, setCatalogId] = useState<number | "">(initialCatalogId || "");

  const [setNum, setSetNum] = useState(initialValues?.set_num ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [pieceCount, setPieceCount] = useState<number>(initialValues?.piece_count ?? 0);

  const [createCatalog, setCreateCatalog] = useState(false);
  const [basePrice, setBasePrice] = useState<string>(
    initialValues?.catalog_item?.base_price_override != null
      ? String(initialValues.catalog_item.base_price_override)
      : ""
  );

  const [partRequirements, setPartRequirements] = useState<SetPartRequirementPayload[]>(
    (initialValues?.part_requirements ?? []).map((row, idx) => ({
      part_color_id: row.part_color.id,
      quantity: row.quantity ?? 1,
      instruction_page: row.instruction_page ?? null,
      sort_order: row.sort_order ?? idx,
      is_visible: row.is_visible ?? true,
      is_structural: row.is_structural ?? false,
      is_exact_color_required: row.is_exact_color_required ?? true,
      is_required: row.is_required ?? true,
      notes: row.notes ?? "",
    }))
  );

  const [minifigRequirements, setMinifigRequirements] = useState<SetMinifigRequirementPayload[]>(
    (initialValues?.minifig_requirements ?? []).map((row, idx) => ({
      minifig_id: row.minifig.id,
      quantity: row.quantity ?? 1,
      sort_order: row.sort_order ?? idx,
      is_required: row.is_required ?? true,
      is_exact_required: row.is_exact_required ?? true,
      notes: row.notes ?? "",
    }))
  );

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const theme = useMemo(
    () => themes.find((t) => t.id === Number(themeId)) ?? null,
    [themes, themeId]
  );

  const canSave = useMemo(() => {
    return !!setNum.trim() && !!name.trim() && !submitting && !uploading;
  }, [setNum, name, submitting, uploading]);

  const stats = useMemo(() => {
    const partCount = partRequirements.length;
    const requiredParts = partRequirements.filter((x) => x.is_required).length;
    const visibleParts = partRequirements.filter((x) => x.is_visible).length;
    const minifigCount = minifigRequirements.length;

    return {
      partCount,
      requiredParts,
      visibleParts,
      minifigCount,
    };
  }, [partRequirements, minifigRequirements]);

  function validateFile(file: File) {
    if (!file.type?.startsWith("image/")) return "Please choose an image file.";
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) return "Image is too large (max 10 MB).";
    return null;
  }

  async function upload(file: File) {
    const err = validateFile(file);
    if (err) {
      setUploadErr(err);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploadErr(null);
    setUploading(true);
    try {
      const res = await uploadImageToR2(file);
      setImageUrl(res.public_url);
    } catch (e) {
      setUploadErr(formatErr(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addPartRequirement() {
    setPartRequirements((prev) => [
      ...prev,
      {
        part_color_id: 0,
        quantity: 1,
        instruction_page: null,
        sort_order: prev.length,
        is_visible: true,
        is_structural: false,
        is_exact_color_required: true,
        is_required: true,
        notes: "",
      },
    ]);
  }

  function patchPartRequirement(index: number, patch: Partial<SetPartRequirementPayload>) {
    setPartRequirements((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function removePartRequirement(index: number) {
    setPartRequirements((prev) => prev.filter((_, i) => i !== index));
  }

  function addMinifigRequirement() {
    setMinifigRequirements((prev) => [
      ...prev,
      {
        minifig_id: 0,
        quantity: 1,
        sort_order: prev.length,
        is_required: true,
        is_exact_required: true,
        notes: "",
      },
    ]);
  }

  function patchMinifigRequirement(index: number, patch: Partial<SetMinifigRequirementPayload>) {
    setMinifigRequirements((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function removeMinifigRequirement(index: number) {
    setMinifigRequirements((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const payload: SetPayload = {
      set_num: setNum.trim(),
      name: name.trim(),
      image_url: imageUrl.trim() || undefined,
      piece_count: Math.max(0, Number(pieceCount) || 0),
      theme_id: themeId === "" ? null : Number(themeId),

      part_requirements: partRequirements
        .filter((row) => !!row.part_color_id)
        .map((row, idx) => ({
          ...row,
          quantity: Math.max(1, Number(row.quantity) || 1),
          instruction_page:
            row.instruction_page == null || row.instruction_page === 0
              ? null
              : Math.max(1, Number(row.instruction_page) || 1),
          sort_order: Number.isFinite(row.sort_order) ? row.sort_order : idx,
        })),

      minifig_requirements: minifigRequirements
        .filter((row) => !!row.minifig_id)
        .map((row, idx) => ({
          ...row,
          quantity: Math.max(1, Number(row.quantity) || 1),
          sort_order: Number.isFinite(row.sort_order) ? row.sort_order : idx,
        })),
    };

    if (createCatalog) {
      payload.create_catalog_item = true;
      payload.base_price_override = basePrice.trim() === "" ? null : basePrice.trim();
      payload.catalog_item_id = null;
    } else {
      payload.catalog_item_id = catalogId === "" ? null : Number(catalogId);
      if (basePrice.trim() !== "") payload.base_price_override = basePrice.trim();
    }

    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className={shellCard}>
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Identity
              </div>
              <div className="mt-1 text-lg font-black text-slate-950">
                Set profile
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <div className={labelText}>Theme</div>
                  <select
                    className={selectBase}
                    value={themeId}
                    onChange={(e) => setThemeId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">No theme</option>
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <div className={labelText}>Set number</div>
                  <input
                    className={inputBase}
                    value={setNum}
                    onChange={(e) => setSetNum(e.target.value)}
                    placeholder="75337"
                    autoComplete="off"
                  />
                </label>
              </div>

              <label className="space-y-1.5">
                <div className={labelText}>Set name</div>
                <input
                  className={inputBase}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="AT-TE Walker"
                  autoComplete="off"
                />
              </label>

              <label className="space-y-1.5">
                <div className={labelText}>Piece count</div>
                <input
                  className={inputBase}
                  type="number"
                  min={0}
                  value={pieceCount}
                  onChange={(e) => setPieceCount(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>

              <div className={softCard}>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className={labelText}>Set image</div>
                      <div className="mt-1 text-sm font-semibold text-slate-700">
                        Upload or paste a hosted image URL
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploading ? "Uploading…" : "Upload image"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        disabled={!imageUrl || uploading}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <input
                      className={inputBase}
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      autoComplete="off"
                    />
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f);
                    }}
                  />

                  {uploadErr ? (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {uploadErr}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className={shellCard}>
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Structure
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-950">
                    Part requirements
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addPartRequirement}
                  className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  + Add part row
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Rows", value: stats.partCount },
                  { label: "Required", value: stats.requiredParts },
                  { label: "Visible", value: stats.visibleParts },
                  { label: "Minifigs", value: stats.minifigCount },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </div>
                    <div className="mt-1 text-lg font-black text-slate-950">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {partRequirements.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <div className="text-sm font-semibold text-slate-700">
                    No part requirements yet
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Add exact part-color rows and build rules for the set.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {partRequirements.map((row, index) => {
                    const selectedPc =
                      partColors.find((pc) => pc.id === row.part_color_id) ?? null;

                    return (
                      <div
                        key={index}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                      >
                        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-950">
                                Part Row {index + 1}
                              </div>
                              <div className="truncate text-xs font-semibold text-slate-500">
                                {selectedPc ? partColorLabel(selectedPc) : "No part color selected"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removePartRequirement(index)}
                              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                          <label className="space-y-1.5 lg:col-span-6">
                            <div className={labelText}>Part color</div>
                            <select
                              className={selectBase}
                              value={row.part_color_id || ""}
                              onChange={(e) =>
                                patchPartRequirement(index, {
                                  part_color_id: e.target.value ? Number(e.target.value) : 0,
                                })
                              }
                            >
                              <option value="">Select part color…</option>
                              {partColors.map((pc) => (
                                <option key={pc.id} value={pc.id}>
                                  {partColorLabel(pc)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1.5 lg:col-span-2">
                            <div className={labelText}>Qty</div>
                            <input
                              className={inputBase}
                              type="number"
                              min={1}
                              value={row.quantity}
                              onChange={(e) =>
                                patchPartRequirement(index, {
                                  quantity: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                            />
                          </label>

                          <label className="space-y-1.5 lg:col-span-2">
                            <div className={labelText}>Page</div>
                            <input
                              className={inputBase}
                              type="number"
                              min={1}
                              value={row.instruction_page ?? ""}
                              onChange={(e) =>
                                patchPartRequirement(index, {
                                  instruction_page: e.target.value
                                    ? Math.max(1, Number(e.target.value) || 1)
                                    : null,
                                })
                              }
                              placeholder="48"
                            />
                          </label>

                          <label className="space-y-1.5 lg:col-span-2">
                            <div className={labelText}>Sort</div>
                            <input
                              className={inputBase}
                              type="number"
                              min={0}
                              value={row.sort_order}
                              onChange={(e) =>
                                patchPartRequirement(index, {
                                  sort_order: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </label>

                          <label className="space-y-1.5 lg:col-span-3">
                            <div className={labelText}>Visible</div>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                              <input
                                type="checkbox"
                                checked={row.is_visible}
                                onChange={(e) =>
                                  patchPartRequirement(index, { is_visible: e.target.checked })
                                }
                              />
                              <span className="ml-3 text-sm font-semibold text-slate-800">
                                Visible in final build
                              </span>
                            </div>
                          </label>

                          <label className="space-y-1.5 lg:col-span-3">
                            <div className={labelText}>Structural</div>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                              <input
                                type="checkbox"
                                checked={row.is_structural}
                                onChange={(e) =>
                                  patchPartRequirement(index, { is_structural: e.target.checked })
                                }
                              />
                              <span className="ml-3 text-sm font-semibold text-slate-800">
                                Main structure
                              </span>
                            </div>
                          </label>

                          <label className="space-y-1.5 lg:col-span-3">
                            <div className={labelText}>Exact color</div>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                              <input
                                type="checkbox"
                                checked={row.is_exact_color_required}
                                onChange={(e) =>
                                  patchPartRequirement(index, {
                                    is_exact_color_required: e.target.checked,
                                  })
                                }
                              />
                              <span className="ml-3 text-sm font-semibold text-slate-800">
                                Must match exact color
                              </span>
                            </div>
                          </label>

                          <label className="space-y-1.5 lg:col-span-3">
                            <div className={labelText}>Required</div>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                              <input
                                type="checkbox"
                                checked={row.is_required}
                                onChange={(e) =>
                                  patchPartRequirement(index, { is_required: e.target.checked })
                                }
                              />
                              <span className="ml-3 text-sm font-semibold text-slate-800">
                                Required part
                              </span>
                            </div>
                          </label>

                          <label className="space-y-1.5 lg:col-span-12">
                            <div className={labelText}>Notes</div>
                            <input
                              className={inputBase}
                              value={row.notes ?? ""}
                              onChange={(e) =>
                                patchPartRequirement(index, { notes: e.target.value })
                              }
                              placeholder="Optional build note..."
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={shellCard}>
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Characters
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-950">
                    Minifigure requirements
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addMinifigRequirement}
                  className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  + Add minifig
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {minifigRequirements.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <div className="text-sm font-semibold text-slate-700">
                    No minifig requirements yet
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Add figures users may want exact, optional, or ignored later.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {minifigRequirements.map((row, index) => {
                    const selectedMf =
                      minifigs.find((mf) => mf.id === row.minifig_id) ?? null;

                    return (
                      <div
                        key={index}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                      >
                        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-950">
                                Minifig Row {index + 1}
                              </div>
                              <div className="truncate text-xs font-semibold text-slate-500">
                                {selectedMf ? minifigLabel(selectedMf) : "No minifig selected"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeMinifigRequirement(index)}
                              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                          <label className="space-y-1.5 lg:col-span-6">
                            <div className={labelText}>Minifig</div>
                            <select
                              className={selectBase}
                              value={row.minifig_id || ""}
                              onChange={(e) =>
                                patchMinifigRequirement(index, {
                                  minifig_id: e.target.value ? Number(e.target.value) : 0,
                                })
                              }
                            >
                              <option value="">Select minifig…</option>
                              {minifigs.map((mf) => (
                                <option key={mf.id} value={mf.id}>
                                  {minifigLabel(mf)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1.5 lg:col-span-2">
                            <div className={labelText}>Qty</div>
                            <input
                              className={inputBase}
                              type="number"
                              min={1}
                              value={row.quantity}
                              onChange={(e) =>
                                patchMinifigRequirement(index, {
                                  quantity: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                            />
                          </label>

                          <label className="space-y-1.5 lg:col-span-2">
                            <div className={labelText}>Sort</div>
                            <input
                              className={inputBase}
                              type="number"
                              min={0}
                              value={row.sort_order}
                              onChange={(e) =>
                                patchMinifigRequirement(index, {
                                  sort_order: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </label>

                          <label className="space-y-1.5 lg:col-span-2">
                            <div className={labelText}>Required</div>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                              <input
                                type="checkbox"
                                checked={row.is_required}
                                onChange={(e) =>
                                  patchMinifigRequirement(index, { is_required: e.target.checked })
                                }
                              />
                              <span className="ml-3 text-sm font-semibold text-slate-800">
                                Required
                              </span>
                            </div>
                          </label>

                          <label className="space-y-1.5 lg:col-span-4">
                            <div className={labelText}>Exact</div>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                              <input
                                type="checkbox"
                                checked={row.is_exact_required}
                                onChange={(e) =>
                                  patchMinifigRequirement(index, {
                                    is_exact_required: e.target.checked,
                                  })
                                }
                              />
                              <span className="ml-3 text-sm font-semibold text-slate-800">
                                Must be exact minifig
                              </span>
                            </div>
                          </label>

                          <label className="space-y-1.5 lg:col-span-8">
                            <div className={labelText}>Notes</div>
                            <input
                              className={inputBase}
                              value={row.notes ?? ""}
                              onChange={(e) =>
                                patchMinifigRequirement(index, { notes: e.target.value })
                              }
                              placeholder="Optional note..."
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={shellCard}>
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Preview
              </div>
              <div className="mt-1 text-lg font-black text-slate-950">
                Visual and product summary
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)]">
                <div className="aspect-square w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.95))] p-4">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-contain drop-shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-black text-slate-950">
                        {name.trim() || "Unnamed Set"}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {setNum.trim() || "No set number"}
                      </div>
                    </div>

                    {basePrice.trim() ? (
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800">
                        ${basePrice}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {theme?.name || "No theme"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {pieceCount || 0} pieces
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {stats.partCount} part rows
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {stats.minifigCount} minifigs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={shellCard}>
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Pricing
              </div>
              <div className="mt-1 text-lg font-black text-slate-950">
                Catalog link
              </div>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                <input
                  type="checkbox"
                  checked={createCatalog}
                  onChange={(e) => setCreateCatalog(e.target.checked)}
                />
                Create CatalogItem now
              </label>

              <label className="space-y-1.5">
                <div className={labelText}>Base price override</div>
                <input
                  className={inputBase}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="139.99"
                  inputMode="decimal"
                />
              </label>

              {!createCatalog ? (
                <label className="space-y-1.5">
                  <div className={labelText}>Attach existing CatalogItem</div>
                  <select
                    className={selectBase}
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">None</option>
                    {catalogItems.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.sku}
                        {ci.base_price_override != null ? ` — $${ci.base_price_override}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  A CatalogItem will be created with SKU like{" "}
                  <span className="font-black text-slate-950">
                    SET-{setNum || "NUMBER"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className={[
              "w-full rounded-[24px] px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition",
              "bg-slate-950 hover:bg-slate-800 active:bg-slate-950",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            {submitting ? "Saving set…" : "Save set"}
          </button>
        </div>
      </div>
    </form>
  );
}