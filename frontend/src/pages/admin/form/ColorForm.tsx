import React, { useMemo, useState } from "react";
import "../admin-ui.css"; // or "../../pages/admin/admin-ui.css" depending on folder depth

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

  return (
    <form onSubmit={submit} className="adminForm">
      <div className="adminFormCard">
        {/* Top row */}
        <div className="adminGridTop">
          <label className="adminField">
            <div className="adminLabel">Name</div>
            <input
              className="adminInput"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bright Red"
              autoComplete="off"
            />
          </label>

          <div className="adminField">
            <div className="adminLabel">Swatch</div>
            <div className="adminSwatchWrap" title={previewHex}>
              <div className="adminSwatch" style={{ background: previewHex }} />
              <div className="adminSwatchText">{previewHex}</div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="adminGridBottom">
          <label className="adminField">
            <div className="adminLabel">LEGO ID</div>
            <input
              className="adminInput"
              value={legoId}
              onChange={(e) => setLegoId(digitsOnly(e.target.value))}
              placeholder="(optional)"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
            />
            <div className="adminHelp">Digits only. (We strip anything else automatically.)</div>
          </label>

          <label className="adminField">
            <div className="adminLabel">Hex</div>
            <div className="adminHexRow">
              <input
                className="adminInput adminInputMono"
                value={hex}
                onChange={(e) => setHex(normalizeHexInput(e.target.value))}
                placeholder="#RRGGBB"
                autoComplete="off"
              />
              <input
                className="adminColorPicker"
                type="color"
                value={safeHex(hex) || "#E5E7EB"}
                onChange={(e) => setHex(e.target.value.toUpperCase())}
                aria-label="Pick color"
                title="Pick color"
              />
            </div>
          </label>
        </div>

        <div className="adminCheckRow">
          <label className="adminCheckPill">
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={(e) => setIsTransparent(e.target.checked)}
            />
            Transparent
          </label>

          <label className="adminCheckPill">
            <input
              type="checkbox"
              checked={isMetallic}
              onChange={(e) => setIsMetallic(e.target.checked)}
            />
            Metallic
          </label>
        </div>
      </div>

      <div className="adminFormActions">
        <button
          type="submit"
          className={`adminBtn adminBtnPrimary adminBtnFullOnMobile`}
          disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.55 }}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
