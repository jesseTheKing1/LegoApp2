import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Color, ColorForm } from "../form/ColorForm";

/** ---------------- helpers ---------------- */

function getListData<T = any>(resData: any): T[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray(resData.results)) return resData.results as T[];
  return [];
}

function formatApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message ?? "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return "Request failed";
}

function safeHex(hex?: string | null) {
  if (!hex) return "";
  const h = String(hex).trim();
  if (!h) return "";
  return h.startsWith("#") ? h : `#${h}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = safeHex(hex).replace("#", "").trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

// Returns a sortable key: [hue 0-360, saturation 0-100, lightness 0-100]
// Missing/invalid hex goes to the end.
function hexToHslKey(hex?: string | null): [number, number, number] {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return [999, 999, 999];

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const ss = Math.round(s * 100);
  const ll = Math.round(l * 100);

  return [h, ss, ll];
}

function sortByHexHsl(a: Color, b: Color) {
  const A = hexToHslKey(a.hex);
  const B = hexToHslKey(b.hex);

  // hue (color family)
  if (A[0] !== B[0]) return A[0] - B[0];
  // saturation (muted -> vivid)
  if (A[1] !== B[1]) return A[1] - B[1];
  // lightness (dark -> light)
  if (A[2] !== B[2]) return A[2] - B[2];

  // tie-breakers
  const an = (a.name || "").toLowerCase();
  const bn = (b.name || "").toLowerCase();
  if (an !== bn) return an.localeCompare(bn);

  const aid = a.id ?? 0;
  const bid = b.id ?? 0;
  return aid - bid;
}

/** --------------- UI shell --------------- */

function DrawerShell({
  open,
  title,
  onClose,
  children,
  width = 780,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;

  return (
    <div
      style={S.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ ...S.drawer, width: `min(${width}px, 100%)` }}>
        <div style={S.drawerHeader}>
          <div style={S.drawerTitle}>{title}</div>
          <button onClick={onClose} style={S.closeBtn}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** --------------- Page --------------- */

export default function ColorsAdminPage() {
  const [items, setItems] = useState<Color[]>([]);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Color | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const res = await api.get(ENDPOINTS.colors);
    setItems(getListData<Color>(res.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const base = !qq
      ? items
      : items.filter((c) =>
          `${c.name} ${c.lego_id ?? ""} ${c.hex ?? ""}`
            .toLowerCase()
            .includes(qq)
        );

    // IMPORTANT: slice() to avoid mutating state
    return base.slice().sort(sortByHexHsl);
  }, [items, q]);

  function openDetail(c: Color) {
    setSelected(c);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  async function create(payload: any) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.colors, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(payload: any) {
    if (!selected?.id) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await api.patch(`${ENDPOINTS.colors}${selected.id}/`, payload);
      setSelected(res.data);
      setItems((prev) => prev.map((x) => (x.id === selected.id ? res.data : x)));
      setEditing(false);
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (!selected?.id) return;
    if (!confirm("Delete this Color?")) return;
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.colors}${selected.id}/`);
      setDetailOpen(false);
      setSelected(null);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.page}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, lego id, hex..."
          style={S.search}
        />
        <button onClick={() => setCreateOpen(true)} style={S.darkBtn}>
          + New Color
        </button>
        <div style={S.countText}>{filtered.length} colors</div>
      </div>

      {err ? <div style={S.errBox}>{err}</div> : null}

      {/* List */}
      <div style={S.listCard}>
        {filtered.length === 0 ? (
          <div style={S.empty}>No results.</div>
        ) : (
          filtered.map((c, idx) => {
            const swatch = safeHex(c.hex) || "#e5e7eb";
            return (
              <button
                key={c.id ?? `${c.name}-${idx}`}
                onClick={() => openDetail(c)}
                style={{
                  ...S.rowBtn,
                  borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                }}
              >
                <div style={{ ...S.dot, background: swatch }} />
                <div style={S.rowName} title={c.name}>
                  {c.name}
                </div>
                <div style={S.rowMeta}>
                  {c.lego_id != null ? `LEGO ${c.lego_id}` : "LEGO —"}
                </div>
                <div style={S.rowHex}>{safeHex(c.hex) || "—"}</div>
              </button>
            );
          })
        )}
      </div>

      {/* Create */}
      <DrawerShell
        open={createOpen}
        title="New Color"
        onClose={() => setCreateOpen(false)}
        width={780}
      >
        <ColorForm submitting={saving} onSubmit={create} />
      </DrawerShell>

      {/* Detail */}
      <DrawerShell
        open={detailOpen}
        title={selected ? selected.name : "Color"}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setEditing(false);
          setErr(null);
        }}
        width={900}
      >
        {!selected ? (
          <div style={S.empty}>No selection.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {err ? <div style={S.errBox}>{err}</div> : null}

            <div style={S.detailGrid}>
              <div style={S.hero}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: safeHex(selected.hex) || "#e5e7eb",
                  }}
                  title={safeHex(selected.hex) || "—"}
                />
              </div>

              <div style={S.detailCard}>
                <div style={S.detailLabel}>Hex</div>
                <div style={S.detailValue}>{safeHex(selected.hex) || "—"}</div>

                <div style={{ marginTop: 10 }}>
                  <div style={S.detailLabel}>Flags</div>
                  <div style={S.flags}>
                    {selected.is_transparent ? "Transparent" : "Not transparent"}
                    {" • "}
                    {selected.is_metallic ? "Metallic" : "Not metallic"}
                  </div>
                </div>

                <div style={S.detailBtns}>
                  <button
                    onClick={() => setEditing((v) => !v)}
                    disabled={saving}
                    style={S.darkBtn}
                  >
                    {editing ? "Stop editing" : "Edit"}
                  </button>
                  <button
                    onClick={removeSelected}
                    disabled={saving}
                    style={S.dangerBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {editing ? (
              <div style={S.editWrap}>
                <div style={S.editTitle}>Edit this Color</div>
                <ColorForm
                  submitting={saving}
                  initialValues={selected}
                  onSubmit={saveEdit}
                />
              </div>
            ) : null}
          </div>
        )}
      </DrawerShell>
    </div>
  );
}

/** ---------------- styles ---------------- */

const S: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 10 },

  toolbar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  search: {
    width: "min(520px, 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "8px 10px",
  },

  countText: { fontSize: 12, color: "#6b7280" },

  listCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "white",
  },

  empty: { padding: 12, color: "#6b7280", fontSize: 12 },

  rowBtn: {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "white",
    cursor: "pointer",
    padding: "10px 10px",
    display: "grid",
    gridTemplateColumns: "18px minmax(0, 1fr) auto auto",
    gap: 10,
    alignItems: "center",
  },

  dot: {
    width: 18,
    height: 18,
    borderRadius: 6,
    border: "1px solid rgba(0,0,0,.12)",
  },

  rowName: {
    fontWeight: 950,
    fontSize: 13,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  rowMeta: { fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" },

  rowHex: { fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" },

  errBox: {
    color: "crimson",
    border: "1px solid rgba(220,38,38,.25)",
    background: "rgba(220,38,38,.06)",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
  },

  darkBtn: {
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
  },

  dangerBtn: {
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    border: "1px solid #fecaca",
    background: "#fee2e2",
    color: "#991b1b",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "grid",
    justifyItems: "end",
    zIndex: 50,
  },

  drawer: {
    height: "100%",
    background: "white",
    padding: 14,
    overflow: "auto",
  },

  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
    position: "sticky",
    top: 0,
    background: "white",
    paddingBottom: 10,
    zIndex: 1,
    borderBottom: "1px solid #f1f5f9",
  },

  drawerTitle: { fontWeight: 950, fontSize: 13 },

  closeBtn: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "260px minmax(0, 1fr)",
    gap: 12,
  },

  hero: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    overflow: "hidden",
  },

  detailCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "white",
  },

  detailLabel: { fontSize: 12, color: "#6b7280", fontWeight: 900 },

  detailValue: { fontSize: 14, fontWeight: 950, color: "#0f172a" },

  flags: { fontSize: 12, color: "#0f172a", fontWeight: 900 },

  detailBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },

  editWrap: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 12,
    background: "white",
  },

  editTitle: { fontSize: 12, fontWeight: 950, marginBottom: 10 },
};
