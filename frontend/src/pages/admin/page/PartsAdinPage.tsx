import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Part, PartForm } from "../form/PartForm";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

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

function RowThumb({ src }: { src?: string | null }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        background: "#f3f4f6",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
      title={src || "No image"}
    >
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>}
    </div>
  );
}

export default function PartsAdminPage() {
  const [items, setItems] = useState<Part[]>([]);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Part | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const res = await api.get(ENDPOINTS.parts);
    setItems(getListData<Part>(res.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((p) =>
      `${p.part_id} ${p.name} ${p.actual_category} ${p.general_category} ${p.specific_category}`.toLowerCase().includes(qq)
    );
  }, [items, q]);

  function openDetail(p: Part) {
    setSelected(p);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  async function create(payload: any) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.parts, payload);
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
      const res = await api.patch(`${ENDPOINTS.parts}${selected.id}/`, payload);
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
    if (!confirm("Delete this Part?")) return;
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.parts}${selected.id}/`);
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
          placeholder="Search part id, name, category..."
          style={{ width: "min(520px, 100%)", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px" }}
        />
        <button onClick={() => setCreateOpen(true)} style={B.darkBtn}>+ New Part</button>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{filtered.length} parts</div>
      </div>

      {err ? <div style={B.errBox}>{err}</div> : null}

      <div style={B.listCard}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>No results.</div>
        ) : (
          filtered.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => openDetail(p)}
              style={cx(B.rowBtn, idx === 0 ? "" : B.rowTopBorder)}
              title="Open"
            >
              <RowThumb src={p.image_url || null} />
              <div style={{ fontWeight: 950, fontSize: 12, width: 120 }}>{p.part_id}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.actual_category}{p.general_category ? ` • ${p.general_category}` : ""}{p.specific_category ? ` • ${p.specific_category}` : ""}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <DrawerShell open={createOpen} title="New Part" onClose={() => setCreateOpen(false)} width={780}>
        <PartForm submitting={saving} onSubmit={create} />
      </DrawerShell>

      <DrawerShell
        open={detailOpen}
        title={selected ? `${selected.part_id} — ${selected.name}` : "Part"}
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

            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 360px) 1fr", gap: 12 }}>
              <div style={B.hero}>
                {selected.image_url ? (
                  <img src={selected.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>No image</div>
                )}
              </div>

              <div style={B.detailCard}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>Shape family</div>
                <div style={{ fontSize: 13, fontWeight: 950, marginBottom: 8 }}>{selected.actual_category}</div>

                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>Categories</div>
                <div style={{ fontSize: 12, color: "#111827" }}>
                  {selected.general_category || "—"} / {selected.specific_category || "—"}
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
                <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Edit this Part</div>
                <PartForm submitting={saving} initialValues={selected} onSubmit={saveEdit} />
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
    padding: "8px 10px",
    display: "grid",
    gridTemplateColumns: "22px 120px 1fr",
    gap: 10,
    alignItems: "center",
  },
  rowTopBorder: { borderTop: "1px solid #f1f5f9" },
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
    display: "grid",
    placeItems: "center",
  },
  detailCard: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "white" },
  editWrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "white" },
};
