import React, { useMemo, useState } from "react";

export type Color = {
  id?: number;
  lego_id: number | null;
  name: string;
  hex: string; // "#RRGGBB"
  is_transparent: boolean;
  is_metallic: boolean;
};

function safeHex(hex?: string | null) {
  if (!hex) return "";
  const h = String(hex).trim();
  if (!h) return "";
  return h.startsWith("#") ? h : `#${h}`;
}

// Accepts "#RRGGBB" only (optional helper for better UX)
function normalizeHexInput(v: string) {
  const s = v.trim();
  if (!s) return "";
  const withHash = s.startsWith("#") ? s : `#${s}`;
  // allow partial typing; don't hard-reject mid-entry
  return withHash.toUpperCase();
}

export function ColorForm({
  initialValues,
  submitting,
  onSubmit,
}: {
  initialValues?: Partial<Color>;
  submitting?: boolean;
  onSubmit: (payload: any) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [legoId, setLegoId] = useState(
    initialValues?.lego_id == null ? "" : String(initialValues?.lego_id)
  );
  const [hex, setHex] = useState(initialValues?.hex ?? "");
  const [isTransparent, setIsTransparent] = useState(
    !!initialValues?.is_transparent
  );
  const [isMetallic, setIsMetallic] = useState(!!initialValues?.is_metallic);

  const previewHex = safeHex(hex) || "#E5E7EB";

  const canSave = useMemo(() => {
    return !!name.trim() && !submitting;
  }, [name, submitting]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const legoIdNum =
      legoId.trim() === ""
        ? null
        : Number.isFinite(Number(legoId))
        ? Number(legoId)
        : null;

    await onSubmit({
      name: name.trim(),
      lego_id: legoIdNum,
      hex: safeHex(hex),
      is_transparent: isTransparent,
      is_metallic: isMetallic,
    });
  }

  return (
    <form onSubmit={submit} style={S.form}>
      {/* Header row */}
      <div style={S.card}>
        <div style={S.gridTop}>
          <label style={S.field}>
            <div style={S.label}>Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bright Red"
              style={S.input}
            />
          </label>

          <div style={{ ...S.field, minWidth: 0 }}>
            <div style={S.label}>Swatch</div>
            <div style={S.swatchWrap} title={previewHex}>
              <div style={{ ...S.swatch, background: previewHex }} />
              <div style={S.swatchText}>{previewHex}</div>
            </div>
          </div>
        </div>

        {/* Second row */}
        <div style={S.gridBottom}>
          <label style={S.field}>
            <div style={S.label}>LEGO ID</div>
            <input
              value={legoId}
              onChange={(e) => setLegoId(e.target.value)}
              placeholder="(optional)"
              inputMode="numeric"
              style={S.input}
            />
          </label>

          <label style={S.field}>
            <div style={S.label}>Hex</div>
            <div style={S.hexRow}>
              <input
                value={hex}
                onChange={(e) => setHex(normalizeHexInput(e.target.value))}
                placeholder="#RRGGBB"
                style={{ ...S.input, ...S.hexInput }}
              />
              {/* optional "real" color picker for best UX */}
              <input
                type="color"
                value={safeHex(hex) || "#E5E7EB"}
                onChange={(e) => setHex(e.target.value.toUpperCase())}
                style={S.colorPicker}
                aria-label="Pick color"
                title="Pick color"
              />
            </div>
          </label>
        </div>

        {/* Checks */}
        <div style={S.checkRow}>
          <label style={S.checkPill}>
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={(e) => setIsTransparent(e.target.checked)}
            />
            Transparent
          </label>

          <label style={S.checkPill}>
            <input
              type="checkbox"
              checked={isMetallic}
              onChange={(e) => setIsMetallic(e.target.checked)}
            />
            Metallic
          </label>
        </div>
      </div>

      <button
        disabled={!canSave}
        style={{ ...S.primaryBtn, opacity: canSave ? 1 : 0.5 }}
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

/**
 * Key overlap fixes:
 * - grid children: minWidth: 0
 * - inputs: width: 100% + minWidth: 0
 * - responsive grid uses minmax(0, 1fr)
 */
const S: Record<string, React.CSSProperties> = {
  form: { display: "grid", gap: 12 },

  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 14,
    background: "white",
    display: "grid",
    gap: 12,
  },

  gridTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 180px",
    gap: 12,
    alignItems: "end",
  },

  gridBottom: {
    display: "grid",
    gridTemplateColumns: "220px minmax(0, 1fr)",
    gap: 12,
    alignItems: "end",
  },

  field: {
    display: "grid",
    gap: 6,
    minWidth: 0, // CRITICAL: prevents grid overflow/intersection
  },

  label: { fontSize: 12, fontWeight: 900, color: "#0f172a" },

  input: {
    width: "100%",
    minWidth: 0, // CRITICAL
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
  },

  // make hex + picker look aligned
  hexRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 44px",
    gap: 10,
    alignItems: "center",
    minWidth: 0,
  },

  hexInput: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    letterSpacing: 0.4,
  },

  colorPicker: {
    width: 44,
    height: 44,
    padding: 0,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "white",
    cursor: "pointer",
  },

  swatchWrap: {
    height: 44,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    display: "grid",
    gridTemplateColumns: "44px minmax(0, 1fr)",
    alignItems: "center",
    overflow: "hidden",
    minWidth: 0,
  },

  swatch: {
    height: "100%",
    width: "100%",
  },

  swatchText: {
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  checkRow: { display: "flex", gap: 10, flexWrap: "wrap" },

  checkPill: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontWeight: 900,
    color: "#0f172a",
  },

  primaryBtn: {
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    borderRadius: 16,
    padding: "12px 14px",
    fontWeight: 950,
    cursor: "pointer",
  },
};
