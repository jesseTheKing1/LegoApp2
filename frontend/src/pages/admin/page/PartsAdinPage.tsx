import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { Part, PartForm } from "../form/PartForm";
import "../admin-ui.css";

/** ---------------- helpers ---------------- */

function getListData<T = any>(resData: any): T[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
  return [];
}

function formatApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message ?? "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return "Request failed";
}

/** ---------------- Drawer shell ---------------- */

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
      className="adminOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="adminDrawer" style={{ width: `min(${width}px, 100%)` }}>
        <div className="adminDrawerHeader">
          <div className="adminDrawerTitle">{title}</div>
          <button type="button" className="adminCloseBtn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** ---------------- thumbs ---------------- */

function RowThumb({ src }: { src?: string | null }) {
  return (
    <div className="adminThumb" title={src || "No image"}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 900 }}>—</span>
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
    <div className="adminPage">
      {/* top bar */}
      <div className="adminToolbar">
        <input
          className="adminInput adminSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part id, name, category..."
          autoComplete="off"
        />

        <button type="button" className="adminBtn adminBtnPrimary" onClick={() => setCreateOpen(true)}>
          + New Part
        </button>

        <div className="adminCountText">{filtered.length} parts</div>
      </div>

      {err ? <div className="adminErr">{err}</div> : null}

      {/* list */}
      <div className="adminListCard">
        {filtered.length === 0 ? (
          <div className="adminEmpty">No results.</div>
        ) : (
          filtered.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              className={`adminPartsRowBtn ${idx === 0 ? "" : "adminRowTopBorder"}`}
              onClick={() => openDetail(p)}
              title="Open"
            >
              <RowThumb src={p.image_url || null} />

              <div className="adminPartsId">{p.part_id}</div>

              <div style={{ minWidth: 0 }}>
                <div className="adminRowTitle" title={p.name}>
                  {p.name}
                </div>

                <div className="adminRowSub" title={`${p.actual_category || ""} ${p.general_category || ""} ${p.specific_category || ""}`}>
                  {p.actual_category || "—"}
                  {p.general_category ? ` • ${p.general_category}` : ""}
                  {p.specific_category ? ` • ${p.specific_category}` : ""}
                </div>

                {/* mobile-only extra line for part_id */}
                <div className="adminPartsSubline">
                  <span>{p.part_id}</span>
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
          <div className="adminEmpty">No selection.</div>
        ) : (
          <div className="adminStack">
            {err ? <div className="adminErr">{err}</div> : null}

            <div className="adminDetailGrid">
              <div className="adminHero">
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
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 900 }}>No image</div>
                )}
              </div>

              <div className="adminFormCard">
                <div className="adminLabel">Shape family</div>
                <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text)" }}>
                  {selected.actual_category || "—"}
                </div>

                <div className="adminLabel" style={{ marginTop: 6 }}>
                  Categories
                </div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text)" }}>
                  {selected.general_category || "—"} / {selected.specific_category || "—"}
                </div>

                {!!selected.image_url && (
                  <a
                    href={selected.image_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "#2563eb", fontWeight: 950, textDecoration: "none" }}
                  >
                    Open image
                  </a>
                )}

                <div className="adminFormActions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="adminBtn adminBtnPrimary"
                    onClick={() => setEditing((v) => !v)}
                    disabled={saving}
                    style={{ opacity: saving ? 0.6 : 1 }}
                  >
                    {editing ? "Stop editing" : "Edit"}
                  </button>

                  <button
                    type="button"
                    className="adminBtn"
                    onClick={removeSelected}
                    disabled={saving}
                    style={{
                      opacity: saving ? 0.6 : 1,
                      borderColor: "#fecaca",
                      background: "#fee2e2",
                      color: "#991b1b",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {editing ? (
              <div className="adminFormCard">
                <div className="adminLabel" style={{ marginBottom: 10 }}>
                  Edit this Part
                </div>
                <PartForm submitting={saving} initialValues={selected} onSubmit={saveEdit} />
              </div>
            ) : null}
          </div>
        )}
      </DrawerShell>
    </div>
  );
}
