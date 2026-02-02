import React, { useMemo, useState } from "react";

export type Color = {
  id?: number;
  lego_id: number | null;
  name: string;
  hex: string; // "#RRGGBB" or ""
  is_transparent: boolean;
  is_metallic: boolean;
};

function safeHex(hex?: string | null) {
  if (!hex) return "";
  const h = String(hex).trim();
  if (!h) return "";
  return h.startsWith("#") ? h : `#${h}`;
}

function normalizeHexInput(v: string) {
  const s = v.trim();
  if (!s) return "";
  const withHash = s.startsWith("#") ? s : `#${s}`;
  return withHash.toUpperCase();
}

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}

function toIntOrNullDigits(digits: string): number | null {
  const cleaned = digitsOnly(digits).trim();
  if (cleaned === "") return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

export function ColorForm({
  initialValues,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<Color>;
  submitting?: boolean;
  onSubmit: (payload: {
    name: string;
    lego_id: number | null;
    hex: string;
    is_transparent: boolean;
    is_metallic: boolean;
  }) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [legoId, setLegoId] = useState(() => {
    const v = initialValues?.lego_id;
    return v == null ? "" : String(v);
  });
  const [hex, setHex] = useState(initialValues?.hex ?? "");
  const [isTransparent, setIsTransparent] = useState(!!initialValues?.is_transparent);
  const [isMetallic, setIsMetallic] = useState(!!initialValues?.is_metallic);

  const previewHex = safeHex(hex) || "#E5E7EB";
  const canSave = useMemo(() => !!name.trim() && !submitting, [name, submitting]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      lego_id: toIntOrNullDigits(legoId),
      hex: safeHex(hex),
      is_transparent: isTransparent,
      is_metallic: isMetallic,
    };
    await onSubmit(payload);
  }

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
    "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Top row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Name</div>
              <input
                className={inputBase}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bright Red"
                autoComplete="off"
              />
            </label>

            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Swatch</div>
              <div
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                title={previewHex}
              >
                <div
                  className="h-7 w-7 rounded-lg border border-slate-200 shadow-sm"
                  style={{ background: previewHex }}
                />
                <div className="text-sm font-mono text-slate-700">{previewHex}</div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-xs font-medium text-slate-600">LEGO ID</div>
              <input
                className={inputBase}
                value={legoId}
                onChange={(e) => setLegoId(digitsOnly(e.target.value))}
                placeholder="(optional)"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
              />
              <div className="text-xs text-slate-500">
                Digits only. (We strip anything else automatically.)
              </div>
            </label>

            <label className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Hex</div>
              <div className="flex items-center gap-2">
                <input
                  className={`${inputBase} font-mono`}
                  value={hex}
                  onChange={(e) => setHex(normalizeHexInput(e.target.value))}
                  placeholder="#RRGGBB"
                  autoComplete="off"
                />
                <input
                  className="h-10 w-12 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  type="color"
                  value={safeHex(hex) || "#E5E7EB"}
                  onChange={(e) => setHex(e.target.value.toUpperCase())}
                  aria-label="Pick color"
                  title="Pick color"
                />
              </div>
            </label>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={isTransparent}
                onChange={(e) => setIsTransparent(e.target.checked)}
              />
              Transparent
            </label>

            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={isMetallic}
                onChange={(e) => setIsMetallic(e.target.checked)}
              />
              Metallic
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex">
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
