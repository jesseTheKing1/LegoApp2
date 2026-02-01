import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Part, PartForm } from "../form/PartForm";

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

/** merge style objects safely (like cx but for styles) */
function sx(...styles: Array<React.CSSProperties | false | null | undefined>) {
  return Object.assign({}, ...styles.filter(Boolean));
}

/** ---------------- UI bits ---------------- */

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
      <div style={sx(S.drawer, { width: `min(${width}px, 100%)` })}>
        <div style={S.drawerHeader}>
          <div style={S.drawerTitle}>{title}</div>
          <button onClick={onClose} style={S.ghostBtn} type="button">
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
    <div style={S.thumb} title={src || "No image"}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            // hide broken images
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>
      )}
    </div>
  );
}

/** ---------------- page ---------------- */

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((p) => {
      const hay = `${p.part_id ?? ""} ${p.name ?? ""} ${p.actual_category ?? ""} ${
        p.general_category ?? ""
      } ${p.specific_category ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
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

  const detailTitle = selected ? `${selected.part_id} — ${selected.name}` : "Part";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* top bar */}
      <div style={S.topbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part id, name, category..."
          style={S.search}
        />

        <button onClick={() => setCreateOpen(true)} style={S.darkBtn} type="button">
          + New Part
        </button>

        <div style={{ fontSize: 12, color: "#6b7280" }}>{filtered.length} parts</div>
      </div>

      {err ? <div style={S.errBox}>{err}</div> : null}

      {/* list */}
      <div style={S.listCard}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>No results.</div>
        ) : (
          filtered.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => openDetail(p)}
              style={sx(S.rowBtn, idx !== 0 && S.rowTopBorder)}
              title="Open"
              type="button"
            >
              <RowThumb src={p.image_url || null} />

              <div style={{ fontWeight: 950, fontSize: 12, width: 120 }}>{p.part_id}</div>

              <div style={{ minWidth: 0 }}>
                <div style={S.rowTitle}>{p.name}</div>
                <div style={S.rowSub}>
                  {p.actual_category || "—"}
                  {p.general_category ? ` • ${p.general_category}` : ""}
                  {p.specific_category ? ` • ${p.specific_category}` : ""}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* create */}
      <DrawerShell open={createOpen} title="New Part" onClose={() => setCreateOpen(false)} width={780}>
        <PartForm submitting={saving} onSubmit={create} />
      </DrawerShell>

      {/* detail */}
      <DrawerShell
        open={detailOpen}
        title={detailTitle}
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
            {err ? <div style={S.errBox}>{err}</div> : null}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 360px) 1fr", gap: 12 }}>
              <div style={S.hero}>
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>No image</div>
                )}
              </div>

              <div style={S.detailCard}>
                <div style={S.label}>Shape family</div>
                <div style={S.valueLg}>{selected.actual_category || "—"}</div>

                <div style={S.label}>Categories</div>
                <div style={S.value}>
                  {selected.general_category || "—"} / {selected.specific_category || "—"}
                </div>

                {!!selected.image_url && (
                  <a
                    href={selected.image_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "#2563eb", fontWeight: 900, marginTop: 10, display: "inline-block" }}
                  >
                    Open image
                  </a>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    onClick={() => setEditing((v) => !v)}
                    disabled={saving}
                    style={S.darkBtn}
                    type="button"
                  >
                    {editing ? "Stop editing" : "Edit"}
                  </button>

                  <button onClick={removeSelected} disabled={saving} style={S.dangerBtn} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {editing ? (
              <div style={S.editWrap}>
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

/** ---------------- styles ---------------- */

const S: Record<string, React.CSSProperties> = {
  topbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  search: {
    width: "min(520px, 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "8px 10px",
  },

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

  rowTitle: {
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  rowSub: {
    fontSize: 11,
    color: "#6b7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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

  ghostBtn: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  thumb: {
    width: 22,
    height: 22,
    borderRadius: 7,
    background: "#f3f4f6",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
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

  label: { fontSize: 12, color: "#6b7280", fontWeight: 900 },
  valueLg: { fontSize: 13, fontWeight: 950, marginBottom: 8 },
  value: { fontSize: 12, color: "#111827" },

  editWrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "white" },
};
