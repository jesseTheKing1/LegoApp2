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
  const [isTransparent, setIsTransparent] = useState(!!initialValues?.is_transparent);
  const [isMetallic, setIsMetallic] = useState(!!initialValues?.is_metallic);

  const previewHex = safeHex(hex) || "#e5e7eb";

  const canSave = useMemo(() => {
    return !!name.trim() && !submitting;
  }, [name, submitting]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const legoIdNum =
      legoId.trim() === "" ? null : Number.isFinite(Number(legoId)) ? Number(legoId) : null;

    await onSubmit({
      name: name.trim(),
      lego_id: legoIdNum,
      hex: safeHex(hex),
      is_transparent: isTransparent,
      is_metallic: isMetallic,
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={L.label}>Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={L.input} />
        </label>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={L.label}>Swatch</div>
          <div
            style={{
              height: 40,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: previewHex,
            }}
            title={previewHex}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={L.label}>LEGO ID</div>
          <input
            value={legoId}
            onChange={(e) => setLegoId(e.target.value)}
            placeholder="(optional)"
            style={L.input}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={L.label}>Hex</div>
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#RRGGBB"
            style={L.input}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={L.checkRow}>
          <input type="checkbox" checked={isTransparent} onChange={(e) => setIsTransparent(e.target.checked)} />
          Transparent
        </label>
        <label style={L.checkRow}>
          <input type="checkbox" checked={isMetallic} onChange={(e) => setIsMetallic(e.target.checked)} />
          Metallic
        </label>
      </div>

      <button disabled={!canSave} style={{ ...L.primaryBtn, opacity: canSave ? 1 : 0.5 }}>
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

const L: Record<string, React.CSSProperties> = {
  label: { fontSize: 12, fontWeight: 900, color: "#0f172a" },
  input: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
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
  checkRow: { display: "flex", gap: 8, alignItems: "center", fontWeight: 800, color: "#0f172a" },
};
