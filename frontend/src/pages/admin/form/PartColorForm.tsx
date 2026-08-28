// src/pages/admin/form/PartColorForm.tsx
import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";

import type { Color } from "../../../types/color";
import type { Part } from "../../../types/part";
import type { CatalogItemMini } from "../../../types/catalog";
import type { PartColorRow } from "../../../types/partColor";

import { PartPicker } from "../components/PartPicker";
import { cx, inputBase, btnBase } from "../utils/ui";

type UploadField = "img1" | "img2";

function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
}

function formatErr(e: any) {
  return (
    e?.message ||
    e?.response?.data?.detail ||
    (typeof e?.response?.data === "string" ? e.response.data : null) ||
    "Upload failed"
  );
}

const selectBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

const labelText = "text-xs font-medium text-slate-600";

function normalize(s: unknown) {
  return String(s ?? "").trim();
}

function moneyLabel(ci: CatalogItemMini) {
  const v = (ci as any)?.base_price_override;
  if (v == null) return "";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "";
  return ` — $${n}`;
}

export function PartColorForm({
  parts,
  colors,
  catalogItems,
  partColors,
  initialValues,
  submitting,
  onSubmit,
}: {
  parts: Part[];
  colors: Color[];
  catalogItems?: CatalogItemMini[];
  partColors?: PartColorRow[];
  initialValues?: Partial<PartColorRow>;
  submitting?: boolean;
  onSubmit: (payload: {
    part_id: number;
    color_id: number;
    root_part_color_id?: number | null;
    part_color_code: string;
    variant?: string;
    description?: string;
    image_url_1?: string;
    image_url_2?: string;
    catalog_item_id?: number | null;
  }) => Promise<void> | void;
}) {
  // ---- initial ids (supports both nested read objects and write ids) ----
  const initialPartId = (initialValues as any)?.part_id ?? initialValues?.part?.id ?? "";
  const initialColorId = (initialValues as any)?.color_id ?? initialValues?.color?.id ?? "";
  const initialCatalogId = (initialValues as any)?.catalog_item_id ?? (initialValues as any)?.catalog_item?.id ?? "";
  const initialRootId =
    (initialValues as any)?.root_part_color_id ??
    (initialValues as any)?.root_part_color?.id ??
    "";

  // ---- form state ----
  const [partId, setPartId] = useState<number | "">(initialPartId || "");
  const [colorId, setColorId] = useState<number | "">(initialColorId || "");
  const [catalogId, setCatalogId] = useState<number | "">(initialCatalogId || "");
  const [rootId, setRootId] = useState<number | "">(initialRootId || "");
  const [rootSearch, setRootSearch] = useState("");

  const [code, setCode] = useState(normalize(initialValues?.part_color_code ?? ""));
  const [variant, setVariant] = useState(normalize((initialValues as any)?.variant ?? ""));
  const [description, setDescription] = useState(normalize(initialValues?.description ?? ""));

  const [img1, setImg1] = useState(normalize(initialValues?.image_url_1 ?? ""));
  const [img2, setImg2] = useState(normalize(initialValues?.image_url_2 ?? ""));

  // ---- upload state ----
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [uploadErr1, setUploadErr1] = useState<string | null>(null);
  const [uploadErr2, setUploadErr2] = useState<string | null>(null);

  const fileRef1 = useRef<HTMLInputElement | null>(null);
  const fileRef2 = useRef<HTMLInputElement | null>(null);

  // ---- lookups ----
  const part = useMemo(() => parts.find((p) => p.id === Number(partId)) ?? null, [parts, partId]);
  const color = useMemo(() => colors.find((c) => c.id === Number(colorId)) ?? null, [colors, colorId]);
  const swatchHex = safeHex((color as any)?.hex ?? null) ?? "#e5e7eb";
  const rootCandidates = useMemo(() => {
    const currentId = Number((initialValues as any)?.id || 0);
    const selectedColorId = Number(colorId || 0);

    return (partColors ?? [])
      .filter((pc) => pc.id !== currentId)
      .filter((pc) => !pc.root_part_color)
      .filter((pc) => !selectedColorId || pc.color?.id === selectedColorId)
      .sort((a, b) => {
        const ac = `${a.part?.part_id ?? ""} ${a.color?.name ?? ""} ${a.part_color_code ?? ""}`.toLowerCase();
        const bc = `${b.part?.part_id ?? ""} ${b.color?.name ?? ""} ${b.part_color_code ?? ""}`.toLowerCase();
        return ac.localeCompare(bc);
      });
  }, [partColors, initialValues, colorId]);
  const selectedRoot = useMemo(
    () => rootCandidates.find((pc) => pc.id === Number(rootId)) ?? null,
    [rootCandidates, rootId]
  );
  const filteredRootCandidates = useMemo(() => {
    const q = rootSearch.trim().toLowerCase();
    const source = rootCandidates.filter((pc) => pc.id !== Number(rootId));
    if (!q) return source.slice(0, 12);

    return source
      .filter((pc) => {
        const blob = [
          pc.part_color_code,
          pc.description,
          pc.variant,
          pc.part?.part_id,
          pc.part?.name,
          pc.part?.actual_category,
          pc.color?.name,
          pc.catalog_item?.sku,
          pc.effective_catalog_item?.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 12);
  }, [rootCandidates, rootId, rootSearch]);

  // ---- validations ----
  const canSave = useMemo(() => {
    return (
      !!code.trim() &&
      !!partId &&
      !!colorId &&
      !submitting &&
      !uploading1 &&
      !uploading2
    );
  }, [code, partId, colorId, submitting, uploading1, uploading2]);

  function resetFileInput(field: UploadField) {
    const ref = field === "img1" ? fileRef1.current : fileRef2.current;
    if (ref) ref.value = "";
  }

  function validateFile(file: File) {
    if (!file.type?.startsWith("image/")) return "Please choose an image file.";
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) return "Image is too large (max 10 MB).";
    return null;
  }

  async function uploadTo(field: UploadField, file: File) {
    const err = validateFile(file);
    if (err) {
      if (field === "img1") setUploadErr1(err);
      else setUploadErr2(err);
      resetFileInput(field);
      return;
    }

    if (field === "img1") {
      setUploadErr1(null);
      setUploading1(true);
    } else {
      setUploadErr2(null);
      setUploading2(true);
    }

    try {
      const res = await uploadImageToR2(file);
      if (field === "img1") setImg1(res.public_url);
      else setImg2(res.public_url);
    } catch (e) {
      const msg = formatErr(e);
      console.error("Upload error:", e);
      if (field === "img1") setUploadErr1(msg);
      else setUploadErr2(msg);
    } finally {
      if (field === "img1") setUploading1(false);
      else setUploading2(false);
      resetFileInput(field);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId || !colorId) return;

    await onSubmit({
      part_id: Number(partId),
      color_id: Number(colorId),
      root_part_color_id: rootId === "" ? null : Number(rootId),
      part_color_code: code.trim(),
      variant: variant.trim() || undefined,
      description: description.trim() || undefined,
      image_url_1: img1.trim() || undefined,
      image_url_2: img2.trim() || undefined,
      catalog_item_id: catalogId === "" ? null : Number(catalogId),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Part + Color */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className={labelText}>Part</div>
              <PartPicker
                parts={parts}
                value={partId}
                onChange={(v) => setPartId(v)}
                disabled={!!submitting}
                placeholder="Search part… (3001, brick, plate, category)"
              />
            </div>

            <label className="space-y-1">
              <div className={labelText}>Color</div>
              <select
                className={selectBase}
                value={colorId}
                onChange={(e) => {
                  const nextColorId = e.target.value ? Number(e.target.value) : "";
                  setColorId(nextColorId);
                  const chosenRoot = (partColors ?? []).find((pc) => pc.id === Number(rootId));
                  if (chosenRoot && nextColorId && chosenRoot.color?.id !== Number(nextColorId)) {
                    setRootId("");
                    setRootSearch("");
                  }
                }}
                disabled={!!submitting}
              >
                <option value="">Select color…</option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Catalog attach */}
          {catalogItems ? (
            <label className="space-y-1">
              <div className={labelText}>Catalog Item (pricing)</div>
              <select
                className={selectBase}
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value ? Number(e.target.value) : "")}
                disabled={!!submitting}
              >
                <option value="">None</option>
                {catalogItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.sku}
                    {moneyLabel(ci)}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 font-semibold">
                Attach an existing pricing record here, or create one from the detail drawer.
              </div>
            </label>
          ) : null}

          {partColors ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className={labelText}>Root PartColor / Variant Group</div>

              {selectedRoot ? (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                      Selected root
                    </div>
                    <div className="mt-1 truncate text-sm font-extrabold text-slate-900">
                      {selectedRoot.part?.part_id || "Part"} · {selectedRoot.color?.name || "Color"} · {selectedRoot.part_color_code}
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-slate-600">
                      {[selectedRoot.part?.name, selectedRoot.variant, selectedRoot.effective_catalog_item?.sku || selectedRoot.catalog_item?.sku ? `SKU ${selectedRoot.effective_catalog_item?.sku || selectedRoot.catalog_item?.sku}` : ""].filter(Boolean).join(" · ") || "Root PartColor"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={cx(btnBase, "shrink-0")}
                    disabled={!!submitting}
                    onClick={() => {
                      setRootId("");
                      setRootSearch("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                  This is currently a root / standalone PartColor.
                </div>
              )}

              <input
                className={inputBase}
                value={rootSearch}
                onChange={(e) => setRootSearch(e.target.value)}
                placeholder="Search root by part ID, name, color, code, variant, SKU…"
                autoComplete="off"
                disabled={!!submitting}
              />

              <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white">
                {filteredRootCandidates.length ? (
                  <div className="divide-y divide-slate-100">
                    {filteredRootCandidates.map((pc) => {
                      const sku = pc.effective_catalog_item?.sku || pc.catalog_item?.sku || "";
                      const img = pc.image_url_1 || pc.image_url_2 || pc.part?.image_url || "";

                      return (
                        <button
                          key={pc.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                          disabled={!!submitting}
                          onClick={() => {
                            setRootId(pc.id);
                            setRootSearch("");
                          }}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400">
                            {img ? <img src={img} alt="" className="h-full w-full object-contain" /> : "◇"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-extrabold text-slate-900">
                                {pc.part?.part_id || "Part"} · {pc.part_color_code}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                {pc.color?.name || "Color"}
                              </span>
                              {pc.variant ? (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                  {pc.variant}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {[pc.part?.name, pc.description, sku ? `SKU ${sku}` : ""].filter(Boolean).join(" · ") || "No extra details"}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
                            Use root
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm font-semibold text-slate-500">
                    No root matches. Try a part number, color, SKU, or code.
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-semibold">
                Pick a root when this row is an older/alternate ID for the same usable part-color.
                It will inherit the root price and count together in user inventory/build matching.
              </div>
            </div>
          ) : null}

          {/* Preview */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="h-8 w-8 rounded-xl border border-slate-200 shadow-sm" style={{ background: swatchHex }} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {part ? `${part.part_id} — ${part.name}` : "No part selected"}
              </div>
              <div className="truncate text-xs text-slate-600">{color ? color.name : "No color selected"}</div>
            </div>
          </div>

          {/* ID */}
          <label className="space-y-1">
            <div className={labelText}>Your PartColor ID</div>
            <input
              className={inputBase}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="3001-black-plain"
              autoComplete="off"
              disabled={!!submitting}
            />
            <div className="text-[11px] text-slate-500 font-semibold">
              Use a stable ID you can search later (ex: shape-color-variant).
            </div>
          </label>

          {/* Variant + Description */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className={labelText}>Variant</div>
              <input
                className={inputBase}
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="printed / pearl / etc."
                autoComplete="off"
                disabled={!!submitting}
              />
              <div className="text-[11px] text-slate-500 font-semibold">
                Optional. Leave blank for the “default” version of this color.
              </div>
            </label>

            <label className="space-y-1">
              <div className={labelText}>Description</div>
              <input
                className={inputBase}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional notes"
                autoComplete="off"
                disabled={!!submitting}
              />
            </label>
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageField
              title="Image URL 1"
              url={img1}
              setUrl={setImg1}
              uploading={uploading1}
              error={uploadErr1}
              onPickClick={() => fileRef1.current?.click()}
              onClear={() => setImg1("")}
              disabled={!!submitting}
            />
            <input
              ref={fileRef1}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadTo("img1", f);
              }}
            />

            <ImageField
              title="Image URL 2"
              url={img2}
              setUrl={setImg2}
              uploading={uploading2}
              error={uploadErr2}
              onPickClick={() => fileRef2.current?.click()}
              onClear={() => setImg2("")}
              disabled={!!submitting}
            />
            <input
              ref={fileRef2}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadTo("img2", f);
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-slate-500 font-semibold">
          {uploading1 || uploading2 ? "Uploading…" : " "}
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className={[
            "w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm",
            "bg-slate-900 hover:bg-slate-800 active:bg-slate-950",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "sm:w-auto sm:min-w-[180px]",
          ].join(" ")}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function ImageField({
  title,
  url,
  setUrl,
  uploading,
  error,
  onPickClick,
  onClear,
  disabled,
}: {
  title: string;
  url: string;
  setUrl: (v: string) => void;
  uploading: boolean;
  error: string | null;
  onPickClick: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-600">{title}</div>
        {url ? (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled || uploading}
            className={cx(btnBase, "h-8 px-3")}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={inputBase}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          autoComplete="off"
          disabled={disabled || uploading}
        />

        <button
          type="button"
          onClick={onPickClick}
          disabled={disabled || uploading}
          className={cx(
            "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm",
            "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {error ? (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-3">
        {url ? (
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={url}
              alt=""
              className="h-full w-full object-contain"
              onError={() => console.warn("Image preview failed to load:", url)}
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
            No image
          </div>
        )}
      </div>
    </div>
  );
}
