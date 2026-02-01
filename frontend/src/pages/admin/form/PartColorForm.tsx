import React, { useMemo, useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";
import "../admin-ui.css"; // or import once globally in AdminLayout

export type Color = {
  id: number;
  name: string;
  hex?: string;
};

export type Part = {
  id: number;
  part_id: string;
  name: string;
  actual_category?: string;
};

export type PartColorRow = {
  id: number;
  part_color_code: string;
  variant?: string;
  description?: string;
  image_url_1?: string;
  image_url_2?: string;
  thumb_url?: string;

  part?: Part;
  color?: Color;

  part_id?: number; // write-only
  color_id?: number; // write-only
};

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

type UploadField = "img1" | "img2";

export function PartColorForm({
  parts,
  colors,
  initialValues,
  submitting,
  onSubmit,
}: {
  parts: Part[];
  colors: Color[];
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
  }) => Promise<void> | void;
}) {
  const initialPartId =
    (initialValues as any)?.part_id ?? initialValues?.part?.id ?? "";
  const initialColorId =
    (initialValues as any)?.color_id ?? initialValues?.color?.id ?? "";

  const [partId, setPartId] = useState<number | "">(initialPartId || "");
  const [colorId, setColorId] = useState<number | "">(initialColorId || "");

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

  const part = useMemo(
    () => parts.find((p) => p.id === Number(partId)) ?? null,
    [parts, partId]
  );
  const color = useMemo(
    () => colors.find((c) => c.id === Number(colorId)) ?? null,
    [colors, colorId]
  );

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
    });
  }

  return (
    <form onSubmit={submit} className="adminForm">
      {/* selectors */}
      <div className="adminGrid2">
        <label className="adminField">
          <div className="adminLabel">Part</div>
          <select
            className="adminSelect"
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

        <label className="adminField">
          <div className="adminLabel">Color</div>
          <select
            className="adminSelect"
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

      {/* summary */}
      <div className="adminSummaryRow">
        <div className="adminSwatchMini" style={{ background: swatchHex }} />
        <div className="adminSummaryText">
          <div className="adminSummaryStrong">
            {part ? `${part.part_id} — ${part.name}` : "No part selected"}
          </div>
          <div className="adminSummaryMuted">{color ? color.name : "No color selected"}</div>
        </div>
      </div>

      {/* text fields */}
      <label className="adminField">
        <div className="adminLabel">Your PartColor ID</div>
        <input
          className="adminInput"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="3001-black-plain"
          autoComplete="off"
        />
      </label>

      <label className="adminField">
        <div className="adminLabel">Variant</div>
        <input
          className="adminInput"
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          placeholder="printed / pearl / etc."
          autoComplete="off"
        />
      </label>

      <label className="adminField">
        <div className="adminLabel">Description</div>
        <input
          className="adminInput"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="optional notes"
          autoComplete="off"
        />
      </label>

      {/* images */}
      <div className="adminGrid2">
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

      {/* save */}
      <button
        type="submit"
        className="adminBtn adminBtnPrimary adminBtnFullOnMobile"
        disabled={!canSave}
        style={{ opacity: canSave ? 1 : 0.55 }}
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

/** ---------- image field subcomponent ---------- */

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
    <div className="adminImageField">
      <div className="adminLabel">{title}</div>

      <div className="adminRowInline">
        <input
          className="adminInput"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          autoComplete="off"
        />

        <button
          type="button"
          className="adminBtn adminBtnSoft"
          onClick={onPickClick}
          disabled={uploading}
          style={{ opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>

        <button
          type="button"
          className="adminBtn"
          onClick={onClear}
          disabled={!url || uploading}
          style={{ opacity: !url || uploading ? 0.6 : 1 }}
        >
          Clear
        </button>
      </div>

      {error ? <div className="adminErr">{error}</div> : null}

      {url ? (
        <div className="adminThumbBox">
          <img
            src={url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={() => console.warn("Image preview failed to load:", url)}
          />
        </div>
      ) : (
        <div className="adminThumbEmpty">No image</div>
      )}
    </div>
  );
}
