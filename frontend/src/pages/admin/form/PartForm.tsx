import React, { useMemo, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";

export type Part = {
  id: number;
  part_id: string;
  name: string;
  general_category: string;
  specific_category: string;
  actual_category: string;
  image_url?: string;
};

export function PartForm({
  initialValues,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<Part>;
  submitting?: boolean;
  onSubmit: (payload: any) => Promise<void> | void;
}) {
  const [partId, setPartId] = useState(initialValues?.part_id ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [general, setGeneral] = useState(initialValues?.general_category ?? "");
  const [specific, setSpecific] = useState(initialValues?.specific_category ?? "");
  const [actual, setActual] = useState(initialValues?.actual_category ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return !!partId.trim() && !!name.trim() && !!actual.trim() && !submitting && !uploading;
  }, [partId, name, actual, submitting, uploading]);

  async function onPickFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const res = await uploadImageToR2(file);
      setImageUrl(res.public_url);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const payload = {
      part_id: partId.trim(),
      name: name.trim(),
      general_category: general.trim(),
      specific_category: specific.trim(),
      actual_category: actual.trim(),
      image_url: imageUrl.trim(),
    };

    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      {err ? (
        <div style={{ color: "crimson", fontSize: 12, fontWeight: 800 }}>{err}</div>
      ) : null}

      <label style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Part ID</div>
        <input
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          placeholder="3001"
          style={I.input}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brick 2 x 4" style={I.input} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900 }}>General category</div>
          <input value={general} onChange={(e) => setGeneral(e.target.value)} style={I.input} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900 }}>Specific category</div>
          <input value={specific} onChange={(e) => setSpecific(e.target.value)} style={I.input} />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Actual category (shape family)</div>
        <input value={actual} onChange={(e) => setActual(e.target.value)} placeholder="brick" style={I.input} />
      </label>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Image</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={{ ...I.input, flex: 1, minWidth: 240 }}
          />
          <label style={I.button}>
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {imageUrl ? (
          <div style={I.hero}>
            <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        ) : null}
      </div>

      <button disabled={!canSave} style={{ ...I.primaryBtn, opacity: canSave ? 1 : 0.5 }}>
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

const I: Record<string, React.CSSProperties> = {
  input: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
  },
  button: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  primaryBtn: {
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 950,
    cursor: "pointer",
  },
  hero: {
    width: "min(360px, 100%)",
    aspectRatio: "1 / 1",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#f8fafc",
    overflow: "hidden",
  },
};
