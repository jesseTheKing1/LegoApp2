import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";
import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme } from "../../../types/minifig";
import type { Minifig, MinifigPayload } from "../../../types/minifig";

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

export function MinifigForm({
  themes,
  catalogItems,
  initialValues,
  submitting,
  onSubmit,
}: {
  themes: Theme[];
  catalogItems: CatalogItemMini[];
  initialValues?: Partial<Minifig>;
  submitting?: boolean;
  onSubmit: (payload: MinifigPayload) => Promise<void> | void;
}) {
  const initialThemeId = (initialValues as any)?.theme_id ?? initialValues?.theme?.id ?? "";

  const [themeId, setThemeId] = useState<number | "">(initialThemeId || "");
  const [bricklinkId, setBricklinkId] = useState(initialValues?.bricklink_id ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");

  // pricing
  const initialCatalogId =
    (initialValues as any)?.catalog_item_id ??
    (initialValues as any)?.catalog_item?.id ??
    "";
  const [catalogId, setCatalogId] = useState<number | "">(initialCatalogId || "");

  const [createCatalog, setCreateCatalog] = useState(false);
  const [basePrice, setBasePrice] = useState<string>(
    initialValues?.catalog_item?.base_price_override != null
      ? String(initialValues.catalog_item.base_price_override)
      : ""
  );

  // upload
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const theme = useMemo(
    () => themes.find((t) => t.id === Number(themeId)) ?? null,
    [themes, themeId]
  );

  const canSave = useMemo(() => {
    return (
      !!bricklinkId.trim() &&
      !!name.trim() &&
      !!themeId &&
      !submitting &&
      !uploading
    );
  }, [bricklinkId, name, themeId, submitting, uploading]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!themeId) return;

    // if creating catalog item, ignore catalogId (we’re making a new one)
    const payload: MinifigPayload = {
      bricklink_id: bricklinkId.trim(),
      name: name.trim(),
      theme_id: Number(themeId),
      image_url: imageUrl.trim() || undefined,
    };

    if (createCatalog) {
      payload.create_catalog_item = true;
      payload.base_price_override = basePrice.trim() === "" ? null : basePrice.trim();
      payload.catalog_item_id = null;
    } else {
      payload.catalog_item_id = catalogId === "" ? null : Number(catalogId);
      // optional: if they typed a price while attached, we can push it too
      if (basePrice.trim() !== "") payload.base_price_override = basePrice.trim();
    }

    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className={labelText}>Theme</div>
              <select
                className={selectBase}
                value={themeId}
                onChange={(e) => setThemeId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select theme…</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className={labelText}>BrickLink ID</div>
              <input
                className={inputBase}
                value={bricklinkId}
                onChange={(e) => setBricklinkId(e.target.value)}
                placeholder="sw1234"
                autoComplete="off"
              />
            </label>
          </div>

          <label className="space-y-1">
            <div className={labelText}>Name</div>
            <input
              className={inputBase}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Batman"
              autoComplete="off"
            />
          </label>

          {/* image */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-xs font-medium text-slate-600">Image</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                autoComplete="off"
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
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
                onClick={() => setImageUrl("")}
                disabled={!imageUrl || uploading}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm",
                  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                Clear
              </button>
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
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {uploadErr}
              </div>
            ) : null}

            <div className="mt-3">
              {imageUrl ? (
                <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* pricing */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Pricing
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <input
                type="checkbox"
                checked={createCatalog}
                onChange={(e) => setCreateCatalog(e.target.checked)}
              />
              Create a pricing record (CatalogItem) now
            </label>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <div className={labelText}>Base price override</div>
                <input
                  className={inputBase}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="4.50"
                  inputMode="decimal"
                />
              </label>

              {!createCatalog ? (
                <label className="space-y-1">
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
                <div className="text-xs text-slate-600 font-semibold">
                  A CatalogItem will be created with SKU like <span className="font-black">MINIFIG-{bricklinkId || "ID"}</span>
                </div>
              )}
            </div>

            {theme ? (
              <div className="mt-3 text-xs text-slate-600 font-semibold">
                Theme: <span className="text-slate-900 font-black">{theme.name}</span>
              </div>
            ) : null}
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
