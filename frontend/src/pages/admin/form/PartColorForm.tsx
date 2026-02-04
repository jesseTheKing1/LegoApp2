import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";
import type { Color } from "../../../types/color";
import type { Part } from "../../../types/part";
import type { CatalogItemMini } from "../../../types/catalog";
import type { PartColorRow } from "../../../types/partColor";

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

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

const selectBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

const labelText = "text-xs font-medium text-slate-600";

export function PartColorForm({
  parts,
  colors,
  catalogItems,
  initialValues,
  submitting,
  onSubmit,
}: {
  parts: Part[];
  colors: Color[];
  catalogItems?: CatalogItemMini[]; // optional so you can reuse form elsewhere
  initialValues?: Partial<PartColorRow>;
  submitting?: boolean;
  onSubmit: (payload: {
    part_id: number;
    color_id: number;
    part_color_code: string;
    variant?: string;
    description?: string;
    image_url_1?: string;
    image_url_2?: string;
    catalog_item_id?: number | null;
  }) => Promise<void> | void;
}) {
  const initialPartId = (initialValues as any)?.part_id ?? initialValues?.part?.id ?? "";
  const initialColorId = (initialValues as any)?.color_id ?? initialValues?.color?.id ?? "";
  const initialCatalogId =
    (initialValues as any)?.catalog_item_id ??
    (initialValues as any)?.catalog_item?.id ??
    "";

  const [partId, setPartId] = useState<number | "">(initialPartId || "");
  const [colorId, setColorId] = useState<number | "">(initialColorId || "");
  const [catalogId, setCatalogId] = useState<number | "">(initialCatalogId || "");

  const [code, setCode] = useState(initialValues?.part_color_code ?? "");
  const [variant, setVariant] = useState(initialValues?.variant ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [img1, setImg1] = useState(initialValues?.image_url_1 ?? "");
  const [img2, setImg2] = useState(initialValues?.image_url_2 ?? "");

  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);

  const [uploadErr1, setUploadErr1] = useState<string | null>(null);
  const [uploadErr2, setUploadErr2] = useState<string | null>(null);

  const fileRef1 = useRef<HTMLInputElement | null>(null);
  const fileRef2 = useRef<HTMLInputElement | null>(null);

  const part = useMemo(() => parts.find((p) => p.id === Number(partId)) ?? null, [parts, partId]);
  const color = useMemo(() => colors.find((c) => c.id === Number(colorId)) ?? null, [colors, colorId]);

  const swatchHex = safeHex(color?.hex ?? null) ?? "#e5e7eb";

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className={labelText}>Part</div>
              <select
                className={selectBase}
                value={partId}
                onChange={(e) => setPartId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select part…</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.part_id} — {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className={labelText}>Color</div>
              <select
                className={selectBase}
                value={colorId}
                onChange={(e) => setColorId(e.target.value ? Number(e.target.value) : "")}
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

          {/* optional catalog attach */}
          {catalogItems ? (
            <label className="space-y-1">
              <div className={labelText}>Catalog Item (pricing)</div>
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
              <div className="text-[11px] text-slate-500 font-semibold">
                You can attach an existing pricing record here, or create one from the detail drawer.
              </div>
            </label>
          ) : null}

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="h-8 w-8 rounded-xl border border-slate-200 shadow-sm" style={{ background: swatchHex }} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {part ? `${part.part_id} — ${part.name}` : "No part selected"}
              </div>
              <div className="truncate text-xs text-slate-600">{color ? color.name : "No color selected"}</div>
            </div>
          </div>

          <label className="space-y-1">
            <div className={labelText}>Your PartColor ID</div>
            <input
              className={inputBase}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="3001-black-plain"
              autoComplete="off"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className={labelText}>Variant</div>
              <input
                className={inputBase}
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="printed / pearl / etc."
                autoComplete="off"
              />
            </label>

            <label className="space-y-1">
              <div className={labelText}>Description</div>
              <input
                className={inputBase}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional notes"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageField
              title="Image URL 1"
              url={img1}
              setUrl={setImg1}
              uploading={uploading1}
              error={uploadErr1}
              onPickClick={() => fileRef1.current?.click()}
              onClear={() => setImg1("")}
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
}: {
  title: string;
  url: string;
  setUrl: (v: string) => void;
  uploading: boolean;
  error: string | null;
  onPickClick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 text-xs font-medium text-slate-600">{title}</div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          autoComplete="off"
        />

        <button
          type="button"
          onClick={onPickClick}
          disabled={uploading}
          className={[
            "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm",
            "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!url || uploading}
          className={[
            "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm",
            "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          Clear
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
