import React, { useMemo, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";
import "../admin-ui.css"; // ideally import once in AdminLayout instead

export type Part = {
  id: number;
  part_id: string;
  name: string;
  general_category: string;
  specific_category: string;
  actual_category: string;
  image_url?: string;
};

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

export function PartForm({
  initialValues,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<Part>;
  submitting?: boolean;
  onSubmit: (payload: {
    part_id: string;
    name: string;
    general_category: string;
    specific_category: string;
    actual_category: string;
    image_url?: string;
  }) => Promise<void> | void;
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

  async function onPickFile(file: File, clearInput: () => void) {
    setErr(null);

    const vErr = validateFile(file);
    if (vErr) {
      setErr(vErr);
      clearInput();
      return;
    }

    setUploading(true);
    try {
      const res = await uploadImageToR2(file);
      setImageUrl(res.public_url);
    } catch (e: any) {
      setErr(formatErr(e));
    } finally {
      setUploading(false);
      clearInput();
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
      image_url: imageUrl.trim() || undefined,
    };

    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="adminForm">
      {err ? <div className="adminErr">{err}</div> : null}

      <label className="adminField">
        <div className="adminLabel">Part ID</div>
        <input
          className="adminInput"
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          placeholder="3001"
          autoComplete="off"
        />
      </label>

      <label className="adminField">
        <div className="adminLabel">Name</div>
        <input
          className="adminInput"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brick 2 x 4"
          autoComplete="off"
        />
      </label>

      <div className="adminGrid2">
        <label className="adminField">
          <div className="adminLabel">General category</div>
          <input
            className="adminInput"
            value={general}
            onChange={(e) => setGeneral(e.target.value)}
            placeholder="e.g. Bricks"
            autoComplete="off"
          />
        </label>

        <label className="adminField">
          <div className="adminLabel">Specific category</div>
          <input
            className="adminInput"
            value={specific}
            onChange={(e) => setSpecific(e.target.value)}
            placeholder="e.g. Rectangular"
            autoComplete="off"
          />
        </label>
      </div>

      <label className="adminField">
        <div className="adminLabel">Actual category (shape family)</div>
        <input
          className="adminInput"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="brick"
          autoComplete="off"
        />
      </label>

      <div className="adminImageField">
        <div className="adminLabel">Image</div>

        <div className="adminRowInline">
          <input
            className="adminInput"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            autoComplete="off"
          />

          <label
            className="adminBtn adminBtnSoft"
            style={{ opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                const clear = () => {
                  e.currentTarget.value = "";
                };
                if (f) onPickFile(f, clear);
                else clear();
              }}
            />
          </label>

          {imageUrl ? (
            <button type="button" className="adminBtn" onClick={() => setImageUrl("")} disabled={uploading}>
              Clear
            </button>
          ) : null}
        </div>

        {imageUrl ? (
          <div className="adminHero">
            <img
              src={imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={() => setErr("Image preview failed to load. Check the URL.")}
            />
          </div>
        ) : (
          <div className="adminThumbEmpty">No image</div>
        )}
      </div>

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
