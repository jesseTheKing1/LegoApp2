import React, { useRef, useState } from "react";
import { uploadImageToR2 } from "../../../lib/r2Uploads";
import type { Theme } from "../../../types/minifig";

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

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

const softCard =
  "rounded-[24px] border border-slate-200/80 bg-slate-50/70 shadow-[0_8px_24px_rgba(15,23,42,0.04)]";

const labelText = "text-[11px] font-black uppercase tracking-[0.14em] text-slate-500";

export type ThemePayload = {
  name: string;
  image_url?: string;
};

export function ThemeForm({
  initialValues,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<Theme>;
  submitting?: boolean;
  onSubmit: (payload: ThemePayload) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const canSave = !!name.trim() && !submitting && !uploading;

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
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      image_url: imageUrl.trim() || "",
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className={shellCard}>
          <div className="border-b border-slate-200/80 px-5 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Theme identity
            </div>
            <div className="mt-1 text-lg font-black text-slate-950">
              Theme profile
            </div>
          </div>

          <div className="p-5 space-y-4">
            <label className="space-y-1.5">
              <div className={labelText}>Theme name</div>
              <input
                className={inputBase}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Star Wars"
                autoComplete="off"
              />
            </label>

            <div className={softCard}>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className={labelText}>Theme image</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">
                      Upload a banner-style theme image or paste a hosted URL
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

        <div className="space-y-5">
          <div className={shellCard}>
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Preview
              </div>
              <div className="mt-1 text-lg font-black text-slate-950">
                Theme card preview
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="aspect-[4/3] bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)] p-4">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover rounded-[20px]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 bg-white px-4 py-4">
                  <div className="text-lg font-black text-slate-950">
                    {name.trim() || "Unnamed Theme"}
                  </div>
                </div>
              </div>
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
            {submitting ? "Saving theme…" : "Save theme"}
          </button>
        </div>
      </div>
    </form>
  );
}