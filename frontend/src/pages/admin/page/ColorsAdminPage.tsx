import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Color, ColorForm } from "../form/ColorForm";

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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        justifyItems: "end",
        zIndex: 50,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ width: `min(${width}px, 100%)`, height: "100%", background: "white", padding: 14, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, position: "sticky", top: 0, background: "white", paddingBottom: 10, zIndex: 1, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>{title}</div>
          <button onClick={onClose} style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontWeight: 800 }}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

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
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((c) =>
      `${c.name} ${c.lego_id ?? ""} ${c.hex ?? ""}`.toLowerCase().includes(qq)
    );
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
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, lego id, hex..."
          style={{ width: "min(520px, 100%)", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px" }}
        />
        <button onClick={() => setCreateOpen(true)} style={B.darkBtn}>
          + New Color
        </button>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{filtered.length} colors</div>
      </div>

      {err ? <div style={B.errBox}>{err}</div> : null}

      <div style={B.listCard}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>No results.</div>
        ) : (
          filtered.map((c, idx) => {
            const swatch = safeHex(c.hex) || "#e5e7eb";
            return (
              <button
                key={c.id}
                onClick={() => openDetail(c)}
                style={{ ...B.rowBtn, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 6, background: swatch, border: "1px solid rgba(0,0,0,.12)" }} />
                <div style={{ fontWeight: 950, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                  {c.lego_id != null ? `LEGO ${c.lego_id}` : "LEGO —"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>{safeHex(c.hex) || "—"}</div>
              </button>
            );
          })
        )}
      </div>

      <DrawerShell open={createOpen} title="New Color" onClose={() => setCreateOpen(false)} width={780}>
        <ColorForm submitting={saving} onSubmit={create} />
      </DrawerShell>

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
          <div style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>No selection.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {err ? <div style={B.errBox}>{err}</div> : null}

            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12 }}>
              <div style={B.hero}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: safeHex(selected.hex) || "#e5e7eb",
                  }}
                  title={safeHex(selected.hex) || "—"}
                />
              </div>

              <div style={B.detailCard}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>Hex</div>
                <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>
                  {safeHex(selected.hex) || "—"}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280", fontWeight: 900 }}>Flags</div>
                <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 900 }}>
                  {selected.is_transparent ? "Transparent" : "Not transparent"}
                  {" • "}
                  {selected.is_metallic ? "Metallic" : "Not metallic"}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <button onClick={() => setEditing((v) => !v)} disabled={saving} style={B.darkBtn}>
                    {editing ? "Stop editing" : "Edit"}
                  </button>
                  <button onClick={removeSelected} disabled={saving} style={B.dangerBtn}>
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {editing ? (
              <div style={B.editWrap}>
                <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Edit this Color</div>
                <ColorForm submitting={saving} initialValues={selected} onSubmit={saveEdit} />
              </div>
            ) : null}
          </div>
        )}
      </DrawerShell>
    </div>
  );
}

const B: Record<string, React.CSSProperties> = {
  listCard: { border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white" },
  rowBtn: {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "white",
    cursor: "pointer",
    padding: "10px 10px",
    display: "grid",
    gridTemplateColumns: "18px 1fr auto auto",
    gap: 10,
    alignItems: "center",
  },
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
  hero: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    overflow: "hidden",
  },
  detailCard: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "white" },
  editWrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "white" },
};
