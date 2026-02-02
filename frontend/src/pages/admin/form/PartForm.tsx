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

/** ---------- tiny tailwind style system ---------- */
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

const btnBase =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-slate-200 bg-white " +
  "text-slate-900 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed";

const btnSoft =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-slate-200 bg-slate-50 " +
  "text-slate-900 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-60 disabled:cursor-not-allowed";

const btnPrimary =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm bg-slate-900 text-white " +
  "hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed";

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

const labelText = "text-xs font-black text-slate-600";

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
    <form onSubmit={submit} className="space-y-3">
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* Part ID */}
      <label className="block space-y-1">
        <div className={labelText}>Part ID</div>
        <input
          className={inputBase}
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          placeholder="3001"
          autoComplete="off"
        />
      </label>

      {/* Name */}
      <label className="block space-y-1">
        <div className={labelText}>Name</div>
        <input
          className={inputBase}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brick 2 x 4"
          autoComplete="off"
        />
      </label>

      {/* General / Specific */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <div className={labelText}>General category</div>
          <input
            className={inputBase}
            value={general}
            onChange={(e) => setGeneral(e.target.value)}
            placeholder="e.g. Bricks"
            autoComplete="off"
          />
        </label>

        <label className="block space-y-1">
          <div className={labelText}>Specific category</div>
          <input
            className={inputBase}
            value={specific}
            onChange={(e) => setSpecific(e.target.value)}
            placeholder="e.g. Rectangular"
            autoComplete="off"
          />
        </label>
      </div>

      {/* Actual category */}
      <label className="block space-y-1">
        <div className={labelText}>Actual category (shape family)</div>
        <input
          className={inputBase}
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="brick"
          autoComplete="off"
        />
      </label>

      {/* Image */}
      <div className={cx(card, "p-4 space-y-2")}>
        <div className={labelText}>Image</div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className={cx(inputBase, "sm:flex-1")}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            autoComplete="off"
          />

          <label className={cx(btnSoft, "inline-flex items-center justify-center")} style={{ opacity: uploading ? 0.6 : 1 }}>
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
            <button
              type="button"
              className={btnBase}
              onClick={() => setImageUrl("")}
              disabled={uploading}
              title="Clear image URL"
            >
              Clear
            </button>
          ) : null}
        </div>

        {imageUrl ? (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden aspect-square flex items-center justify-center">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setErr("Image preview failed to load. Check the URL.")}
            />
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 font-semibold">
            No image
          </div>
        )}
      </div>

      {/* Save */}
      <button
        type="submit"
        className={cx(btnPrimary, "w-full sm:w-auto")}
        disabled={!canSave}
        style={{ opacity: canSave ? 1 : 0.55 }}
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
