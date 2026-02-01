import React, { useMemo, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";
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

  part_id?: number;  // write-only in API (maps to part)
  color_id?: number; // write-only in API (maps to color)
};

function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
}

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
  onSubmit: (payload: any) => Promise<void> | void;
}) {
  const initialPartId = (initialValues as any)?.part_id ?? initialValues?.part?.id ?? "";
  const initialColorId = (initialValues as any)?.color_id ?? initialValues?.color?.id ?? "";

  const [partId, setPartId] = useState<number | "">(initialPartId || "");
  const [colorId, setColorId] = useState<number | "">(initialColorId || "");

  const [code, setCode] = useState(initialValues?.part_color_code ?? "");
  const [variant, setVariant] = useState(initialValues?.variant ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [img1, setImg1] = useState(initialValues?.image_url_1 ?? "");
  const [img2, setImg2] = useState(initialValues?.image_url_2 ?? "");

  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);

  const part = useMemo(() => parts.find((p) => p.id === Number(partId)) ?? null, [parts, partId]);
  const color = useMemo(() => colors.find((c) => c.id === Number(colorId)) ?? null, [colors, colorId]);

  const swatchHex = safeHex(color?.hex ?? null) ?? "#e5e7eb";

  const canSave = useMemo(() => {
    return !!code.trim() && !!partId && !!colorId && !submitting && !uploading1 && !uploading2;
  }, [code, partId, colorId, submitting, uploading1, uploading2]);

  async function uploadTo(field: "img1" | "img2", file: File) {
    if (field === "img1") setUploading1(true);
    else setUploading2(true);
    try {
      const res = await uploadImageToR2(file);
      if (field === "img1") setImg1(res.public_url);
      else setImg2(res.public_url);
    } finally {
      if (field === "img1") setUploading1(false);
      else setUploading2(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      part_id: Number(partId),
      color_id: Number(colorId),
      part_color_code: code.trim(),
      variant: variant.trim(),
      description: description.trim(),
      image_url_1: img1.trim(),
      image_url_2: img2.trim(),
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={S.label}>Part</div>
          <select value={partId} onChange={(e) => setPartId(e.target.value ? Number(e.target.value) : "")} style={S.input}>
            <option value="">Select part…</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.part_id} — {p.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={S.label}>Color</div>
          <select value={colorId} onChange={(e) => setColorId(e.target.value ? Number(e.target.value) : "")} style={S.input}>
            <option value="">Select color…</option>
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 18, height: 18, borderRadius: 6, background: swatchHex, border: "1px solid rgba(0,0,0,.12)" }} />
        <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 900 }}>
          {part ? `${part.part_id} — ${part.name}` : "No part"}{" "}
          <span style={{ color: "#64748b" }}>•</span>{" "}
          {color ? color.name : "No color"}
        </div>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <div style={S.label}>Your PartColor ID</div>
        <input value={code} onChange={(e) => setCode(e.target.value)} style={S.input} placeholder="3001-black-plain" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <div style={S.label}>Variant</div>
        <input value={variant} onChange={(e) => setVariant(e.target.value)} style={S.input} placeholder="printed / pearl / etc." />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <div style={S.label}>Description</div>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={S.input} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={S.label}>Image URL 1</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={img1} onChange={(e) => setImg1(e.target.value)} style={{ ...S.input, flex: 1 }} placeholder="https://..." />
            <label style={S.uploadBtn}>
              {uploading1 ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("img1", f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {img1 ? (
            <div style={S.thumbBox}>
              <img src={img1} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={S.label}>Image URL 2</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={img2} onChange={(e) => setImg2(e.target.value)} style={{ ...S.input, flex: 1 }} placeholder="https://..." />
            <label style={S.uploadBtn}>
              {uploading2 ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("img2", f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {img2 ? (
            <div style={S.thumbBox}>
              <img src={img2} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          ) : null}
        </div>
      </div>

      <button disabled={!canSave} style={{ ...S.primaryBtn, opacity: canSave ? 1 : 0.5 }}>
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

const S: Record<string, React.CSSProperties> = {
  label: { fontSize: 12, fontWeight: 900, color: "#0f172a" },
  input: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", fontSize: 14 },
  primaryBtn: { border: "1px solid #0f172a", background: "#0f172a", color: "white", borderRadius: 14, padding: "12px 14px", fontWeight: 950, cursor: "pointer" },
  uploadBtn: { border: "1px solid #e5e7eb", background: "white", borderRadius: 12, padding: "10px 12px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" },
  thumbBox: { width: "100%", aspectRatio: "1 / 1", borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc", overflow: "hidden" },
};
